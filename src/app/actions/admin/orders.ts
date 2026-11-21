"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FulfilmentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliverLater } from "@/lib/mail";
import {
  NOTIFIED_STATUSES,
  sendOrderCancelledEmail,
  sendOrderRefundedEmail,
  sendOrderStatusEmail,
  type NotifiedStatus,
} from "@/lib/order-emails";
import { getOrderByNumber, markOrderPaid, paymentSnapshot, withOrderLock } from "@/lib/orders";
import { DEMO_PROVIDER, demoPaymentsEnabled, getPaymentProvider, PaymentGatewayError } from "@/lib/payments";
import { fulfilmentOptions } from "@/components/admin/rules";
import { CANCEL_REASONS } from "@/lib/order-status";
import { restoreOrderStock } from "@/lib/stock";
import { markOrderPaidDemo, type DemoPaidResult } from "@/lib/demo-payment";

export type FulfilmentState = { status: "idle" | "saved" | "unchanged" | "invalid" | "busy" | "reason" };

/** A preset reason key, or the store's own words (at least 3 characters); null when neither was given. */
function cancelReasonFrom(formData: FormData) {
  const preset = String(formData.get("reason") ?? "");
  const other = String(formData.get("other") ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  const reason = (CANCEL_REASONS as readonly string[]).includes(preset) ? preset : other;
  return reason.length >= 3 ? reason : null;
}

/** The timeline column a move to this status stamps (the order's cancel, hand-off or completion time). */
function stampFor(status: FulfilmentStatus, at = new Date()) {
  if (status === "cancelled") return { cancelledAt: at };
  if (status === "completed") return { completedAt: at };
  if (status === "ready_for_pickup" || status === "out_for_delivery") return { handedOffAt: at };
  return {};
}

const schema = z.object({
  orderNumber: z.string().min(1).max(12),
  status: z.enum(FulfilmentStatus),
});

export async function updateFulfilmentStatus(_prev: FulfilmentState, formData: FormData): Promise<FulfilmentState> {
  await requireAdmin();
  const parsed = schema.safeParse({ orderNumber: formData.get("orderNumber"), status: formData.get("status") });
  if (!parsed.success) return { status: "invalid" };

  const order = await db.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber },
    select: { id: true, userId: true, fulfilmentMethod: true, fulfilmentStatus: true, paymentStatus: true },
  });
  if (!order) return { status: "invalid" };
  if (order.fulfilmentStatus === parsed.data.status) return { status: "unchanged" };
  if (!fulfilmentOptions(order).includes(parsed.data.status)) return { status: "invalid" };

  const n = parsed.data.orderNumber;
  const revalidate = () => revalidateOrder(n);
  // Cancelling a paid order (in the kitchen or on its way) needs a reason the customer sees, as a decline does.
  const reason = parsed.data.status === "cancelled" && order.paymentStatus === "paid" ? cancelReasonFrom(formData) : null;
  if (parsed.data.status === "cancelled" && order.paymentStatus === "paid" && !reason) return { status: "reason" };

  // Cancelling an unpaid order closes its payment too, so it can't be paid afterwards.
  const closePayment = parsed.data.status === "cancelled" && order.paymentStatus === "awaiting";
  const apply = async (): Promise<FulfilmentState> => {
    if (closePayment) {
      const live = await db.payment.findFirst({ where: { orderId: order.id, status: "awaiting" }, orderBy: { id: "desc" } });
      if (live) {
        const provider = getPaymentProvider(live.provider);
        const snapshot = paymentSnapshot({ orderNumber: n }, live);
        try {
          await provider.cancel(snapshot, "Order cancelled by the store");
        } catch (error) {
          // Not cancellable usually means it was paid meanwhile: then the order is paid, not cancelled.
          if (error instanceof PaymentGatewayError && error.code === "NOT_CANCELLABLE" && (await provider.getStatus(snapshot)) === "paid") {
            await markOrderPaid(order.id, live.id);
            revalidate();
            return { status: "invalid" };
          }
          // Best effort: the payment is closed on our side below either way.
          console.warn(`[admin] cancel ${live.reference} at the gateway failed`, error instanceof PaymentGatewayError ? error.code : error);
        }
      }
    }

    // Guard against a concurrent change: only update from the statuses we checked.
    const count = await db.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id: order.id, fulfilmentStatus: order.fulfilmentStatus, paymentStatus: order.paymentStatus },
        data: {
          fulfilmentStatus: parsed.data.status,
          ...stampFor(parsed.data.status),
          ...(reason ? { cancelReason: reason } : {}),
          ...(closePayment ? { paymentStatus: "expired" as const } : {}),
        },
      });
      if (count > 0 && closePayment) {
        await tx.payment.updateMany({ where: { orderId: order.id, status: "awaiting" }, data: { status: "expired" } });
      }
      // A cancelled order gives back the stock its payment took (nothing when it was never taken).
      if (count > 0 && parsed.data.status === "cancelled") await restoreOrderStock(tx, order.id);
      return count;
    });
    if (count === 0) return { status: "invalid" };

    revalidate();
    notifyCustomer(n, parsed.data.status);
    return { status: "saved" };
  };

  // Closing the payment takes the same per-order lock as the customer's method switch, so the store
  // can't cancel one payment while the customer is creating the next one.
  if (!closePayment) return apply();
  return (await withOrderLock(order.id, apply)) ?? { status: "busy" };
}

