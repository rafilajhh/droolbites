"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { MAX_QTY, readCartEntries, writeCartEntries, type CartEntry } from "@/lib/cart";
import { db } from "@/lib/db";
import { paymentMethodInfo } from "@/lib/order-status";
import {
  chargeOrder,
  checkoutDetailsSchema,
  clearCheckoutDetails,
  DELIVERY_CITY,
  DETAILS_COOKIE,
  type ChargeResult,
  type CheckoutDetails,
  getOrderByNumber,
  getOrderForViewer,
  joinStreet,
  markOrderPaid,
  markPaymentExpired,
  nextOrderNumber,
  paymentSnapshot,
  readCheckoutDetails,
  rememberOrder,
  withOrderLock,
  withOrderToken,
  writeCheckoutDetails,
  type CheckoutField,
} from "@/lib/orders";
import { sendOrderPlacedEmail } from "@/lib/order-emails";
import { canSimulatePayment, getPaymentOptions, getPaymentProvider, PaymentGatewayError } from "@/lib/payments";
import { getStoreSettings, type StoreSettings } from "@/lib/settings";
import { getLocale } from "@/i18n/server";

/** Keys of checkoutMessages.errors. */
type ErrorKey =
  | "email"
  | "fullName"
  | "phone"
  | "street"
  | "city"
  | "postal"
  | "postalArea"
  | "method"
  | "methodUnavailable"
  | "payment"
  | "paymentUnavailable"
  | "gatewayUnavailable"
  | "gatewayBusy"
  | "cartChanged"
  | "generic";

export type DetailsState = {
  errors: Partial<Record<CheckoutField, ErrorKey>>;
  /** Changes on every failed submit so the form can move focus again. */
  attempt: number;
};

export type PlaceOrderState = { error?: ErrorKey; attempt: number };

export type PayCheckState = { result?: "awaiting"; attempt: number };

function str(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function fulfilmentEnabled(settings: StoreSettings, method: "delivery" | "pickup") {
  return method === "delivery" ? settings.deliveryEnabled : settings.pickupEnabled;
}

/** Switched on in store settings and accepted by the gateway right now. */
async function paymentEnabled(settings: StoreSettings, method: PaymentMethod) {
  return (await getPaymentOptions(settings)).methods.includes(method);
}

function isPaymentMethod(value: unknown): value is PaymentMethod {
  return typeof value === "string" && Object.hasOwn(paymentMethodInfo, value);
}

/** Step 1 → 2: validate the details form and keep it in a signed cookie. */
export async function saveCheckoutDetails(prev: DetailsState, formData: FormData): Promise<DetailsState> {
  const entries = await readCartEntries();
  if (entries.length === 0) redirect("/menu");
  const settings = await getStoreSettings();

  const parsed = checkoutDetailsSchema.safeParse({
    email: str(formData, "email"),
    fulfilment: str(formData, "fulfilment"),
    fullName: str(formData, "fullName"),
    phone: str(formData, "phone"),
    street: str(formData, "street"),
    apartment: str(formData, "apartment"),
    // Delivery is Surabaya-only: the city field is read-only and never taken from the client.
    city: DELIVERY_CITY,
    postal: str(formData, "postal"),
  });

  const errors: DetailsState["errors"] = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as CheckoutField | undefined;
      if (!field || errors[field]) continue;
      errors[field] =
        field === "fulfilment"
          ? "method"
          : field === "apartment"
            ? "street"
            : field === "postal" && issue.message === "postalArea"
              ? "postalArea"
              : field;
    }
  } else if (!fulfilmentEnabled(settings, parsed.data.fulfilment)) {
    errors.fulfilment = "methodUnavailable";
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { errors, attempt: prev.attempt + 1 };

  const details = parsed.data;
  if (details.fulfilment === "pickup") Object.assign(details, { street: "", apartment: "", city: "", postal: "" });
  await writeCheckoutDetails(details);
  redirect("/checkout/payment");
}

class CartChangedError extends Error {}

/**
 * Step 2 → 3: create the order and its items in one transaction (prices and
 * totals come from the database, never the client), then ask the gateway for
 * the payment. If the gateway refuses, the order stays unpaid without a live
 * payment and the pay page asks for another method, so no order is duplicated.
 */
