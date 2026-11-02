import "server-only";
import { db } from "./db";

/** Paid orders the store hasn't accepted or declined yet. */
const newOrderWhere = { paymentStatus: "paid", fulfilmentStatus: "pending" } as const;

/**
 * What the admin needs to notice right away: how many paid orders wait for a decision, and the
 * latest of them (a change means a new order just came in). Shared by the admin layout and the
 * /api/admin/pulse poll.
 */
export async function adminPulse() {
  const [newOrders, latest] = await Promise.all([
    db.order.count({ where: newOrderWhere }),
    db.order.findFirst({ where: newOrderWhere, orderBy: { updatedAt: "desc" }, select: { orderNumber: true } }),
  ]);
  return { newOrders, latest: latest?.orderNumber ?? null };
}

export type AdminPulse = Awaited<ReturnType<typeof adminPulse>>;
