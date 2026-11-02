import "server-only";
import { cookies } from "next/headers";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { FulfilmentStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { db } from "./db";
import { deliveryFeeFor, isLatLng, storeKey, withinRange, type DeliveryRates } from "./delivery";
import { getCurrentUser } from "./auth";
import { deliverLater } from "./mail";
import { sendOrderCancelledEmail, sendOrderPaidEmail, sendStoreNewOrderEmail } from "./order-emails";
import { getPaymentProvider, PAYMENT_WINDOW_MS, PaymentGatewayError } from "./payments";
import { signToken, verifyToken } from "./session";

export const ORDER_NUMBER_RE = /^DB-\d{4,9}$/;

const cookieBase = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https"),
  sameSite: "lax" as const,
  path: "/",
};

/* ------------------------------------------------------------------ */
/* Checkout details (between the details and payment steps)            */
/* ------------------------------------------------------------------ */

export const DETAILS_COOKIE = "db_checkout";
const DETAILS_MAX_AGE = 60 * 60 * 6; // 6 hours

const text = (max: number) => z.string().trim().max(max);

/** Indonesian mobile numbers: 08…, +628… or 628… (spaces, dashes and brackets allowed). E-wallets need one. */
const ID_MOBILE_RE = /^(?:\+?62|0)8\d{7,11}$/;
export function isIdMobile(phone: string) {
  return ID_MOBILE_RE.test(phone.replace(/[\s().-]/g, ""));
}

/** Field names double as message keys in checkoutMessages.errors. */
export const checkoutDetailsSchema = z
  .object({
    email: z.string().trim().toLowerCase().max(150).pipe(z.email()),
    fulfilment: z.enum(["delivery", "pickup"]),
    fullName: text(100).min(2),
    phone: z.string().trim().max(20).refine(isIdMobile),
    street: text(180),
    apartment: text(70),
    city: text(100),
    postal: text(10),
    /** The delivery pin on the map. */
    lat: z.number().nullable().default(null),
    lng: z.number().nullable().default(null),
    /** Road distance from the store, measured by the server when the details are saved (never sent by the client). */
    distanceM: z.number().int().min(0).nullable().default(null),
    /** How distanceM was measured, so a restored quote says "estimated" when it was. */
    distanceKind: z.enum(["road", "estimated", "straight"]).nullable().default(null),
    /** The store pin it was measured from (storeKey); a moved store pin asks for a new measurement. */
    storeAt: z.string().max(40).nullable().default(null),
  })
  .superRefine((d, ctx) => {
    if (d.fulfilment === "delivery") {
      if (d.street.length < 3) ctx.addIssue({ code: "custom", path: ["street"], message: "street" });
      if (d.city.length < 2) ctx.addIssue({ code: "custom", path: ["city"], message: "city" });
      if (!/^\d{5}$/.test(d.postal)) ctx.addIssue({ code: "custom", path: ["postal"], message: "postal" });
      if (!isLatLng(d.lat, d.lng)) ctx.addIssue({ code: "custom", path: ["lat"], message: "location" });
    }
  });

export type CheckoutDetails = z.infer<typeof checkoutDetailsSchema>;
export type CheckoutField = keyof CheckoutDetails;

export async function readCheckoutDetails(): Promise<CheckoutDetails | null> {
  const token = (await cookies()).get(DETAILS_COOKIE)?.value;
  const payload = await verifyToken<{ d?: unknown }>(token);
  const parsed = checkoutDetailsSchema.safeParse(payload?.d);
  return parsed.success ? parsed.data : null;
}

/** Server actions only (cookies can't be set while rendering). */
export async function writeCheckoutDetails(details: CheckoutDetails) {
  const token = await signToken({ d: details }, `${DETAILS_MAX_AGE}s`);
  (await cookies()).set(DETAILS_COOKIE, token, { ...cookieBase, maxAge: DETAILS_MAX_AGE });
}

export async function clearCheckoutDetails() {
  (await cookies()).delete(DETAILS_COOKIE);
}

