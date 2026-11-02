import type { NextRequest } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentStatus } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fulfilmentBadgeInfo, needsActionWhere, paymentMethodInfo, paymentStatusInfo } from "@/lib/order-status";
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

/**
 * One CSV cell. Text that a spreadsheet would read as a formula (= + - @, or a
 * leading tab/CR) gets a ' in front; quotes, separators and line breaks are quoted.
 */
function cell(value: string | number, sep: string) {
  if (typeof value === "number") return String(value);
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return safe.includes(sep) || /["\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * GET /admin/orders/export: the orders list as CSV, with the same filters as
 * /admin/orders (q, status, needs=action) but every page.
 */
export async function GET(request: NextRequest) {
  // Not an admin: redirects to /admin/sign-in, same as the admin pages.
  await requireAdmin();

  const params = request.nextUrl.searchParams;
  const q = (params.get("q") ?? "").trim().slice(0, 100);
  const needsAction = params.get("needs") === "action";
  const statusParam = params.get("status") ?? "";
  const status = !needsAction && STATUSES.includes(statusParam as PaymentStatus) ? (statusParam as PaymentStatus) : null;

  const where: Prisma.OrderWhereInput = {
    ...(needsAction ? needsActionWhere : status ? { paymentStatus: status } : {}),
    ...(q
      ? { OR: [{ orderNumber: { contains: q } }, { customerName: { contains: q } }, { email: { contains: q } }] }
      : {}),
  };

  const [orders, m, locale] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: {
        orderNumber: true,
        createdAt: true,
        customerName: true,
        email: true,
        phone: true,
        fulfilmentMethod: true,
        paymentStatus: true,
        fulfilmentStatus: true,
        subtotal: true,
        deliveryFee: true,
        total: true,
        items: { select: { qty: true } },
        payments: { select: { method: true, status: true }, orderBy: { id: "desc" } },
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
    c.deliveryFee,
    c.total,
  ];
  const rows = orders.map((o) => {
    // Same attempt the order page shows: the paid one if any, else the latest.
    const payment = o.payments.find((p) => p.status === "paid") ?? o.payments[0];
    return [
      o.orderNumber,
      jakarta(o.createdAt).stamp,
      o.customerName,
      o.email,
      o.phone,
      o.fulfilmentMethod === "delivery" ? t.delivery : t.pickup,
      payment ? paymentMethodInfo[payment.method].name : "",
      paymentStatusInfo[o.paymentStatus][locale],
      fulfilmentBadgeInfo(o)[locale],
      o.items.reduce((sum, item) => sum + item.qty, 0),
      o.subtotal,
      o.deliveryFee,
      o.total,
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
      "Content-Disposition": `attachment; filename="droolbites-orders-${jakarta(new Date()).day}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
