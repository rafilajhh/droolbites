import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { paymentStatusInfo } from "@/lib/order-status";
import { payable } from "@/lib/orders";
import { DEMO_PROVIDER, shownPayment } from "@/lib/payments";
import { getStoreSettings } from "@/lib/settings";
import { getLocale, getMessages } from "@/i18n/server";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";

/** The order number from the URL, or null for a malformed %-sequence (a 404, not a crash). */
function decodeNumber(raw: string) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps<"/admin/invoice/[orderNumber]">): Promise<Metadata> {
  const [{ orderNumber }, t] = await Promise.all([params, getMessages(adminExtraMessages)]);
  return { title: t.invoice.metaTitle(decodeNumber(orderNumber) ?? ""), robots: { index: false, follow: false } };
}

/**
 * Printable invoice for one order. Lives outside the (panel) group so the admin
 * sidebar isn't on the page or the paper; it checks the admin itself.
 */
export default async function AdminInvoicePage({ params }: PageProps<"/admin/invoice/[orderNumber]">) {
  await requireAdmin();
  const number = decodeNumber((await params).orderNumber);
  if (!number) notFound();
  const order = await db.order.findUnique({
    where: { orderNumber: number },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          variant: { select: { name: true, product: { select: { name: true, category: { select: { slug: true } } } } } },
        },
      },
      payments: { orderBy: { id: "desc" } },
    },
  });
  if (!order) notFound();

  const [m, locale, settings] = await Promise.all([getMessages(adminExtraMessages), getLocale(), getStoreSettings()]);
  const t = m.invoice;
  // Same attempt the order page shows: the paid one if any, else the latest.
  const payment = shownPayment(order.payments);
  // Paid without money moving (skipped at checkout): nothing is owed back when it's cancelled.
  const noMoney = payment?.provider === DEMO_PROVIDER;
  const pay = payable(order, payment);
  // The payment's own time only: the order's updatedAt moves with every status change.
  const paidAt =
    order.paymentStatus !== "paid" ? t.notPaid : payment?.paidAt ? `${formatDateTime(payment.paidAt, locale)} ${t.wib}` : "—";
  // Cancelled by the store: the invoice says so, and a paid one is owed back until it's marked refunded.
  const cancelled = order.fulfilmentStatus === "cancelled";
  const status = cancelled
    ? order.paymentStatus === "paid" && !noMoney
      ? order.refundedAt
        ? t.cancelledRefunded(formatDateTime(order.refundedAt, locale))
        : t.cancelledRefund
      : t.cancelled
    : paymentStatusInfo[order.paymentStatus][locale];

  return (
    <InvoiceDocument
      order={order}
      settings={settings}
      locale={locale}
      t={t}
      title={t.title}
      back={{ href: `/admin/orders/${order.orderNumber}`, label: t.back }}
      paidAt={paidAt}
      method={payment?.method ?? null}
      status={status}
      statusAlert={cancelled}
      amount={pay.amount}
      serviceFee={pay.serviceFee}
    />
  );
}