/**
 * The delivery fee for saved checkout details at the store's current rates: 0 for pickup, null when
 * the pin is missing, was measured from an older store pin, or is now beyond the store's maximum
 * distance (the details step asks again).
 */
export function checkoutDeliveryFee(rates: DeliveryRates, details: CheckoutDetails): number | null {
  if (details.fulfilment !== "delivery") return 0;
  if (details.distanceM === null || details.storeAt !== storeKey(rates)) return null;
  if (!withinRange(rates, details.distanceM)) return null;
  return deliveryFeeFor(rates, details.distanceM);
}

/** "Jl. Raya Darmo No. 12, Wonokromo, Surabaya 60241" */
export function formatAddress(parts: { address: string | null; city: string | null; postal: string | null }) {
  const tail = [parts.city, parts.postal].filter(Boolean).join(" ");
  return [parts.address, tail].filter(Boolean).join(", ");
}

/** Street + apartment as stored in orders.shipping_address. */
export function joinStreet(street: string, apartment: string) {
  return [street, apartment].filter(Boolean).join(", ");
}

/** "Jl. Palem Sememi Raya F16, Surabaya" from the full store address. */
export function shortStoreAddress(address: string, city: string) {
  const first = address.split(",")[0]?.trim() ?? address;
  return first === address ? address : `${first}, ${city}`;
}

/* ------------------------------------------------------------------ */
/* Who may see an order                                                */
/* ------------------------------------------------------------------ */

export const RECENT_ORDERS_COOKIE = "db_orders";
const RECENT_MAX_AGE = 60 * 60 * 24 * 90;

export async function readRecentOrders(): Promise<string[]> {
  const token = (await cookies()).get(RECENT_ORDERS_COOKIE)?.value;
  const payload = await verifyToken<{ n?: unknown }>(token);
  return Array.isArray(payload?.n) ? payload.n.filter((n): n is string => typeof n === "string") : [];
}

/** Remember that this browser placed the order. Server actions only. */
export async function rememberOrder(orderNumber: string) {
  const recent = [orderNumber, ...(await readRecentOrders()).filter((n) => n !== orderNumber)].slice(0, 20);
  const token = await signToken({ n: recent }, `${RECENT_MAX_AGE}s`);
  (await cookies()).set(RECENT_ORDERS_COOKIE, token, { ...cookieBase, maxAge: RECENT_MAX_AGE });
}

/** Signed `?t=` token used in emails; grants read access to one order. */
export async function orderAccessToken(orderNumber: string) {
  return signToken({ typ: "order", o: orderNumber }, "180d");
}

