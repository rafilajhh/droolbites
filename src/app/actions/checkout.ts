"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { getCurrentUser } from "@/lib/auth";
import { deliveryFeeFor, isLatLng, measureDelivery, storeKey, withinRange } from "@/lib/delivery";
import { placeAt, searchPlaces, type Place } from "@/lib/geocode";
import { allowRequest, clientIp, perClientMax } from "@/lib/rate-limit";
import { MAX_QTY, readCartEntries, writeCartEntries, type CartEntry } from "@/lib/cart";
import { db } from "@/lib/db";
import { markOrderPaidDemo, type DemoPaidResult } from "@/lib/demo-payment";
import { deliverLater } from "@/lib/mail";
import { CUSTOMER_CANCEL_REASON, paymentMethodInfo } from "@/lib/order-status";
import {
  chargeOrder,
  checkoutDeliveryFee,
  checkoutDetailsSchema,
  clearCheckoutDetails,
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
import { sendOrderCancelledEmail, sendOrderPlacedEmail } from "@/lib/order-emails";
import { findShortLines, type ShortLine } from "@/lib/stock";
import { canSimulatePayment, demoPaymentsEnabled, getPaymentOptions, getPaymentProvider, PaymentGatewayError } from "@/lib/payments";
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
  | "recipientName"
  | "recipientPhone"
  | "note"
  | "location"
  | "tooFar"
  | "lookupBusy"
  | "feeChanged"
  | "method"
  | "methodUnavailable"
  | "payment"
  | "paymentUnavailable"
  | "gatewayUnavailable"
  | "gatewayBusy"
  | "gatewayMinimum"
  | "cartChanged"
  | "stock"
  | "stockGone"
  | "generic";

export type DetailsState = {
  errors: Partial<Record<CheckoutField, ErrorKey>>;
  /** Changes on every failed submit so the form can move focus again. */
  attempt: number;
};

/** A cart line asking for more than is left: "Fudgy Brownies · 15 × 15 cm", 2 left (0 = sold out). */
export type ShortItem = { name: string; left: number };

export type PlaceOrderState = { error?: ErrorKey; short?: ShortItem[]; attempt: number };

export type PayCheckState = { result?: "awaiting"; attempt: number };

function str(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** A coordinate from the form, or null when empty or not a number. */
function coord(formData: FormData, name: string) {
  const value = str(formData, name).trim();
  const n = value === "" ? Number.NaN : Number(value);
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ */
/* Delivery pin: distance, fee and address lookups for the details map */
/* ------------------------------------------------------------------ */

export type DeliveryQuote =
  | { status: "ok"; distanceM: number; fee: number; estimated: boolean }
  | { status: "tooFar"; distanceM: number; maxKm: number }
  | { status: "invalid" | "busy" };

/**
 * Requests per client per 15 minutes for each kind of map lookup (pin moves, searches, reverse
 * lookups, saves). Generous for a shopper behind a shared mobile IP, small enough to stop a script.
 */
const LOOKUPS_PER_WINDOW = 120;

async function lookupAllowed(kind: string) {
  const ip = await clientIp();
  return allowRequest(`${kind}:${ip}`, perClientMax(ip, LOOKUPS_PER_WINDOW));
}

/** Distance and fee for a pin, so the form can show them before the details are saved. */
export async function quoteDelivery(lat: number, lng: number): Promise<DeliveryQuote> {
  if (!isLatLng(lat, lng)) return { status: "invalid" };
  if (!(await lookupAllowed("quote"))) return { status: "busy" };
  const settings = await getStoreSettings();
  const { distanceM, kind } = await measureDelivery(settings, { lat, lng });
  if (!withinRange(settings, distanceM)) return { status: "tooFar", distanceM, maxKm: settings.deliveryMaxKm };
  return { status: "ok", distanceM, fee: deliveryFeeFor(settings, distanceM), estimated: kind === "estimated" };
}

/** Address search for the map (submitted, never as-you-type). */
export async function findPlaces(query: string): Promise<{ places: Place[] } | { error: "busy" }> {
  if (typeof query !== "string" || query.trim().length < 3) return { places: [] };
  if (!(await lookupAllowed("places"))) return { error: "busy" };
  const [settings, locale] = await Promise.all([getStoreSettings(), getLocale()]);
  try {
    return { places: await searchPlaces(query, { lat: settings.storeLat, lng: settings.storeLng }, locale) };
  } catch (error) {
    console.warn("[checkout] address search failed", (error as Error).message);
    return { error: "busy" };
  }
}

/** The street, city and postal code at a pin, to fill the address fields. */
export async function addressAt(lat: number, lng: number): Promise<Place | null> {
  if (!isLatLng(lat, lng) || !(await lookupAllowed("reverse"))) return null;
  try {
    return await placeAt({ lat, lng }, await getLocale());
  } catch (error) {
    console.warn("[checkout] reverse lookup failed", (error as Error).message);
    return null;
  }
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
    district: str(formData, "district"),
    city: str(formData, "city"),
    postal: str(formData, "postal"),
    recipientName: str(formData, "recipientName"),
    recipientPhone: str(formData, "recipientPhone"),
    note: str(formData, "note"),
    lat: coord(formData, "lat"),
    lng: coord(formData, "lng"),
    // Measured below, never taken from the client.
    distanceM: null,
    distanceKind: null,
    storeAt: null,
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
            : field === "lat" || field === "lng" || field === "distanceM" || field === "district"
              ? "location"
              : (field as ErrorKey);
    }
  } else if (!fulfilmentEnabled(settings, parsed.data.fulfilment)) {
    errors.fulfilment = "methodUnavailable";
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { errors, attempt: prev.attempt + 1 };

  const details = parsed.data;
  if (details.fulfilment === "pickup") {
    Object.assign(details, {
      street: "",
      apartment: "",
      district: "",
      city: "",
      postal: "",
      recipientName: "",
      recipientPhone: "",
      note: "",
      lat: null,
      lng: null,
      distanceM: null,
      distanceKind: null,
      storeAt: null,
    });
  } else {
    // Each save may ask the router, so saves share the lookups' per-client limit.
    if (!(await lookupAllowed("save"))) return { errors: { lat: "lookupBusy" }, attempt: prev.attempt + 1 };
    // The fee is worked out from this distance at every later step, at the store's current rates.
    const { distanceM, kind } = await measureDelivery(settings, { lat: details.lat!, lng: details.lng! });
    if (!withinRange(settings, distanceM)) return { errors: { lat: "tooFar" }, attempt: prev.attempt + 1 };
    Object.assign(details, { distanceM, distanceKind: kind, storeAt: storeKey(settings) });
  }
  await writeCheckoutDetails(details);
  redirect("/checkout/payment");
}

class CartChangedError extends Error {}

class StockShortError extends Error {
  constructor(readonly lines: ShortLine[]) {
    super("stock");
  }
}

/**
 * Step 2 → 3: create the order and its items in one transaction (prices and
 * totals come from the database, never the client), then ask the gateway for
 * the payment. If the gateway refuses, the order stays unpaid without a live
 * payment and the pay page asks for another method, so no order is duplicated.
 *
 * "Skip payment (demo)" (the submit button's demo=1, honoured only while
 * DEMO_PAYMENTS is on) places the same order without asking the gateway and
 * marks it paid in demo mode, then goes straight to the success page.
 */
export async function placeOrder(prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const attempt = prev.attempt + 1;
  const demo = str(formData, "demo") === "1";
  // Never trust the button: without the server's flag a demo submit places nothing.
  if (demo && !demoPaymentsEnabled()) return { error: "generic", attempt };
  const [entries, details, settings, user] = await Promise.all([
    readCartEntries(),
    readCheckoutDetails(),
    getStoreSettings(),
    getCurrentUser(),
  ]);
  if (entries.length === 0) redirect("/menu");
  if (!details) redirect("/checkout");
  if (!fulfilmentEnabled(settings, details.fulfilment)) return { error: "methodUnavailable", attempt };
  // No distance on file, or now beyond the store's range: back to the details step to re-pin.
  const fee = checkoutDeliveryFee(settings, details);
  if (fee === null) redirect("/checkout");
  // The rates changed after the payment page was shown: show the new total before charging it.
  const shownFee = str(formData, "fee");
  if (shownFee !== "" && Number(shownFee) !== fee) {
    revalidatePath("/checkout/payment");
    return { error: "feeChanged", attempt };
  }

  const method = formData.get("method");
  if (!isPaymentMethod(method)) return { error: "payment", attempt };
  if (!(await paymentEnabled(settings, method))) return { error: "paymentUnavailable", attempt };

  // One order per checkout session: a second submit of the same session (double click, retry while the
  // first is still running) waits for the first and lands on the same order instead of creating another.
  const session = createHash("sha256").update((await cookies()).get(DETAILS_COOKIE)?.value ?? "").digest("hex");
  sweepSubmissions();
  let submission = submissions.get(session);
  if (!submission) {
    const result = createOrder(entries, details, settings, user?.id ?? null, method, demo).catch((error): Placed => {
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
    return { error: placed.error, short: placed.short, attempt };
  }

  await writeCartEntries([]);
  await clearCheckoutDetails();
  await rememberOrder(placed.orderNumber);
  revalidatePath("/", "layout");
  // Skipped in demo mode: paid, or (should the demo not go through) the pay page shows how to pay.
  if (placed.demo) redirect(isPaid(placed.demo) ? `/checkout/success/${placed.orderNumber}` : `/checkout/pay/${placed.orderNumber}`);
  redirect(placed.charged.ok ? `/checkout/pay/${placed.orderNumber}` : `/checkout/pay/${placed.orderNumber}?change=1&error=${placed.charged.error}`);
}

type Placed =
  | { ok: true; orderNumber: string; charged: ChargeResult; demo?: DemoPaidResult }
  | { ok: false; error: ErrorKey; short?: ShortItem[] };

/** Demo mode paid the order, or found it really paid at the gateway. */
const isPaid = (result: DemoPaidResult) => result === "paid" || result === "real";

/**
 * Placed orders per checkout session (hash of the signed db_checkout cookie), kept for
 * SUBMISSION_TTL_MS. In-memory like the sign-in limiter: fine for the single-instance deployment.
 */
const SUBMISSION_TTL_MS = 10 * 60 * 1000;
const submissions = new Map<string, { at: number; result: Promise<Placed> }>();

function sweepSubmissions(now = Date.now()) {
  for (const [key, s] of submissions) if (now - s.at > SUBMISSION_TTL_MS) submissions.delete(key);
}

/**
 * The order, its items and the first charge (or, with `demo`, no charge: it is marked paid in demo
 * mode instead). No cookies here: shared by duplicate submits.
 */
async function createOrder(
  entries: CartEntry[],
  details: CheckoutDetails,
  settings: StoreSettings,
  userId: bigint | null,
  method: PaymentMethod,
  demo: boolean,
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
        // A guard, not a hold: stock only goes down when the order is paid.
        const short = await findShortLines(tx, items);
        if (short.length > 0) throw new StockShortError(short);
        const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
        const deliveryFee = checkoutDeliveryFee(settings, details) ?? 0;

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
            shippingDistrict: delivery ? details.district || null : null,
            shippingCity: delivery ? details.city : null,
            shippingPostal: delivery ? details.postal : null,
            shippingLat: delivery ? details.lat : null,
            shippingLng: delivery ? details.lng : null,
            deliveryDistanceM: delivery ? details.distanceM : null,
            // Nobody else named: the contact receives it.
            recipientName: delivery ? details.recipientName || details.fullName : null,
            recipientPhone: delivery ? details.recipientPhone || details.phone : null,
            deliveryNote: delivery ? details.note || null : null,
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
      if (error instanceof StockShortError) {
        return {
          ok: false,
          error: "stock",
          short: error.lines.map((l) => ({
            // One-size products ("1 piece", "1 portion") are named alone; sizes are added after a dot.
            name: /^1 (piece|portion)$/.test(l.variantName) ? l.productName : `${l.productName} · ${l.variantName}`,
            left: l.left,
          })),
        };
      }
      // Two orders raced for the same number: try the next one.
      if ((error as { code?: string }).code === "P2002" && tries < 2) continue;
      console.error("[checkout] could not place order", error);
      return { ok: false, error: "generic" };
    }
  }
  if (!orderNumber) return { ok: false, error: "generic" };

  if (demo) {
    // No gateway charge: the demo row carries the chosen method. Once it is paid the paid email says
    // everything, so the "how to pay" email only goes out if the demo didn't go through.
    // The order exists either way: if the demo fails, the pay page lets the customer choose a method.
    const result = await markOrderPaidDemo(orderNumber, method).catch((error): DemoPaidResult => {
      console.error(`[checkout] ${orderNumber}: demo payment failed`, error);
      return "busy";
    });
    if (!isPaid(result)) {
      const placed = orderNumber;
      after(async () => {
        const full = await getOrderByNumber(placed);
        if (full) await sendOrderPlacedEmail(full);
      });
    }
    return { ok: true, orderNumber, charged: { ok: true }, demo: result };
  }

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

/**
 * Demo mode only (DEMO_PAYMENTS="on"): the customer skips paying an order whose payment can't be
 * simulated (a live gateway). Same path as the store's Mark paid (demo): the open gateway payment is
 * closed first, then the order is paid without money moving.
 */
export async function skipPaymentDemo(formData: FormData) {
  const orderNumber = str(formData, "orderNumber");
  const token = str(formData, "t");
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) redirect("/menu");
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  if (!demoPaymentsEnabled() || order.fulfilmentStatus === "cancelled") redirect(payHref);
  const result = await markOrderPaidDemo(orderNumber);
  revalidatePath(`/orders/${orderNumber}`);
  revalidatePath("/account");
  redirect(isPaid(result) || order.paymentStatus === "paid" ? withOrderToken(`/checkout/success/${orderNumber}`, token) : payHref);
}

export type CancelOrderState = { error?: "busy"; attempt: number };

/**
 * The customer cancels their own unpaid order from the pay page. Like the store's cancel, under the
 * order's lock: the open gateway payment is cancelled first, then the order is cancelled and its
 * payments closed (paymentStatus "expired", as the store's cancel leaves it). If the gateway won't
 * cancel because it was paid meanwhile, the order is paid instead and the customer goes to the
 * success page. If the gateway can't confirm the cancel, nothing changes (as with a method switch),
 * so a payment that may still go through never belongs to a cancelled order.
 */
export async function cancelOrder(prev: CancelOrderState, formData: FormData): Promise<CancelOrderState> {
  const attempt = prev.attempt + 1;
  const orderNumber = str(formData, "orderNumber");
  const token = str(formData, "t");
  const order = await getOrderForViewer(orderNumber, token);
  if (!order) redirect("/menu");
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  const successHref = withOrderToken(`/checkout/success/${orderNumber}`, token);
  if (order.paymentStatus === "paid") redirect(successHref);
  if (order.paymentStatus !== "awaiting" || order.fulfilmentStatus !== "pending") redirect(payHref);

  const outcome = await withOrderLock(order.id, async () => {
    // Read again under the lock: a payment, a method switch or the store may have landed meanwhile.
    const fresh = await getOrderByNumber(orderNumber);
    if (!fresh || fresh.paymentStatus !== "awaiting" || fresh.fulfilmentStatus !== "pending") return "closed" as const;
    const live = fresh.payments.find((p) => p.status === "awaiting");
    if (live) {
      const provider = getPaymentProvider(live.provider);
      const snapshot = paymentSnapshot(fresh, live);
      try {
        await provider.cancel(snapshot, "Order cancelled by the customer");
      } catch (error) {
        const code = error instanceof PaymentGatewayError ? error.code : null;
        if (code === "NOT_CANCELLABLE") {
          // Not cancellable usually means it was paid meanwhile: then the order is paid, not cancelled.
          if ((await provider.getStatus(snapshot)) === "paid") {
            await markOrderPaid(fresh.id, live.id);
            return "paid" as const;
          }
        } else if (code !== "NOT_FOUND") {
          console.warn(`[checkout] cancel ${live.reference} at the gateway failed, order not cancelled`, code ?? error);
          return "busy" as const;
        }
      }
    }
    // Guard against a concurrent change: only from the state read under the lock.
    const count = await db.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: fresh.id, paymentStatus: "awaiting", fulfilmentStatus: "pending" },
        data: { fulfilmentStatus: "cancelled", paymentStatus: "expired", cancelReason: CUSTOMER_CANCEL_REASON },
      });
      // Unpaid, so nothing was taken from stock: nothing to give back.
      if (count > 0) await tx.payment.updateMany({ where: { orderId: fresh.id, status: "awaiting" }, data: { status: "expired" } });
      return count;
    });
    return count > 0 ? ("cancelled" as const) : ("closed" as const);
  });

  if (!outcome || outcome === "busy") return { error: "busy", attempt };
  if (outcome === "paid") redirect(successHref);
  for (const path of [`/orders/${orderNumber}`, "/account", "/admin", "/admin/orders", `/admin/orders/${orderNumber}`]) revalidatePath(path);
  if (outcome === "cancelled") {
    deliverLater(async () => {
      const cancelled = await getOrderByNumber(orderNumber);
      if (cancelled) await sendOrderCancelledEmail(cancelled, "customer");
    });
  }
  redirect(withOrderToken(`/orders/${orderNumber}`, token));
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
  const options = await getPaymentOptions(await getStoreSettings(), order.total);
  if (!options.methods.includes(method)) return { error: "paymentUnavailable", attempt };
  // Known to be refused for this total: say so without cancelling the live payment first.
  if (method in options.belowMinimum) return { error: "gatewayMinimum", attempt };

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
  if (!charged.ok) {
    const error =
      charged.error === "unavailable"
        ? "gatewayUnavailable"
        : charged.error === "minimum"
          ? "gatewayMinimum"
          : charged.error === "stock"
            ? "stockGone"
            : "gatewayBusy";
    return { error, attempt };
  }
  redirect(payHref);
}