/** Admin pages plus the customer's order pages (account, tracking). */
function revalidateOrder(n: string) {
  for (const p of ["/admin", "/admin/orders", `/admin/orders/${n}`, `/orders/${n}`, "/account"]) revalidatePath(p);
}

export type DemoPaidState = { status: "idle" | DemoPaidResult };

/**
 * Demo mode only (DEMO_PAYMENTS="on"): mark an unpaid order paid without money moving. Its live
 * gateway payment is closed first; the order then goes through the same paid path as a real payment
 * (see markOrderPaidDemo). Refused when the flag is off, and for an order that isn't unpaid and open.
 */
export async function markPaidDemo(_prev: DemoPaidState, formData: FormData): Promise<DemoPaidState> {
  await requireAdmin();
  if (!demoPaymentsEnabled()) return { status: "off" };
  const n = String(formData.get("orderNumber") ?? "").slice(0, 12);
  const status = await markOrderPaidDemo(n);
  // Refused because the order changed (paid, cancelled): the page shows what it is now.
  if (status !== "busy") revalidateOrder(n);
  return { status };
}

export type DecisionState = { status: "idle" | "accepted" | "declined" | "changed" | "reason" };

/**
 * The store's answer to a new paid order: accept (it goes to Baking) or decline with a reason (it's
 * cancelled; the payment is owed back, and its items go back into stock). Only a paid order still
 * waiting as "new" can be decided.
 */
export async function decideOrder(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  await requireAdmin();
  const n = String(formData.get("orderNumber") ?? "").slice(0, 12);
  const decision = formData.get("decision");
  if (decision !== "accept" && decision !== "decline") return { status: "changed" };
  const reason = decision === "decline" ? cancelReasonFrom(formData) : null;
  if (decision === "decline" && !reason) return { status: "reason" };

  const next: FulfilmentStatus = decision === "accept" ? "baking" : "cancelled";
  const count = await db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({
      where: { orderNumber: n, paymentStatus: "paid", fulfilmentStatus: "pending" },
      data: { fulfilmentStatus: next, cancelReason: reason, ...(next === "baking" ? { acceptedAt: new Date() } : stampFor(next)) },
    });
    // Declined: what its payment took goes back on the shelf, once.
    if (count > 0 && next === "cancelled") {
      const order = await tx.order.findUnique({ where: { orderNumber: n }, select: { id: true } });
      if (order) await restoreOrderStock(tx, order.id);
    }
    return count;
  });
  revalidateOrder(n);
  if (count === 0) return { status: "changed" };
  notifyCustomer(n, next);
  return { status: decision === "accept" ? "accepted" : "declined" };
}

export type RefundState = { status: "idle" | "refunded" | "invalid" };

/**
 * "Mark as refunded": the store has sent the money of a cancelled, really paid order back (from the
 * gateway dashboard or by transfer) and records when, with an optional note for itself. Only for a
 * cancelled order with a paid non-demo payment; a second call changes nothing and sends no email.
 * The customer gets one "Refund sent" email.
 */
export async function markRefunded(_prev: RefundState, formData: FormData): Promise<RefundState> {
  await requireAdmin();
  const n = String(formData.get("orderNumber") ?? "").slice(0, 12);
  const note = String(formData.get("note") ?? "").trim().replace(/\s+/g, " ").slice(0, 200) || null;
  const order = await db.order.findUnique({
    where: { orderNumber: n },
    select: { id: true, fulfilmentStatus: true, refundedAt: true, updatedAt: true, payments: { where: { status: "paid" }, select: { provider: true } } },
  });
  if (!order || order.fulfilmentStatus !== "cancelled" || !order.payments.some((p) => p.provider !== DEMO_PROVIDER)) {
    return { status: "invalid" };
  }
  if (order.refundedAt) return { status: "refunded" };
  const { count } = await db.order.updateMany({
    where: { id: order.id, fulfilmentStatus: "cancelled", refundedAt: null },
    // updatedAt stays as it was: cancelledByStore reads it as the cancel time of an unpaid order.
    data: { refundedAt: new Date(), refundNote: note, updatedAt: order.updatedAt },
  });
  revalidateOrder(n);
  if (count > 0) {
    deliverLater(async () => {
      const refunded = await getOrderByNumber(n);
      if (refunded) await sendOrderRefundedEmail(refunded);
    });
  }
  return { status: "refunded" };
}

/** Tell the customer about the store's change: accepted, ready, on its way, complete or cancelled. */
function notifyCustomer(orderNumber: string, status: FulfilmentStatus) {
  const notified = (NOTIFIED_STATUSES as readonly FulfilmentStatus[]).includes(status);
  if (!notified && status !== "cancelled") return;
  deliverLater(async () => {
    const order = await getOrderByNumber(orderNumber);
    if (!order) return;
    if (status === "cancelled") await sendOrderCancelledEmail(order, "store");
    else await sendOrderStatusEmail(order, status as NotifiedStatus);
  });
}