export async function canAccessOrder(order: { orderNumber: string; userId: bigint | null }, token?: string | null) {
  const user = await getCurrentUser();
  if (user?.role === "admin") return true;
  if (user && order.userId !== null && order.userId === user.id) return true;
  if ((await readRecentOrders()).includes(order.orderNumber)) return true;
  if (token) {
    const payload = await verifyToken<{ typ?: string; o?: string }>(token);
    if (payload?.typ === "order" && payload.o === order.orderNumber) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* Loading orders                                                      */
/* ------------------------------------------------------------------ */

const orderInclude = {
  items: {
    orderBy: { id: "asc" },
    include: { variant: { include: { product: { include: { category: { select: { slug: true } } } } } } },
  },
  payments: { orderBy: { id: "desc" } },
} satisfies Prisma.OrderInclude;

export type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** No access check: for emails and internal use. */
export async function getOrderByNumber(orderNumber: string) {
  return db.order.findUnique({ where: { orderNumber }, include: orderInclude });
}

/**
 * The order if the visitor may see it (owner, admin, the browser that placed
 * it, or a valid email token), with an overdue payment marked expired.
 */
export async function getOrderForViewer(orderNumber: string, token?: string | null): Promise<FullOrder | null> {
  if (!ORDER_NUMBER_RE.test(orderNumber)) return null;
  const order = await getOrderByNumber(orderNumber);
  if (!order || !(await canAccessOrder(order, token))) return null;
  return syncPaymentStatus(order);
}

/** An order waits PAYMENT_WINDOW_MS for payment, whichever methods are tried in between. */
export function orderDeadline(order: { createdAt: Date }) {
  return new Date(order.createdAt.getTime() + PAYMENT_WINDOW_MS);
}

export function paymentSnapshot(order: { orderNumber: string }, payment: FullOrder["payments"][number]) {
  return {
    orderNumber: order.orderNumber,
    reference: payment.reference,
    method: payment.method,
    amount: payment.amount,
    status: payment.status,
    expiresAt: payment.expiresAt,
  };
}

/**
 * Ask the gateway about the latest awaiting payment and store the answer.
 * A payment can expire at the gateway before the order does (e-wallet
 * requests are short-lived): the order then stays open so the customer can
 * pick another method, and only closes at its own deadline.
 */
export async function syncPaymentStatus(order: FullOrder, now = new Date()): Promise<FullOrder> {
  if (order.paymentStatus !== "awaiting") return order;
  const payment = order.payments[0];
  let changed = false;
  if (payment?.status === "awaiting") {
    const status = await getPaymentProvider(payment.provider).getStatus(paymentSnapshot(order, payment), now);
    if (status === "paid") changed = await markOrderPaid(order.id, payment.id);
    else if (status === "expired") changed = await markPaymentExpired(payment.id);
    if (status !== "expired") return changed ? (await getOrderByNumber(order.orderNumber))! : order;
  }
  if (orderDeadline(order) <= now) changed = (await expireOrder(order.id)) || changed;
  return changed ? (await getOrderByNumber(order.orderNumber))! : order;
}

/** The gateway says this payment can no longer be paid. Returns false if it already wasn't awaiting. */
export async function markPaymentExpired(paymentId: bigint) {
  const { count } = await db.payment.updateMany({ where: { id: paymentId, status: "awaiting" }, data: { status: "expired" } });
  return count > 0;
}

/** The "expired" email only goes out this soon after the deadline. */
const EXPIRED_EMAIL_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Deadline passed without payment: the order expires and a new one is cancelled. The customer
 * gets one "expired" email, from whichever caller made the change.
 */
export async function expireOrder(orderId: bigint) {
  const [, expired, cancelled] = await db.$transaction([
    db.payment.updateMany({ where: { orderId, status: "awaiting" }, data: { status: "expired" } }),
    db.order.updateMany({ where: { id: orderId, paymentStatus: "awaiting" }, data: { paymentStatus: "expired" } }),
    db.order.updateMany({ where: { id: orderId, paymentStatus: "expired", fulfilmentStatus: "pending" }, data: { fulfilmentStatus: "cancelled" } }),
  ]);
  if (expired.count > 0 && cancelled.count > 0) {
    deliverLater(async () => {
      const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
      // An order abandoned long ago (closed only now, when someone opened it) gets no email.
      if (order && orderDeadline(order).getTime() > Date.now() - EXPIRED_EMAIL_WITHIN_MS) {
        await sendOrderCancelledEmail(order, "expired");
      }
    });
  }
  return expired.count > 0;
}

/**
 * Cancelled by the store (admin) rather than closed at the payment deadline.
 * expireOrder only cancels once the deadline has passed, so an unpaid
 * cancelled order last changed before its deadline was cancelled from the
 * admin. An awaiting one is a store cancel from before cancelling closed the
 * payment. (A store cancel after the deadline counts as expiry.)
 */
export function cancelledByStore(order: {
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  createdAt: Date;
  updatedAt: Date | null;
}) {
  if (order.fulfilmentStatus !== "cancelled") return false;
  if (order.paymentStatus !== "expired") return true;
  return !order.updatedAt || order.updatedAt < orderDeadline(order);
}

/**
 * Payment confirmed: payment and order become paid and the order moves to
 * baking. Idempotent (returns false if nothing changed). A late payment is
 * accepted too: gateways confirm up to days after expiry, so an expired or
 * superseded payment can still turn paid and revive an order that was
 * auto-cancelled. The paid email goes out once, after the response.
 *
 * An order the store cancelled is not revived: the payment is recorded as
 * paid (the money arrived) but the order stays cancelled and unpaid, no email
 * goes out, and the admin order page shows "refund needed".
 */
export async function markOrderPaid(orderId: bigint, paymentId: bigint, paidAt = new Date()) {
  const result = await db.$transaction(async (tx) => {
    const { count } = await tx.payment.updateMany({
      where: { id: paymentId, orderId, status: { in: ["awaiting", "expired"] } },
      data: { status: "paid", paidAt },
    });
    if (count === 0) return null;
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true, paymentStatus: true, fulfilmentStatus: true, createdAt: true, updatedAt: true },
    });
    if (!order) return null;
    if (order.paymentStatus === "paid") {
      console.warn(`[orders] order ${orderId} was already paid; payment ${paymentId} was paid as well (refund needed)`);
      return null;
    }
    if (cancelledByStore(order)) {
      if (order.paymentStatus === "awaiting") {
        await tx.order.updateMany({ where: { id: orderId, paymentStatus: "awaiting" }, data: { paymentStatus: "expired" } });
      }
      return { refund: order.orderNumber };
    }
    const { count: orderCount } = await tx.order.updateMany({
      where: { id: orderId, paymentStatus: order.paymentStatus },
      data: { paymentStatus: "paid" },
    });
    if (orderCount === 0) return null;
    // A paid order waits as a new order until the store accepts (baking) or declines it. A late
    // payment for an order that had expired on its own reopens it the same way.
    if (order.paymentStatus === "expired" && order.fulfilmentStatus === "cancelled") {
      await tx.order.update({ where: { id: orderId }, data: { fulfilmentStatus: "pending" } });
    }
    return { refund: null };
  });
  if (result?.refund) {
    console.warn(`[orders] ${result.refund}: payment ${paymentId} arrived after the order was cancelled; refund needed`);
  }
  const changed = result !== null;
  if (result && !result.refund) {
    deliverLater(async () => {
      const order = await db.order.findUnique({ where: { id: orderId }, include: orderInclude });
      if (!order) return;
      // The store hears about it too, so it can accept or decline, even if the customer's email fails.
      const sent = await Promise.allSettled([sendOrderPaidEmail(order), sendStoreNewOrderEmail(order)]);
      for (const r of sent) if (r.status === "rejected") console.warn(`[orders] ${order.orderNumber}: email failed`, r.reason);
    });
  }
  return changed;
}

