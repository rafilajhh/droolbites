import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, Info, MapPin, Printer, Store, Truck, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";
import { OrderDecision } from "@/components/admin/order-decision";
import { StatusForm } from "@/components/admin/status-form";
import { fulfilmentOptions, paymentMethodShort } from "@/components/admin/rules";
import { AdminMain, Card, SectionTitle, smallButtonClasses } from "@/components/admin/ui";
import { productImageUrl, variantLabel } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatDistance, formatItemCount, formatRupiah } from "@/lib/format";
import { cancelReasonText, fulfilmentBadgeInfo, paymentMethodInfo, paymentStatusInfo } from "@/lib/order-status";
import { payable } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[orderNumber]">): Promise<Metadata> {
  const [{ orderNumber }, t] = await Promise.all([params, getMessages(adminMessages)]);
  return { title: t.meta.order(decodeURIComponent(orderNumber)) };
}

/** A card section: its padding, with a hairline above every section after the first. */
const sectionClasses = "flex w-full min-w-0 flex-col gap-4 p-5 md:p-6 not-first:shadow-[inset_0_1px_0_var(--border-subtle)]";
const linkClasses =
  "underline decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-current";

/**
 * Admin / Order detail. Two cards that end together from xl: the order itself (items, then
 * fulfilment and customer side by side) and the store's side (status, then payment). Below xl the
 * status card comes first, since it holds the next thing to do.
 */
