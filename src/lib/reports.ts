import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Admin / Sales report queries. Days are Surabaya days (WIB, UTC+7 all year,
 * no daylight saving), while the server and the database run in UTC.
 */
export const REPORT_PERIODS = ["today", "7d", "30d", "all"] as const;
export type ReportPeriod = (typeof REPORT_PERIODS)[number];

const PERIOD_DAYS: Record<Exclude<ReportPeriod, "all">, number> = { today: 1, "7d": 7, "30d": 30 };
const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

export function isReportPeriod(value: string): value is ReportPeriod {
  return (REPORT_PERIODS as readonly string[]).includes(value);
}

/** "2026-11-02": the Surabaya calendar day of an instant. */
function wibDayKey(date: Date) {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight WIB at the start of today, as a UTC instant. */
function startOfWibToday(now: Date) {
  return new Date(Math.floor((now.getTime() + WIB_OFFSET_MS) / DAY_MS) * DAY_MS - WIB_OFFSET_MS);
}

/** [from, to) covering the period's whole WIB days up to the end of today; null for all time. */
export function periodRange(period: ReportPeriod, now = new Date()) {
  if (period === "all") return null;
  const days = PERIOD_DAYS[period];
  const today = startOfWibToday(now).getTime();
  return { from: new Date(today - (days - 1) * DAY_MS), to: new Date(today + DAY_MS), days };
}

/** Orders that count as revenue: paid, and not cancelled by the store afterwards (a refund). */
export const keptOrderWhere = {
  paymentStatus: "paid",
  fulfilmentStatus: { not: "cancelled" },
} satisfies Prisma.OrderWhereInput;

export async function getSalesReport(period: ReportPeriod, now = new Date()) {
  const range = periodRange(period, now);
  const placed: Prisma.OrderWhereInput = range ? { createdAt: { gte: range.from, lt: range.to } } : {};
  const kept: Prisma.OrderWhereInput = { ...placed, ...keptOrderWhere };

  const [totals, statuses, itemGroups, dailyOrders] = await Promise.all([
    db.order.aggregate({ where: kept, _sum: { total: true, subtotal: true, deliveryFee: true }, _count: { _all: true } }),
    db.order.groupBy({ by: ["paymentStatus", "fulfilmentStatus"], where: placed, _count: { _all: true } }),
    // Grouped by unit price too, so a price change mid-period still sums to the exact revenue.
    db.orderItem.groupBy({ by: ["variantId", "unitPrice"], where: { order: kept }, _sum: { qty: true } }),
    // At most 30 days of paid orders, two columns each.
    range && range.days > 1 ? db.order.findMany({ where: kept, select: { createdAt: true, total: true } }) : null,
  ]);

  const variants = itemGroups.length
    ? await db.productVariant.findMany({
        where: { id: { in: [...new Set(itemGroups.map((g) => g.variantId))] } },
        select: {
          id: true,
          product: { select: { id: true, name: true, category: { select: { slug: true, name: true } } } },
        },
      })
    : [];
  const variantById = new Map(variants.map((v) => [String(v.id), v.product]));

  const products = new Map<string, { id: string; name: string; categorySlug: string; categoryName: string; qty: number; revenue: number }>();
  const categories = new Map<string, { slug: string; name: string; qty: number; revenue: number }>();
  let itemsSold = 0;
  for (const g of itemGroups) {
    const product = variantById.get(String(g.variantId));
    if (!product) continue;
    const qty = g._sum.qty ?? 0;
    const revenue = qty * g.unitPrice;
    itemsSold += qty;
    const p = products.get(String(product.id)) ?? {
      id: String(product.id),
      name: product.name,
      categorySlug: product.category.slug,
      categoryName: product.category.name,
      qty: 0,
      revenue: 0,
    };
    p.qty += qty;
    p.revenue += revenue;
    products.set(String(product.id), p);
    const c = categories.get(product.category.slug) ?? { slug: product.category.slug, name: product.category.name, qty: 0, revenue: 0 };
    c.qty += qty;
    c.revenue += revenue;
    categories.set(product.category.slug, c);
  }

  let awaiting = 0;
  let expired = 0;
  let cancelled = 0;
  let cancelledPaid = 0;
  for (const s of statuses) {
    const n = s._count._all;
    if (s.paymentStatus === "expired") expired += n;
    else if (s.fulfilmentStatus === "cancelled") {
      cancelled += n;
      if (s.paymentStatus === "paid") cancelledPaid += n;
    } else if (s.paymentStatus === "awaiting") awaiting += n;
  }

  let daily: { date: Date; revenue: number; orders: number }[] | null = null;
  if (range && dailyOrders) {
    daily = Array.from({ length: range.days }, (_, i) => ({
      date: new Date(range.from.getTime() + i * DAY_MS),
      revenue: 0,
      orders: 0,
    }));
    const byKey = new Map(daily.map((d) => [wibDayKey(d.date), d]));
    for (const o of dailyOrders) {
      const day = byKey.get(wibDayKey(o.createdAt));
      if (!day) continue;
      day.revenue += o.total;
      day.orders += 1;
    }
  }

  const revenue = totals._sum.total ?? 0;
  const paidOrders = totals._count._all;
  return {
    range,
    revenue,
    itemRevenue: totals._sum.subtotal ?? 0,
    deliveryRevenue: totals._sum.deliveryFee ?? 0,
    paidOrders,
    averageOrder: paidOrders ? Math.round(revenue / paidOrders) : 0,
    itemsSold,
    productsSold: products.size,
    awaiting,
    expired,
    cancelled,
    cancelledPaid,
    topProducts: [...products.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 10),
    categories: [...categories.values()].sort((a, b) => b.revenue - a.revenue),
    daily,
  };
}