export type ChargeResult = { ok: true } | { ok: false; error: "unavailable" | "busy" };

/**
 * Ask the gateway for a new payment on an unpaid order (a new reference per
 * attempt: DB-0007-1, DB-0007-2, …) and store it. A gateway refusal comes
 * back as an error kind for the UI; the order is left without a live payment.
 */
export async function chargeOrder(
  order: Pick<FullOrder, "id" | "orderNumber" | "total" | "createdAt" | "customerName" | "email" | "phone">,
  method: PaymentMethod,
): Promise<ChargeResult> {
  const provider = getPaymentProvider();
  const attempt = (await db.payment.count({ where: { orderId: order.id } })) + 1;
  let reference = `${order.orderNumber}-${attempt}`;
  const charge = (ref: string) =>
    provider.createPayment({
      orderNumber: order.orderNumber,
      reference: ref,
      method,
      amount: order.total,
      expiresAt: orderDeadline(order),
      customer: { name: order.customerName, email: order.email, phone: order.phone },
    });
  try {
    let created;
    try {
      created = await charge(reference);
    } catch (error) {
      // A refused attempt stores no row, so its number is reused; if the gateway still holds
      // that reference (other method → 409), move to a reference it has never seen.
      if (!(error instanceof PaymentGatewayError) || !["IDEMPOTENCY_CONFLICT", "DUPLICATE_ORDER_ID"].includes(error.code)) throw error;
      reference = `${order.orderNumber}-${attempt}-${Date.now().toString(36)}`;
      created = await charge(reference);
    }
    await db.payment.create({
      data: {
        orderId: order.id,
        method,
        amount: order.total,
        status: "awaiting",
        provider: provider.id,
        reference,
        transactionId: created.transactionId,
        vaNumber: created.vaNumber,
        qrContent: created.qrContent,
        payUrl: created.payUrl,
        chargedAmount: created.chargedAmount,
        fee: created.fee,
        feeBearer: created.feeBearer,
        expiresAt: created.expiresAt,
      },
    });
    return { ok: true };
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      // Same reference stored by a concurrent request: the gateway returned that same payment (idempotent reference).
      console.warn(`[orders] ${reference} (${method}) already stored`);
      return { ok: true };
    }
    if (!(error instanceof PaymentGatewayError)) {
      // Our side failed (e.g. the database): the order stays open and the customer can retry.
      console.error(`[orders] ${reference} (${method}) could not be stored`, error);
      return { ok: false, error: "busy" };
    }
    console.warn(`[orders] ${reference} (${method}) not created: ${error.code}`);
    return { ok: false, error: error.unavailable ? "unavailable" : "busy" };
  }
}