export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[orderNumber]">) {
  await requireAdmin();
  const { orderNumber } = await params;
  const order = await db.order.findUnique({
    where: { orderNumber: decodeURIComponent(orderNumber) },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          variant: {
            select: {
              name: true,
              product: { select: { name: true, slug: true, imageUrl: true, category: { select: { slug: true } } } },
            },
          },
        },
      },
      payments: { orderBy: { id: "desc" } },
    },
  });
  if (!order) notFound();

  const [t, locale, settings, tx] = await Promise.all([
    getMessages(adminMessages),
    getLocale(),
    getStoreSettings(),
    getMessages(adminExtraMessages),
  ]);
  const o = t.order;
  // The paid attempt if any, else the latest one (changing method creates a new attempt).
  const payment = order.payments.find((p) => p.status === "paid") ?? order.payments[0];
  const pay = payable(order, payment);
  // Gateway details only for real gateway payments (the demo provider has nothing to look up).
  const gateway = Boolean(payment?.provider && payment.provider !== "mock");
  // Money taken for a cancelled order is owed back: declined or cancelled after payment, or paid after
  // the cancel (that order stays unpaid, see markOrderPaid). Every paid attempt counts.
  const paidAttempts = order.fulfilmentStatus === "cancelled" ? order.payments.filter((p) => p.status === "paid") : [];
  const refund = paidAttempts[0];
  const refundAmount = paidAttempts.reduce((sum, p) => sum + payable(order, p).amount, 0);
  const paidLate = order.paymentStatus !== "paid";
  const fs = fulfilmentBadgeInfo(order);
  const ps = paymentStatusInfo[refund ? "paid" : order.paymentStatus];
  const isDelivery = order.fulfilmentMethod === "delivery";
  const methodLabel = isDelivery ? t.common.delivery : t.common.pickup;
  // Completed and Cancelled are final: the status shows as information, not as a disabled form.
  const closed = order.fulfilmentStatus === "completed" || order.fulfilmentStatus === "cancelled";

  const lines = order.items.map((item) => {
    const label = variantLabel(item.variant.name, item.variant.product.category.slug, locale);
    return {
      id: item.id.toString(),
      name: item.variant.product.name,
      imageUrl: productImageUrl(item.variant.product.slug, item.variant.product.imageUrl),
      meta: item.qty === 1 ? label : `${item.qty} × ${label}`,
      price: formatRupiah(item.unitPrice * item.qty),
    };
  });
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);

  // Same labels as the header badge, so an unpaid order's current option reads "Unpaid", not "New order".
  const options = fulfilmentOptions(order).map((status) => ({
    value: status,
    label: fulfilmentBadgeInfo({ paymentStatus: order.paymentStatus, fulfilmentStatus: status })[locale],
  }));
  const note =
    order.paymentStatus === "paid"
      ? { text: o.paidOn(formatDateTime(payment?.paidAt ?? order.updatedAt ?? order.createdAt, locale)), className: "bg-mint" }
      : order.paymentStatus === "awaiting"
        ? {
            text: o.awaitingNote(payment?.expiresAt ? formatDateTime(payment.expiresAt, locale) : null),
            className: "bg-tint-mustard",
          }
        : { text: o.failedNote, className: "bg-tint-salmon" };

  const address = [order.shippingAddress, [order.shippingCity, order.shippingPostal].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const subParts = [o.placed(formatDate(order.createdAt, locale)), methodLabel, payment ? paymentMethodInfo[payment.method].name : null];
  const cancelWhy =
    order.fulfilmentStatus === "cancelled" && order.cancelReason
      ? o.cancelReason(cancelReasonText(order.cancelReason, o.decision.reasons) ?? order.cancelReason)
      : null;

  const paymentRows: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    { label: o.method, value: payment ? paymentMethodShort(payment.method) : o.noPayment },
    { label: o.amount, value: formatRupiah(pay.amount) },
    ...(pay.serviceFee > 0 ? [{ label: o.serviceFee, value: formatRupiah(pay.serviceFee) }] : []),
    ...(gateway && payment?.vaNumber ? [{ label: o.paymentNumber, value: payment.vaNumber, mono: true }] : []),
    ...(gateway && payment?.reference ? [{ label: o.reference, value: payment.reference, mono: true }] : []),
    ...(payment?.transactionId ? [{ label: o.transactionId, value: payment.transactionId, mono: true }] : []),
  ];

  return (
    <AdminMain>
      <Link
        href="/admin/orders"
        className="inline-flex w-fit items-center gap-1.5 text-sm leading-[21px] font-bold text-primary underline-offset-2 hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {o.back}
      </Link>

      <div className="flex w-full flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <h1 className="font-display text-[34px] leading-none font-bold tracking-[-1px] lg:text-[44px]">
            {o.title(order.orderNumber)}
          </h1>
          <p className="text-[15px] leading-[23px] text-muted-foreground">{subParts.filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/invoice/${order.orderNumber}`}
            aria-label={tx.invoice.openInvoiceLabel(order.orderNumber)}
            className={smallButtonClasses}
          >
            <Printer className="size-3.5" aria-hidden />
            {tx.invoice.openInvoice}
          </Link>
          <StatusBadge tone={fs.tone}>{fs[locale]}</StatusBadge>
        </div>
      </div>

      {refund ? (
        <div role="alert" className="flex w-full items-start gap-4 rounded-m bg-tint-salmon px-6 py-[18px]">
          <CircleAlert className="mt-0.5 size-6 shrink-0 text-error" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-base leading-6 font-bold text-foreground">{paidLate ? o.refundTitle : o.refundCancelledTitle}</p>
            <p className="text-sm leading-[21px] text-muted-foreground">
              {(paidLate ? o.refundBody : o.refundCancelledBody)(
                formatRupiah(refundAmount),
                [...new Set(paidAttempts.map((p) => paymentMethodInfo[p.method].name))].join(" + "),
                formatDateTime(refund.paidAt ?? refund.createdAt, locale),
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card as="div" className="flex min-w-0 flex-col">
          <section aria-labelledby="order-items-title" className={sectionClasses}>
            <SectionTitle id="order-items-title">{o.items}</SectionTitle>
            <ul className="flex w-full flex-col">
              {lines.map((line) => (
                <li
                  key={line.id}
                  className="flex w-full items-center gap-4 py-3 shadow-[inset_0_-1px_0_var(--border-subtle)] first:pt-0"
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-sm bg-oat">
                    <Image src={line.imageUrl} alt="" fill sizes="48px" quality={100} className="object-cover" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-display text-base leading-5 font-semibold">{line.name}</span>
                    <span className="text-[13px] leading-5 text-muted-foreground">{line.meta}</span>
                  </span>
                  <span className="shrink-0 text-[15px] leading-[23px] font-bold tabular-nums">{line.price}</span>
                </li>
              ))}
            </ul>
            <div className="flex w-full flex-wrap items-baseline justify-between gap-2">
              <p className="text-[15px] leading-[23px] text-muted-foreground">
                {o.total(formatItemCount(itemCount, locale), order.deliveryFee > 0 ? formatRupiah(order.deliveryFee) : null)}
              </p>
              <p className="font-display text-[22px] leading-[28px] font-bold tabular-nums">{formatRupiah(order.total)}</p>
            </div>
          </section>

          {/* Fulfilment and customer side by side from md, split by a hairline that runs to the card's bottom. */}
          <div className="grid flex-1 w-full shadow-[inset_0_1px_0_var(--border-subtle)] md:grid-cols-2">
            <section
              aria-labelledby="order-fulfilment-title"
              className="flex min-w-0 flex-col gap-2 p-5 md:p-6"
            >
              <SectionTitle id="order-fulfilment-title" className="mb-1">
                {o.fulfilment}
              </SectionTitle>
              <p className="flex items-center gap-2 text-base leading-6 font-bold">
                {isDelivery ? (
                  <Truck className="size-[18px] text-primary" aria-hidden />
                ) : (
                  <Store className="size-[18px] text-primary" aria-hidden />
                )}
                {methodLabel}
              </p>
              <p className="text-sm leading-[21px] text-muted-foreground">{isDelivery ? address : o.pickupAt(settings.address)}</p>
              {isDelivery && order.deliveryDistanceM !== null ? (
                <p className="text-sm leading-[21px] font-semibold tabular-nums">
                  {o.distance(formatDistance(order.deliveryDistanceM, locale))} · {formatRupiah(order.deliveryFee)}
                </p>
              ) : null}
              {isDelivery && order.shippingLat !== null && order.shippingLng !== null ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${order.shippingLat},${order.shippingLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative mt-1 inline-flex items-center gap-1.5 self-start text-sm leading-[18px] font-semibold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
                >
                  <MapPin className="size-4" aria-hidden />
                  {o.openPin}
                </a>
              ) : null}
            </section>
            <section
              aria-labelledby="order-customer-title"
              className="flex min-w-0 flex-col gap-2 p-5 shadow-[inset_0_1px_0_var(--border-subtle)] md:p-6 md:shadow-[inset_1px_0_0_var(--border-subtle)]"
            >
              <SectionTitle id="order-customer-title" className="mb-1">
                {o.customer}
              </SectionTitle>
              <p className="flex items-center gap-2 text-base leading-6 font-bold">
                <User className="size-[18px] text-primary" aria-hidden />
                {order.customerName}
              </p>
              <p className="flex flex-col text-sm leading-[21px] break-words text-muted-foreground">
                <a href={`mailto:${order.email}`} className={cn(linkClasses, "self-start")}>
                  {order.email}
                </a>
                <a href={`tel:${order.phone.replace(/\s/g, "")}`} className={cn(linkClasses, "self-start")}>
                  {order.phone}
                </a>
              </p>
            </section>
          </div>
        </Card>

        <Card as="div" className="flex w-full flex-col max-xl:order-first">
          <section aria-labelledby="order-status-title" className={sectionClasses}>
            <SectionTitle id="order-status-title">{o.status}</SectionTitle>
            {closed ? (
              // The status badge is in the page header. No "closed on" date: updatedAt also moves on later
              // writes (a late payment, a guest order claimed at sign-in), so it isn't when the order closed.
              <div className="flex flex-col gap-3">
                {cancelWhy ? <p className="text-[15px] leading-[23px] font-semibold">{cancelWhy}</p> : null}
                <p className="text-sm leading-[21px] text-muted-foreground">{o.finalNote}</p>
                <p className={cn("flex w-full gap-2 rounded-sm p-3 text-[13px] leading-5 font-semibold", note.className)}>
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="flex-1">{note.text}</span>
                </p>
              </div>
            ) : order.paymentStatus === "paid" && order.fulfilmentStatus === "pending" ? (
              <OrderDecision orderNumber={order.orderNumber} note={note.text} paidAmount={formatRupiah(pay.amount)} />
            ) : (
              <StatusForm
                orderNumber={order.orderNumber}
                current={order.fulfilmentStatus}
                options={options}
                note={note}
                paidAmount={order.paymentStatus === "paid" ? formatRupiah(pay.amount) : undefined}
              />
            )}
          </section>
          <section aria-labelledby="order-payment-title" className={sectionClasses}>
            <div className="flex w-full items-center justify-between gap-3">
              <SectionTitle id="order-payment-title">{o.payment}</SectionTitle>
              <StatusBadge tone={ps.tone}>{ps[locale]}</StatusBadge>
            </div>
            <dl className="flex w-full flex-col gap-3 text-[15px] leading-[23px]">
              {paymentRows.map((row) => (
                <div key={row.label} className="flex w-full flex-wrap items-center justify-between gap-x-3">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className={cn("font-bold", row.mono && "font-mono text-sm font-semibold break-all")}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </Card>
      </div>
    </AdminMain>
  );
}
