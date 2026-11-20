import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth";
import { containsText, db } from "@/lib/db";
import { roundedKm } from "@/lib/format";
import { fulfilmentBadgeInfo, needsActionWhere, paymentMethodInfo } from "@/lib/order-status";
import { orderPaymentInfo, payable, paymentStatusWhere } from "@/lib/orders";
import { DEMO_PROVIDER, shownPayment } from "@/lib/payments";
import { rangeWhere, resolveReportRange } from "@/lib/reports";
import { getLocale, getMessages } from "@/i18n/server";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";

const STATUSES: PaymentStatus[] = ["awaiting", "paid", "expired"];

/** "2026-11-02 14:05" (or "20261102" for the file name) in Surabaya time. */
function jakarta(date: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Asia/Jakarta",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  // Some ICU versions print midnight as "24".
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return { stamp: `${parts.year}-${parts.month}-${parts.day} ${hour}:${parts.minute}`, day: `${parts.year}${parts.month}${parts.day}` };
}

/** A value a spreadsheet must keep as typed (a phone number: its leading 0 or +62 and its spaces). */
type Text = { text: string };
const PHONE_CHARS = /^\+?[0-9][0-9 ()-]*$/;

/**
 * One CSV cell. Text that a spreadsheet would read as a formula (= + - @, or a
 * leading tab/CR) gets a ' in front; quotes, separators and line breaks are quoted.
 * A phone number made only of phone characters is written as ="…", which Excel,
 * LibreOffice and Google Sheets all show as that exact text: no lost leading 0, no
 * +62 read as a number, no ' on show. Nothing else can be in it, so it can't
 * become a formula of its own.
 */
function cell(value: string | number | Text, sep: string) {
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (PHONE_CHARS.test(value.text)) return `"=""${value.text}"""`;
    value = value.text;
  }
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return safe.includes(sep) || /["\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * GET /admin/orders/export: the orders list as CSV, with the same filters as
 * /admin/orders (q, status, needs=action) but every page. The sales report adds
 * from/to (YYYY-MM-DD, Surabaya days) for the orders placed in its period.
 */
export async function GET(request: NextRequest) {
  // Not an admin: redirects to /admin/sign-in, same as the admin pages.
  await requireAdmin();

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const needsAction = params.get("needs") === "action";
  const statusParam = params.get("status") ?? "";
  const status = !needsAction && STATUSES.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : null;

  // Same reading of the dates as the sales report (swapped, clamped to today; a bad date means no date filter).
  const range =
    params.get("from") || params.get("to")
      ? resolveReportRange({ from: params.get("from") ?? undefined, to: params.get("to") ?? undefined })
      : null;
  const dated = range && !range.invalid ? range : null;

  const where: Prisma.OrderWhereInput = {
    ...(dated ? rangeWhere(dated) : {}),
    ...(needsAction ? needsActionWhere : status ? await paymentStatusWhere(status) : {}),
    ...(q
      ? { OR: [{ orderNumber: containsText(q) }, { customerName: containsText(q) }, { email: containsText(q) }] }
      : {}),
  };

  const [orders, m, locale] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        orderNumber: true,
        createdAt: true,
        updatedAt: true,
        customerName: true,
        email: true,
        phone: true,
        fulfilmentMethod: true,
        paymentStatus: true,
        fulfilmentStatus: true,
        subtotal: true,
        deliveryFee: true,
        deliveryDistanceM: true,
        total: true,
        items: { select: { qty: true } },
        payments: { select: { method: true, status: true, chargedAmount: true, provider: true }, orderBy: { id: "desc" } },
      },
    }),
    getMessages(adminExtraMessages),
    getLocale(),
  ]);

  const t = m.export;
  const c = t.col;
  const header = [
    c.orderNumber,
    c.placedAt,
    c.customerName,
    c.email,
    c.phone,
    c.fulfilmentMethod,
    c.paymentMethod,
    c.paymentStatus,
    c.fulfilmentStatus,
    c.itemCount,
    c.subtotal,
    c.distanceKm,
    c.deliveryFee,
    c.total,
    c.serviceFee,
    c.charged,
  ];
  const rows = orders.map((o) => {
    // Same attempt the order page shows: the paid one if any, else the latest.
    const payment = shownPayment(o.payments);
    // The order total is the store's; the gateway's service fee (when the customer bears it) comes on top.
    const pay = payable(o, payment);
    return [
      o.orderNumber,
      jakarta(o.createdAt).stamp,
      o.customerName,
      o.email,
      { text: o.phone },
      o.fulfilmentMethod === "delivery" ? t.delivery : t.pickup,
      // A payment the store marked paid in demo mode (no money) says so: "QRIS (demo)".
      payment ? `${paymentMethodInfo[payment.method].name}${payment.provider === DEMO_PROVIDER ? " (demo)" : ""}` : "",
      orderPaymentInfo(o)[locale],
      fulfilmentBadgeInfo(o)[locale],
      o.items.reduce((sum, item) => sum + item.qty, 0),
      o.subtotal,
      // One decimal, with the decimal mark Excel expects for the admin's language.
      o.deliveryDistanceM === null ? "" : roundedKm(o.deliveryDistanceM).toFixed(roundedKm(o.deliveryDistanceM) >= 100 ? 0 : 1).replace(".", locale === "id" ? "," : "."),
      o.deliveryFee,
      o.total,
      pay.serviceFee,
      pay.amount,
    ];
  });

  // Excel splits a double-clicked CSV on the region's list separator: ";" in Indonesia, "," in
  // English regions. The admin's language stands in for their region. BOM so Excel reads UTF-8;
  // CRLF line ends per RFC 4180.
  const sep = locale === "id" ? ";" : ",";
  const csv = "\uFEFF" + [header, ...rows].map((row) => row.map((v) => cell(v, sep)).join(sep)).join("\r\n") + "\r\n";

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="droolbites-orders-${dated ? `${dated.from ? `${dated.from.replace(/-/g, "")}-` : ""}${dated.to.replace(/-/g, "")}` : jakarta(new Date()).day}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
