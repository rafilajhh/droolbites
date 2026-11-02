"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { FulfilmentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { deliverLater } from "@/lib/mail";
import { NOTIFIED_STATUSES, sendOrderCancelledEmail, sendOrderStatusEmail, type NotifiedStatus } from "@/lib/order-emails";
import { getOrderByNumber, markOrderPaid, paymentSnapshot, withOrderLock } from "@/lib/orders";
import { getPaymentProvider, PaymentGatewayError } from "@/lib/payments";
import { fulfilmentOptions } from "@/components/admin/rules";
import { CANCEL_REASONS } from "@/lib/order-status";

export type FulfilmentState = { status: "idle" | "saved" | "unchanged" | "invalid" | "busy" };

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

  // Cancelling an unpaid order closes its payment too, so it can't be paid afterwards.
  const closePayment = parsed.data.status === "cancelled" && order.paymentStatus === "awaiting";
  const apply = async (): Promise<FulfilmentState> => {
    if (closePayment) {
      const live = await db.payment.findFirst({ where: { orderId: order.id, status: "awaiting" }, orderBy: { id: "desc" } });
      if (live) {
        const provider = getPaymentProvider(live.provider);
        const snapshot = paymentSnapshot({ orderNumber: n }, live);
        try {
          await provider.cancel(snapshot);
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
        data: { fulfilmentStatus: parsed.data.status, ...(closePayment ? { paymentStatus: "expired" as const } : {}) },
      });
      if (count > 0 && closePayment) {
        await tx.payment.updateMany({ where: { orderId: order.id, status: "awaiting" }, data: { status: "expired" } });
      }
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

export type DecisionState = { status: "idle" | "accepted" | "declined" | "changed" | "reason" };

/**
 * The store's answer to a new paid order: accept (it goes to Baking) or decline with a reason (it's
 * cancelled; the payment is owed back). Only a paid order still waiting as "new" can be decided.
 */
export async function decideOrder(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
  await requireAdmin();
  const n = String(formData.get("orderNumber") ?? "").slice(0, 12);
  const decision = formData.get("decision");
  if (decision !== "accept" && decision !== "decline") return { status: "changed" };
  const preset = String(formData.get("reason") ?? "");
  const other = String(formData.get("other") ?? "").trim().replace(/\s+/g, " ").slice(0, 200);
  const reason = decision === "decline" ? ((CANCEL_REASONS as readonly string[]).includes(preset) ? preset : other) : null;
  if (decision === "decline" && (!reason || reason.length < 3)) return { status: "reason" };

  const next: FulfilmentStatus = decision === "accept" ? "baking" : "cancelled";
  const { count } = await db.order.updateMany({
    where: { orderNumber: n, paymentStatus: "paid", fulfilmentStatus: "pending" },
    data: { fulfilmentStatus: next, cancelReason: reason },
  });
  revalidateOrder(n);
  if (count === 0) return { status: "changed" };
  notifyCustomer(n, next);
  return { status: decision === "accept" ? "accepted" : "declined" };
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

export type OrderSuggestion = {
  orderNumber: string;
  customerName: string;
  total: number;
  paymentStatus: "awaiting" | "paid" | "expired";
};

/** Live results for the order search popover (order number, name or email). */
export async function suggestOrders(query: string): Promise<OrderSuggestion[]> {
  await requireAdmin();
  const q = query.trim().slice(0, 100);
  if (!q) return [];
  const rows = await db.order.findMany({
    where: { OR: [{ orderNumber: { contains: q } }, { customerName: { contains: q } }, { email: { contains: q } }] },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { orderNumber: true, customerName: true, total: true, paymentStatus: true },
  });
  return rows;
}
