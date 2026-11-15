import "server-only";
import { cache } from "react";
import { productImageUrl } from "@/content/products";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { orderDeadline } from "@/lib/orders";
import { PAYMENT_WINDOW_MS } from "@/lib/payments";

/** Which history filter an order falls under. */
export type OrderBucket = "active" | "completed" | "cancelled";
export const ORDER_FILTERS = ["all", "active", "completed", "cancelled"] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

/** Orders per page of the history table. */
export const ORDERS_PER_PAGE = 10;

/**
 * The same buckets as `bucket` below, as a query: completed, else cancelled (by the store, or unpaid
 * past its payment window, even before anything marked it expired), else in progress.
 */
function bucketWhere(filter: OrderFilter, now: number): Prisma.OrderWhereInput {
  const lapsed: Prisma.OrderWhereInput = { paymentStatus: "awaiting", createdAt: { lte: new Date(now - PAYMENT_WINDOW_MS) } };
  if (filter === "completed") return { fulfilmentStatus: "completed" };
  if (filter === "cancelled") {
    return { fulfilmentStatus: { not: "completed" }, OR: [{ fulfilmentStatus: "cancelled" }, { paymentStatus: "expired" }, lapsed] };
  }
  if (filter === "active") return { fulfilmentStatus: { notIn: ["completed", "cancelled"] }, paymentStatus: { not: "expired" }, NOT: lapsed };
  return {};
}

/** How many of the customer's orders each filter shows. One set of counts per request. */
export const getOrderCounts = cache(async (userId: bigint): Promise<Record<OrderFilter, number>> => {
  const now = Date.now();
  const counts = await Promise.all(ORDER_FILTERS.map((f) => db.order.count({ where: { userId, ...bucketWhere(f, now) } })));
  return Object.fromEntries(ORDER_FILTERS.map((f, i) => [f, counts[i]])) as Record<OrderFilter, number>;
});

/**
 * One page of the customer's orders under a filter, newest first, with what the account page shows of
 * each (the caller clamps `page` to the last one, see getOrderCounts). One query per request and page.
 */
export const getAccountOrders = cache(async (userId: bigint, filter: OrderFilter, page: number) => {
  const now = Date.now();
  const rows = await db.order.findMany({
    where: { userId, ...bucketWhere(filter, now) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (Math.max(1, page) - 1) * ORDERS_PER_PAGE,
    take: ORDERS_PER_PAGE,
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
          variant: { select: { name: true, product: { select: { name: true, slug: true, imageUrl: true } } } },
        },
      },
      payments: { where: { status: "awaiting" }, orderBy: { id: "desc" }, take: 1, select: { expiresAt: true } },
    },
  });
  return rows.map((order) => {
    const deadline = orderDeadline(order);
    // An attempt can lapse before the order (e-wallet requests are short): the order stays payable with
    // another method until its own window closes, so only that window fails it. "Pay before" shows the
    // attempt's time while it still runs.
    const attemptEnds = order.payments[0]?.expiresAt;
    const payBy = attemptEnds && attemptEnds.getTime() > now && attemptEnds < deadline ? attemptEnds : deadline;
    const lapsed = order.paymentStatus === "awaiting" && deadline.getTime() <= now;
    const paymentStatus = lapsed ? ("expired" as const) : order.paymentStatus;
    const first = order.items[0]?.variant.product;
    const bucket: OrderBucket =
      order.fulfilmentStatus === "completed"
        ? "completed"
        : order.fulfilmentStatus === "cancelled" || paymentStatus === "expired"
          ? "cancelled"
          : "active";
    return { ...order, paymentStatus, payBy, bucket, imageUrl: first ? productImageUrl(first.slug, first.imageUrl) : null };
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