export type ReorderState = { failed?: boolean; attempt: number };

/** "Order again": put the order's items (still on sale) back in the cart. */
export async function reorder(prev: ReorderState, formData: FormData): Promise<ReorderState> {
  const order = await getOrderForViewer(str(formData, "orderNumber"), str(formData, "t"));
  if (!order) redirect("/menu");
  const available = await db.productVariant.findMany({
    where: { id: { in: order.items.map((i) => i.variantId) }, product: { isAvailable: true } },
    select: { id: true, stock: true },
  });
  // Most each size may hold: what's left of a tracked size, else MAX_QTY. Sold-out sizes are skipped.
  const cap = new Map(available.map((v) => [v.id.toString(), Math.min(MAX_QTY, v.stock ?? MAX_QTY)]));
  const entries = await readCartEntries();
  let added = 0;
  for (const item of order.items) {
    const v = item.variantId.toString();
    const max = cap.get(v) ?? 0;
    if (max <= 0) continue;
    const existing = entries.find((e) => e.v === v);
    if (existing) existing.q = Math.max(existing.q, Math.min(max, existing.q + item.qty));
    else entries.push({ v, q: Math.min(max, item.qty) });
    added++;
  }
  if (added === 0) return { failed: true, attempt: prev.attempt + 1 };
  await writeCartEntries(entries);
  revalidatePath("/", "layout");
  redirect("/checkout");
}
