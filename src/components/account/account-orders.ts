import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { orderDeadline } from "@/lib/orders";

/** Which history filter an order falls under. */
export type OrderBucket = "active" | "completed" | "cancelled";
export const ORDER_FILTERS = ["all", "active", "completed", "cancelled"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

/** The customer's last 50 orders, newest first, with what the account page shows of each. One query per request. */
export const getAccountOrders = cache(async (userId: bigint) => {
  const rows = await db.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      orderNumber: true,
      createdAt: true,
      total: true,
      fulfilmentMethod: true,
      paymentStatus: true,
      fulfilmentStatus: true,
      shippingAddress: true,
      items: {
        select: {
          qty: true,
          variant: { select: { name: true, product: { select: { name: true, imageUrl: true } } } },
        },
      },
      payments: { where: { status: "awaiting" }, orderBy: { id: "desc" }, take: 1, select: { expiresAt: true } },
    },
  });
  const now = Date.now();
  return rows.map((order) => {
    const deadline = orderDeadline(order);
    // An attempt can lapse before the order (e-wallet requests are short): the order stays payable with
    // another method until its own window closes, so only that window fails it. "Pay before" shows the
    // attempt's time while it still runs.
    const attemptEnds = order.payments[0]?.expiresAt;
    const payBy = attemptEnds && attemptEnds.getTime() > now && attemptEnds < deadline ? attemptEnds : deadline;
    const lapsed = order.paymentStatus === "awaiting" && deadline.getTime() <= now;
    const paymentStatus = lapsed ? ("expired" as const) : order.paymentStatus;
    const bucket: OrderBucket =
      order.fulfilmentStatus === "completed"
        ? "completed"
        : order.fulfilmentStatus === "cancelled" || paymentStatus === "expired"
          ? "cancelled"
          : "active";
    return { ...order, paymentStatus, payBy, bucket, imageUrl: order.items[0]?.variant.product.imageUrl ?? null };
  });
});

export type AccountOrder = Awaited<ReturnType<typeof getAccountOrders>>[number];

/** Size variants ("20 × 20 cm") are shown without the unit; "1 piece"/"1 portion" are left out. */
function sizeSuffix(variantName: string) {
  if (/^1 (piece|portion)$/.test(variantName)) return "";
  return ` ${variantName.replace(/\s*cm$/, "")}`;
}

/** "Fudgy Brownies 20 × 20" for one line; "Chocolate Chunk + 2 more" style lists are left to the caller. */
export function itemNames(order: AccountOrder) {
  return order.items.map((item) => `${item.qty > 1 ? `${item.qty} × ` : ""}${item.variant.product.name}${sizeSuffix(item.variant.name)}`);
}
