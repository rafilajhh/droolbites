import "server-only";
import { db } from "./db";
import { needsActionWhere } from "./order-status";

/**
 * What the admin needs to notice right away: how many paid orders wait for a decision, and the
 * most recently paid of them. `paidAt` only moves forward when money comes in, so a larger value
 * means a new order (accepting or declining one never makes it larger). Shared by the admin layout
 * and the /api/admin/pulse poll.
 */
export async function adminPulse() {
  const [newOrders, latest] = await Promise.all([
    db.order.count({ where: needsActionWhere }),
    db.payment.findFirst({
      where: { status: "paid", paidAt: { not: null }, order: needsActionWhere },
      orderBy: { paidAt: "desc" },
      select: { paidAt: true, order: { select: { orderNumber: true } } },
    }),
  ]);
  return { newOrders, latest: latest?.order.orderNumber ?? null, paidAt: latest?.paidAt?.getTime() ?? 0 };
}

export type AdminPulse = Awaited<ReturnType<typeof adminPulse>>;
