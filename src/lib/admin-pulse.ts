import "server-only";
import { db } from "./db";

/** Paid orders the store hasn't accepted or declined yet. */
const newOrderWhere = { paymentStatus: "paid", fulfilmentStatus: "pending" } as const;

/**
 * What the admin needs to notice right away: how many paid orders wait for a decision, and the
 * most recently paid of them. `paidAt` only moves forward when money comes in, so a larger value
 * means a new order (accepting or declining one never makes it larger). Shared by the admin layout
 * and the /api/admin/pulse poll.
 */
export async function adminPulse() {
  const [newOrders, latest] = await Promise.all([
    db.order.count({ where: newOrderWhere }),
    db.payment.findFirst({
      where: { status: "paid", paidAt: { not: null }, order: newOrderWhere },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true, order: { select: { orderNumber: true } } },
    }),
  ]);
  return { newOrders, latest: latest?.order.orderNumber ?? null, paidAt: latest?.paidAt?.getTime() ?? 0 };
}

export type AdminPulse = Awaited<ReturnType<typeof adminPulse>>;
