import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InvoiceDocument } from "@/components/invoice/invoice-document";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { getOrderForViewer, payable, withOrderToken } from "@/lib/orders";
import { orderPageMetadata } from "@/lib/order-metadata";
import { DEMO_PROVIDER } from "@/lib/payments/demo";
import { getStoreSettings } from "@/lib/settings";
import { getLocale, getMessages } from "@/i18n/server";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";

export async function generateMetadata({ params, searchParams }: PageProps<"/orders/[orderNumber]/invoice">): Promise<Metadata> {
  const { orderNumber } = await params;
  // An unpaid order has no receipt (the page is a 404), so it gets the 404's title too.
  const paid = (await db.order.findUnique({ where: { orderNumber }, select: { paymentStatus: true } }))?.paymentStatus === "paid";
  if (!paid) return { title: (await getMessages(notFoundMessages)).metaTitle, robots: { index: false } };
  return orderPageMetadata(orderNumber, (await searchParams).t, async () =>
    (await getMessages(adminExtraMessages)).invoice.receiptMetaTitle(orderNumber),
  );
}

/**
 * The customer's printable receipt for a paid order: the store's invoice paper (InvoiceDocument) without
 * the store's extras (no gateway ids). Same access as the order page (owner, the browser
 * that placed it, or the email link's ?t=). Outside the (shop) group so the site header and footer
 * aren't on the paper. An unpaid order has no receipt yet: 404.
 */
export default async function OrderReceiptPage({ params, searchParams }: PageProps<"/orders/[orderNumber]/invoice">) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  const order = await getOrderForViewer(orderNumber, token);
  if (!order || order.paymentStatus !== "paid") notFound();

  const [m, locale, settings] = await Promise.all([
    getMessages(adminExtraMessages),
    getLocale(),
    getStoreSettings(),
  ]);
  const t = m.invoice;
  const payment = order.payments.find((p) => p.status === "paid") ?? null;
  const pay = payable(order, payment);
  // A demo payment moved no money, so a cancelled demo order owes nothing back (the customer sees no "demo").
  const refundOwed = order.payments.some((p) => p.status === "paid" && p.provider !== DEMO_PROVIDER);
  const cancelled = order.fulfilmentStatus === "cancelled";
  const status = cancelled
    ? refundOwed
      ? order.refundedAt
        ? t.cancelledRefunded(formatDateTime(order.refundedAt, locale))
        : t.receiptRefundPending
      : t.cancelled
    : t.receiptPaid;

  return (
    <InvoiceDocument
      order={order}
      settings={settings}
      locale={locale}
      t={t}
      title={t.receiptTitle}
      numberLabel={t.receiptNumber}
      back={{ href: withOrderToken(`/orders/${order.orderNumber}`, token), label: t.back }}
      paidAt={payment?.paidAt ? `${formatDateTime(payment.paidAt, locale)} ${t.wib}` : "—"}
      method={payment?.method ?? null}
      status={status}
      statusAlert={cancelled}
      amount={pay.amount}
      serviceFee={pay.serviceFee}
    />
  );
}