export async function placeOrder(prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const attempt = prev.attempt + 1;
  const [entries, details, settings, user] = await Promise.all([
    readCartEntries(),
    readCheckoutDetails(),
    getStoreSettings(),
    getCurrentUser(),
  ]);
  if (entries.length === 0) redirect("/menu");
  if (!details) redirect("/checkout");
  if (!fulfilmentEnabled(settings, details.fulfilment)) return { error: "methodUnavailable", attempt };

  const method = formData.get("method");
  if (!isPaymentMethod(method)) return { error: "payment", attempt };
  if (!(await paymentEnabled(settings, method))) return { error: "paymentUnavailable", attempt };

  // One order per checkout session: a second submit of the same session (double click, retry while the
  // first is still running) waits for the first and lands on the same order instead of creating another.
  const session = createHash("sha256").update((await cookies()).get(DETAILS_COOKIE)?.value ?? "").digest("hex");
  sweepSubmissions();
  let submission = submissions.get(session);
  if (!submission) {
    const result = createOrder(entries, details, settings, user?.id ?? null, method).catch((error): Placed => {
      console.error("[checkout] could not place order", error);
      return { ok: false, error: "generic" };
    });
    submission = { at: Date.now(), result };
    submissions.set(session, submission);
  }
  const placed = await submission.result;
  if (!placed.ok) {
    // Failures aren't kept: the customer fixes the cart or method and submits again.
    if (submissions.get(session) === submission) submissions.delete(session);
    return { error: placed.error, attempt };
  }

  await writeCartEntries([]);
  await clearCheckoutDetails();
  await rememberOrder(placed.orderNumber);
  revalidatePath("/", "layout");
  redirect(placed.charged.ok ? `/checkout/pay/${placed.orderNumber}` : `/checkout/pay/${placed.orderNumber}?change=1&error=${placed.charged.error}`);
}

type Placed = { ok: true; orderNumber: string; charged: ChargeResult } | { ok: false; error: ErrorKey };

/**
 * Placed orders per checkout session (hash of the signed db_checkout cookie), kept for
 * SUBMISSION_TTL_MS. In-memory like the sign-in limiter: fine for the single-instance deployment.
 */
const SUBMISSION_TTL_MS = 10 * 60 * 1000;
const submissions = new Map<string, { at: number; result: Promise<Placed> }>();

function sweepSubmissions(now = Date.now()) {
  for (const [key, s] of submissions) if (now - s.at > SUBMISSION_TTL_MS) submissions.delete(key);
}

/** The order, its items and the first charge. No cookies here: shared by duplicate submits. */
async function createOrder(
  entries: CartEntry[],
  details: CheckoutDetails,
  settings: StoreSettings,
  userId: bigint | null,
  method: PaymentMethod,
): Promise<Placed> {
  const delivery = details.fulfilment === "delivery";
  // Its emails go out in the language the shopper is browsing in.
  const locale = await getLocale();
  let orderNumber: string | null = null;

  for (let tries = 0; tries < 3 && !orderNumber; tries++) {
    try {
      orderNumber = await db.$transaction(async (tx) => {
        const variants = await tx.productVariant.findMany({
          where: { id: { in: entries.map((e) => BigInt(e.v)) }, product: { isAvailable: true } },
          select: { id: true, price: true },
        });
        const prices = new Map(variants.map((v) => [v.id.toString(), v.price]));
        if (entries.some((e) => !prices.has(e.v))) throw new CartChangedError();

        const items = entries.map((e) => ({
          variantId: BigInt(e.v),
          qty: Math.min(e.q, MAX_QTY),
          unitPrice: prices.get(e.v)!,
        }));
        const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
        const deliveryFee = delivery ? settings.deliveryFee : 0;

        const number = await nextOrderNumber(tx);
        await tx.order.create({
          data: {
            orderNumber: number,
            userId,
            customerName: details.fullName,
            email: details.email,
            phone: details.phone,
            fulfilmentMethod: details.fulfilment,
            shippingAddress: delivery ? joinStreet(details.street, details.apartment) : null,
            shippingCity: delivery ? details.city : null,
            shippingPostal: delivery ? details.postal : null,
            subtotal,
            deliveryFee,
            total: subtotal + deliveryFee,
            locale,
            items: { create: items },
          },
        });
        return number;
      });
    } catch (error) {
      if (error instanceof CartChangedError) return { ok: false, error: "cartChanged" };
      // Two orders raced for the same number: try the next one.
      if ((error as { code?: string }).code === "P2002" && tries < 2) continue;
      console.error("[checkout] could not place order", error);
      return { ok: false, error: "generic" };
    }
  }
  if (!orderNumber) return { ok: false, error: "generic" };

  const order = (await getOrderByNumber(orderNumber))!;
  const charged = await chargeOrder(order, method);

  const placed = orderNumber;
  after(async () => {
    const full = await getOrderByNumber(placed);
    if (full) await sendOrderPlacedEmail(full);
  });
  return { ok: true, orderNumber, charged };
}

/** "I've paid — check status": ask the gateway again. */
export async function checkPaymentStatus(prev: PayCheckState, formData: FormData): Promise<PayCheckState> {
  const orderNumber = str(formData, "orderNumber");
  const token = str(formData, "t");
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) redirect("/menu");
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  if (order.fulfilmentStatus === "cancelled") redirect(payHref);
  if (order.paymentStatus === "paid") redirect(withOrderToken(`/checkout/success/${orderNumber}`, token));
  if (order.paymentStatus === "expired" || order.payments[0]?.status !== "awaiting") redirect(payHref);
  return { result: "awaiting", attempt: prev.attempt + 1 };
}

