import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { FulfilmentMethod, PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { cancelledByStore } from "@/lib/orders";
import { shownPayment } from "@/lib/payments";

/**
 * Admin / Sales report queries. Days are Surabaya days (WIB, UTC+7 all year,
 * no daylight saving), while the server and the database run in UTC. A day is
 * written as its calendar key, "2026-11-02".
 */
export const REPORT_PRESETS = ["today", "7d", "30d", "month", "last-month", "year", "all"] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];
export const DEFAULT_REPORT_PRESET: ReportPreset = "7d";
/** The first day a custom range may start on. */
export const REPORT_EARLIEST_DAY = "2020-01-01";

const DAY_MS = 24 * 60 * 60 * 1000;
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const KEY = /^\d{4}-\d{2}-\d{2}$/;

/** "2026-11-02": the Surabaya calendar day of an instant. */
export function wibDayKey(date: Date) {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight WIB at the start of a day, as a UTC instant. */
export function wibDayStart(key: string) {
  return new Date(Date.parse(`${key}T00:00:00Z`) - WIB_OFFSET_MS);
}

/** The day `n` days after `key` (n may be negative). */
export function addDays(key: string, n: number) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Days from `from` to `to`, both counted. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** A real calendar day ("2026-02-30" is not). */
function isDayKey(value: string) {
  if (!KEY.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** First and last day of a preset; `from` is null for all time. */
function presetDays(preset: ReportPreset, today: string): { from: string | null; to: string } {
  const [y, m] = today.split("-");
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: addDays(today, -6), to: today };
    case "30d":
      return { from: addDays(today, -29), to: today };
    case "month":
      return { from: `${y}-${m}-01`, to: today };
    case "last-month": {
      const lastDay = addDays(`${y}-${m}-01`, -1);
      return { from: `${lastDay.slice(0, 7)}-01`, to: lastDay };
    }
    case "year":
      return { from: `${y}-01-01`, to: today };
    case "all":
      return { from: null, to: today };
  }
}

export function isReportPreset(value: string): value is ReportPreset {
  return (REPORT_PRESETS as readonly string[]).includes(value);
}

export type ReportRange = {
  /** The preset these days match, or null for a custom range. */
  preset: ReportPreset | null;
  /** First day, or null for all time. */
  from: string | null;
  /** Last day (counted). */
  to: string;
  /** The URL asked for a range that can't be shown (a bad date, or only future days); the default is shown instead. */
  invalid: boolean;
};

/**
 * The report period from the URL: ?range=<preset>, or ?from=YYYY-MM-DD&to=YYYY-MM-DD (either may be
 * left out: from alone runs to today, to alone is that one day). Reversed dates are swapped, days
 * after today and before REPORT_EARLIEST_DAY are cut off. ?period= is the old name of ?range=.
 */
export function resolveReportRange(
  params: { range?: string; period?: string; from?: string; to?: string },
  now = new Date(),
): ReportRange {
  const today = wibDayKey(now);
  const asPreset = (preset: ReportPreset, invalid = false): ReportRange => ({ preset, ...presetDays(preset, today), invalid });

  const rawFrom = params.from?.trim() ?? "";
  const rawTo = params.to?.trim() ?? "";
  if (rawFrom || rawTo) {
    if ((rawFrom && !isDayKey(rawFrom)) || (rawTo && !isDayKey(rawTo))) return asPreset(DEFAULT_REPORT_PRESET, true);
    // Only a start day, and it's still to come: nothing to show.
    if (rawFrom && !rawTo && rawFrom > today) return asPreset(DEFAULT_REPORT_PRESET, true);
    let from = rawFrom || rawTo;
    let to = rawTo || today;
    if (from > to) [from, to] = [to, from];
    if (from > today) return asPreset(DEFAULT_REPORT_PRESET, true);
    if (to > today) to = today;
    if (from < REPORT_EARLIEST_DAY) from = REPORT_EARLIEST_DAY;
    if (to < from) return asPreset(DEFAULT_REPORT_PRESET, true);
    // The same days as a preset light up that preset.
    const match = REPORT_PRESETS.find((p) => {
      const d = presetDays(p, today);
      return d.from === from && d.to === to;
    });
    return { preset: match ?? null, from, to, invalid: false };
  }

  const raw = params.range ?? params.period ?? "";
  if (!raw) return asPreset(DEFAULT_REPORT_PRESET);
  return isReportPreset(raw) ? asPreset(raw) : asPreset(DEFAULT_REPORT_PRESET, true);
}

/** The createdAt filter for orders placed inside a range. */
export function rangeWhere(range: Pick<ReportRange, "from" | "to">): Prisma.OrderWhereInput {
  const lt = wibDayStart(addDays(range.to, 1));
  return { createdAt: range.from ? { gte: wibDayStart(range.from), lt } : { lt } };
}

/** Orders that count as revenue: paid, and not cancelled by the store afterwards (a refund). */
export const keptOrderWhere = {
  paymentStatus: "paid",
  fulfilmentStatus: { not: "cancelled" },
} satisfies Prisma.OrderWhereInput;

export type SeriesUnit = "day" | "week" | "month";
export type SeriesBucket = { from: string; to: string; revenue: number; orders: number };

/** Up to 45 days by day, up to 26 weeks by week (Monday to Sunday), longer by month. */
export function seriesUnit(days: number): SeriesUnit {
  return days <= 45 ? "day" : days <= 182 ? "week" : "month";
}

/** The buckets covering [from, to], each cut to the range at the edges. */
function seriesBuckets(from: string, to: string, unit: SeriesUnit): SeriesBucket[] {
  const buckets: SeriesBucket[] = [];
  let start = from;
  while (start <= to) {
    let end: string;
    if (unit === "day") end = start;
    else if (unit === "week") {
      // getUTCDay: 0 Sunday … 6 Saturday; the week ends on Sunday.
      const weekday = new Date(`${start}T00:00:00Z`).getUTCDay();
      end = addDays(start, (7 - weekday) % 7);
    } else {
      const [y, m] = start.split("-").map(Number);
      end = addDays(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`, -1);
    }
    if (end > to) end = to;
    buckets.push({ from: start, to: end, revenue: 0, orders: 0 });
    start = addDays(end, 1);
  }
  return buckets;
}

export async function getSalesReport(range: ReportRange) {
  const placed = rangeWhere(range);
  const kept: Prisma.OrderWhereInput = { ...placed, ...keptOrderWhere };

  const [statuses, closedUnpaid, itemGroups, keptOrders] = await Promise.all([
    db.order.groupBy({ by: ["paymentStatus", "fulfilmentStatus"], where: placed, _count: { _all: true } }),
    // Unpaid and cancelled: closed at the payment deadline, or cancelled by the store before payment.
    db.order.findMany({
      where: { ...placed, paymentStatus: "expired", fulfilmentStatus: "cancelled" },
      select: { paymentStatus: true, fulfilmentStatus: true, createdAt: true, updatedAt: true },
    }),
    // Grouped by unit price too, so a price change mid-period still sums to the exact revenue.
    db.orderItem.groupBy({ by: ["variantId", "unitPrice"], where: { order: kept }, _sum: { qty: true } }),
    // A small shop: every kept order of the period, a few columns each, feeds the totals, the chart and the splits.
    db.order.findMany({
      where: kept,
      orderBy: { createdAt: "asc" },
      select: {
        createdAt: true,
        total: true,
        subtotal: true,
        deliveryFee: true,
        fulfilmentMethod: true,
        payments: { where: { status: "paid" }, orderBy: { id: "desc" }, select: { status: true, method: true, provider: true } },
      },
    }),
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
  for (const s of statuses) {
    const n = s._count._all;
    if (s.paymentStatus === "expired") expired += n;
    else if (s.fulfilmentStatus === "cancelled") cancelled += n;
    else if (s.paymentStatus === "awaiting") awaiting += n;
  }
  // A store cancel also closes the payment (expired), but the payment didn't fail: count it as cancelled.
  const storeCancelled = closedUnpaid.filter(cancelledByStore).length;
  expired -= storeCancelled;
  cancelled += storeCancelled;

  // All time starts on the first kept order's day (today when there is none).
  const from = range.from ?? (keptOrders[0] ? wibDayKey(keptOrders[0].createdAt) : range.to);
  const days = daysBetween(from, range.to);
  const unit = seriesUnit(days);
  const buckets = seriesBuckets(from, range.to, unit);

  let revenue = 0;
  let itemRevenue = 0;
  let deliveryRevenue = 0;
  const fulfilment = new Map<FulfilmentMethod, { method: FulfilmentMethod; orders: number; revenue: number }>();
  const payments = new Map<PaymentMethod, { method: PaymentMethod; orders: number; revenue: number }>();
  let b = 0;
  for (const o of keptOrders) {
    revenue += o.total;
    itemRevenue += o.subtotal;
    deliveryRevenue += o.deliveryFee;
    // Orders come oldest first, so the bucket only ever moves forward.
    const day = wibDayKey(o.createdAt);
    while (b < buckets.length - 1 && day > buckets[b].to) b++;
    if (day >= buckets[b].from && day <= buckets[b].to) {
      buckets[b].revenue += o.total;
      buckets[b].orders += 1;
    }
    const f = fulfilment.get(o.fulfilmentMethod) ?? { method: o.fulfilmentMethod, orders: 0, revenue: 0 };
    f.orders += 1;
    f.revenue += o.total;
    fulfilment.set(o.fulfilmentMethod, f);
    const method = shownPayment(o.payments)?.method;
    if (method) {
      const p = payments.get(method) ?? { method, orders: 0, revenue: 0 };
      p.orders += 1;
      p.revenue += o.total;
      payments.set(method, p);
    }
  }

  const paidOrders = keptOrders.length;
  return {
    from,
    to: range.to,
    days,
    revenue,
    itemRevenue,
    deliveryRevenue,
    paidOrders,
    averageOrder: paidOrders ? Math.round(revenue / paidOrders) : 0,
    itemsSold,
    productsSold: products.size,
    awaiting,
    expired,
    cancelled,
    topProducts: [...products.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 10),
    categories: [...categories.values()].sort((a, b) => b.revenue - a.revenue),
    series: { unit, buckets },
    // Both methods always listed, delivery first, so the split reads the same in every period.
    fulfilment: (["delivery", "pickup"] as const).map((m) => fulfilment.get(m) ?? { method: m, orders: 0, revenue: 0 }),
    payments: [...payments.values()].sort((a, b) => b.orders - a.orders || b.revenue - a.revenue),
  };
}

export type SalesReport = Awaited<ReturnType<typeof getSalesReport>>;