/**
 * Run `fn` while holding a MySQL advisory lock for this order, so two
 * payment-method switches for one order never overlap (double submit, two
 * tabs). GET_LOCK belongs to one connection, hence the transaction that pins
 * it; it locks no rows, so `fn` (and the status poll) write through `db` as
 * usual. Returns null when the lock isn't free within LOCK_WAIT_S: callers
 * answer "busy" right away instead of holding a pool connection while they
 * wait.
 */
const LOCK_WAIT_S = 2;
export async function withOrderLock<T>(orderId: bigint, fn: () => Promise<T>): Promise<T | null> {
  const name = `droolbites:order:${orderId}`;
  return db.$transaction(
    async (tx) => {
      const [row] = await tx.$queryRaw<{ ok: number | bigint | null }[]>`SELECT GET_LOCK(${name}, ${LOCK_WAIT_S}) AS ok`;
      if (Number(row?.ok) !== 1) return null;
      try {
        return await fn();
      } finally {
        // Never let a failed release (e.g. the transaction already closed) replace fn's result or error.
        // The lock then ends when MySQL closes that connection.
        await tx.$queryRaw`SELECT RELEASE_LOCK(${name})`.catch((error: unknown) => {
          console.error(`[orders] RELEASE_LOCK ${name} failed`, error);
        });
      }
    },
    // Worst case inside `fn` is ~120 s of gateway calls at 15 s each: cancel, status lookup, then a
    // charge (POST, lookup, POST) that may be repeated once under a new reference. Keep well above it.
    { maxWait: 10_000, timeout: 180_000 },
  );
}

/** What the customer pays for a payment, and the gateway service fee in it (0 when the store bears the fee). */
export function payable(order: { total: number }, payment?: { chargedAmount: number | null } | null) {
  const amount = Math.max(payment?.chargedAmount ?? order.total, order.total);
  return { amount, serviceFee: amount - order.total };
}

/** Highest existing number + 1: DB-0002, DB-0003, … */
export async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<{ n: bigint | number | string | null }[]>`
    SELECT MAX(CAST(SUBSTRING(order_number, 4) AS UNSIGNED)) AS n FROM orders WHERE order_number LIKE 'DB-%'`;
  const highest = Number(rows[0]?.n ?? 0) || 0;
  return `DB-${String(highest + 1).padStart(4, "0")}`;
}

export function itemCount(order: Pick<FullOrder, "items">) {
  return order.items.reduce((sum, item) => sum + item.qty, 0);
}

/** Keep the email token on links between the pay, success and order pages. */
export function withOrderToken(path: string, token?: string | null) {
  return token ? `${path}?t=${encodeURIComponent(token)}` : path;
}

/** "BCA Virtual Account" → "BCA VA" for compact meta lines. */
export function shortMethodName(name: string) {
  return name.replace(" Virtual Account", " VA");
}