/** Demo (mock) and gateway sandbox only: pay the latest payment. */
export async function simulatePayment(formData: FormData) {
  const orderNumber = str(formData, "orderNumber");
  const token = str(formData, "t");
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) redirect("/menu");
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  // A cancelled order is closed: nothing to pay.
  if (order.fulfilmentStatus === "cancelled") redirect(payHref);
  const payment = order.payments[0];
  if (order.paymentStatus === "awaiting" && payment?.status === "awaiting") {
    if (!canSimulatePayment(payment.provider)) redirect(payHref);
    const provider = getPaymentProvider(payment.provider);
    try {
      if ((await provider.simulatePaid(paymentSnapshot(order, payment))) === "paid") await markOrderPaid(order.id, payment.id);
    } catch (error) {
      console.warn("[checkout] simulate failed", error instanceof PaymentGatewayError ? error.code : error);
    }
  }
  revalidatePath(`/orders/${orderNumber}`);
  redirect(withOrderToken(`/checkout/success/${orderNumber}`, token));
}

export type ChangeMethodState = { error?: ErrorKey; attempt: number };

/**
 * Switch an unpaid order to another method: the open gateway payment is
 * cancelled and a new one is created under a new reference. If the gateway
 * can't confirm the cancel, the current payment stays live and nothing new is
 * charged. Switches for one order run one at a time (double submit, two
 * tabs). The order's deadline stays the same.
 */
export async function changePaymentMethod(prev: ChangeMethodState, formData: FormData): Promise<ChangeMethodState> {
  const attempt = prev.attempt + 1;
  const orderNumber = str(formData, "orderNumber");
  const token = str(formData, "t");
  const method = formData.get("method");
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  const successHref = withOrderToken(`/checkout/success/${orderNumber}`, token);
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) redirect("/menu");
  if (order.fulfilmentStatus === "cancelled") redirect(payHref);
  if (order.paymentStatus === "paid") redirect(successHref);
  if (order.paymentStatus !== "awaiting") redirect(payHref);
  if (!isPaymentMethod(method)) return { error: "payment", attempt };
  if (!(await paymentEnabled(await getStoreSettings(), method))) return { error: "paymentUnavailable", attempt };

  const outcome = await withOrderLock(order.id, async () => {
    // Read again under the lock: a concurrent switch may have finished meanwhile.
    const fresh = await getOrderByNumber(orderNumber);
    if (!fresh || fresh.paymentStatus !== "awaiting" || fresh.fulfilmentStatus === "cancelled") return { kind: "closed" as const };
    const current = fresh.payments[0];
    if (current?.status === "awaiting") {
      if (current.method === method) return { kind: "unchanged" as const };
      const provider = getPaymentProvider(current.provider);
      const snapshot = paymentSnapshot(fresh, current);
      try {
        await provider.cancel(snapshot);
      } catch (error) {
        const code = error instanceof PaymentGatewayError ? error.code : null;
        if (code === "NOT_CANCELLABLE") {
          // Usually paid meanwhile; otherwise it is already closed at the gateway.
          if ((await provider.getStatus(snapshot)) === "paid") {
            await markOrderPaid(fresh.id, current.id);
            return { kind: "paid" as const };
          }
        } else if (code !== "NOT_FOUND") {
          // Unknown outcome: keep the current payment live rather than risk two open charges.
          console.warn(`[checkout] cancel ${current.reference} failed, method not changed`, code ?? error);
          return { kind: "busy" as const };
        }
      }
      await markPaymentExpired(current.id);
    }
    return { kind: "charged" as const, charged: await chargeOrder(fresh, method) };
  });

  if (!outcome || outcome.kind === "busy") return { error: "gatewayBusy", attempt };
  if (outcome.kind === "paid") redirect(successHref);
  if (outcome.kind !== "charged") redirect(payHref);
  revalidatePath(`/orders/${orderNumber}`);
  const { charged } = outcome;
  if (!charged.ok) return { error: charged.error === "unavailable" ? "gatewayUnavailable" : "gatewayBusy", attempt };
  redirect(payHref);
}

export type ReorderState = { failed?: boolean; attempt: number };

/** "Order again": put the order's items (still on sale) back in the cart. */
export async function reorder(prev: ReorderState, formData: FormData): Promise<ReorderState> {
  const order = await getOrderForViewer(str(formData, "orderNumber"), str(formData, "t"));
  if (!order) redirect("/menu");
  const available = await db.productVariant.findMany({
    where: { id: { in: order.items.map((i) => i.variantId) }, product: { isAvailable: true } },
    select: { id: true },
  });
  const ok = new Set(available.map((v) => v.id.toString()));
  const entries = await readCartEntries();
  let added = 0;
  for (const item of order.items) {
    const v = item.variantId.toString();
    if (!ok.has(v)) continue;
    const existing = entries.find((e) => e.v === v);
    if (existing) existing.q = Math.min(MAX_QTY, existing.q + item.qty);
    else entries.push({ v, q: Math.min(MAX_QTY, item.qty) });
    added++;
  }
  if (added === 0) return { failed: true, attempt: prev.attempt + 1 };
  await writeCartEntries(entries);
  revalidatePath("/", "layout");
  redirect("/checkout");
}
