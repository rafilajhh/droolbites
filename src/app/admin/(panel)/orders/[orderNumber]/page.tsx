import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, CircleCheck, Info, MapPin, Printer, Store, Truck, User } from "lucide-react";
import { Badge } from "@/components/ui/badges";
import { MarkRefunded } from "@/components/admin/mark-refunded";
import { OrderDecision } from "@/components/admin/order-decision";
import { StatusForm } from "@/components/admin/status-form";
import { fulfilmentOptions, paymentMethodShort } from "@/components/admin/rules";
import { AdminMain, Card, SectionTitle } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/button";
import { productImageUrl, variantLabel } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatDistance, formatItemCount, formatRupiah } from "@/lib/format";
import { cancelReasonText, fulfilmentBadgeInfo, notPaidInfo, paymentMethodInfo, paymentStatusInfo, refundedInfo } from "@/lib/order-status";
import { cancelledByCustomer, cancelledByStore, orderAddress, otherRecipient, payable } from "@/lib/orders";
import { DEMO_PROVIDER, shownPayment } from "@/lib/payments";
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
/** A label / value row in the Fulfilment list: label above the value on phones, beside it from sm. */
const rowClasses =
  "grid w-full gap-x-6 gap-y-0.5 py-3 text-[15px] leading-[23px] shadow-[inset_0_-1px_0_var(--border-subtle)] first:pt-0 last:pb-0 last:shadow-none sm:grid-cols-[160px_minmax(0,1fr)]";
const dtClasses = "text-muted-foreground";
const linkClasses =
  "relative underline decoration-muted-foreground/40 underline-offset-[3px] transition-colors after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] hover:text-foreground hover:decoration-current";

/**
 * Admin / Order detail. From xl two columns that end near each other: what was ordered and where it
 * goes (items, then fulfilment as label / value rows), and beside it, sticky, who and how (status, payment,
 * customer). Below xl the side card comes first, since it holds the next thing to do.
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
  // The paid attempt if any (real money first), else the latest one (changing method creates a new attempt).
  const payment = shownPayment(order.payments);
  const pay = payable(order, payment);
  // Gateway details only for real gateway payments (the mock provider and a skipped payment have nothing to look up).
  const gateway = Boolean(payment?.provider && payment.provider !== "mock" && payment.provider !== DEMO_PROVIDER);
  // Paid without money moving (skipped at checkout): shown like any paid order, but nothing is ever owed back.
  const noMoney = payment?.provider === DEMO_PROVIDER;
  // Money taken for a cancelled order is owed back: declined or cancelled after payment, or paid after
  // the cancel (that order stays unpaid, see markOrderPaid). Every paid attempt counts.
  // A payment that moved no money is never owed back.
  const paidAttempts =
    order.fulfilmentStatus === "cancelled" ? order.payments.filter((p) => p.status === "paid" && p.provider !== DEMO_PROVIDER) : [];
  const refund = paidAttempts[0];
  const refundAmount = paidAttempts.reduce((sum, p) => sum + payable(order, p).amount, 0);
  const paidLate = order.paymentStatus !== "paid";
  const fs = fulfilmentBadgeInfo(order);
  // Cancelled from the admin before any payment arrived: the payment didn't fail, it was never made.
  const storeCancelledUnpaid = !refund && order.paymentStatus !== "paid" && cancelledByStore(order);
  const ps = order.refundedAt ? refundedInfo : storeCancelledUnpaid ? notPaidInfo : paymentStatusInfo[refund ? "paid" : order.paymentStatus];
  const isDelivery = order.fulfilmentMethod === "delivery";
  const methodLabel = isDelivery ? t.common.delivery : t.common.pickup;
  // Completed and Cancelled are final: the status shows as information, not as a disabled form.
  const closed = order.fulfilmentStatus === "completed" || order.fulfilmentStatus === "cancelled";

  // Paid while a size had fewer left than ordered (stock stopped at 0): warn until the order is closed.
  const stockShort = order.stockShort && !closed;
  const lines = order.items.map((item) => {
    const label = variantLabel(item.variant.name, item.variant.product.category.slug, locale);
    const short = stockShort && item.stockTaken !== null && item.stockTaken < item.qty;
    return {
      id: item.id.toString(),
      name: item.variant.product.name,
      imageUrl: productImageUrl(item.variant.product.slug, item.variant.product.imageUrl),
      meta: item.qty === 1 ? label : `${item.qty} × ${label}`,
      short: short ? o.shortItem(item.stockTaken ?? 0, item.qty) : null,
      price: formatRupiah(item.unitPrice * item.qty),
    };
  });
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);

  // Same labels as the header badge, so an unpaid order's current option reads "Unpaid", not "New order".
  const options = fulfilmentOptions(order).map((status) => ({
    value: status,
    label: fulfilmentBadgeInfo({ paymentStatus: order.paymentStatus, fulfilmentStatus: status })[locale],
  }));
  // Why a closed, unpaid order never reached the kitchen (a paid one says it in the refund alert or needs nothing).
  const closedNote =
    closed && order.paymentStatus !== "paid" && !refund ? (storeCancelledUnpaid ? (cancelledByCustomer(order) ? o.customerCancelledNote : o.cancelledUnpaidNote) : o.expiredNote) : null;

  const address = orderAddress(order);
  const recipient = isDelivery ? otherRecipient(order) : null;
  const subParts = [o.placed(formatDate(order.createdAt, locale)), methodLabel, payment ? paymentMethodInfo[payment.method].name : null];
  // What happened when, oldest first; steps without a time (orders from before it was recorded) are left out.
  const tl = o.timeline;
  const firstPaid = order.payments.filter((p) => p.status === "paid").at(-1);
  const expiredUnpaid = order.paymentStatus === "expired" && !cancelledByStore(order);
  const steps: [string, Date | null | undefined][] = [
    [tl.placed, order.createdAt],
    [tl.paid, firstPaid?.paidAt],
    [tl.accepted, order.acceptedAt],
    [isDelivery ? tl.out : tl.ready, order.handedOffAt],
    [tl.completed, order.completedAt],
    [expiredUnpaid ? tl.expired : tl.cancelled, order.cancelledAt],
    [tl.refunded, order.refundedAt],
  ];
  const timeline = steps
    .filter((entry): entry is [string, Date] => entry[1] instanceof Date)
    .toSorted((a, b) => a[1].getTime() - b[1].getTime());

  const cancelWhy =
    order.fulfilmentStatus === "cancelled" && order.cancelReason
      ? o.cancelReason(cancelReasonText(order.cancelReason, o.decision.reasons) ?? order.cancelReason)
      : null;

  const paymentRows: { label: string; value: React.ReactNode; mono?: boolean }[] = [
    {
      label: o.method,
      value: payment ? paymentMethodShort(payment.method) : o.noPayment,
    },
    { label: o.amount, value: formatRupiah(pay.amount) },
    // The part of that amount that is the gateway's fee, right under it.
    ...(pay.serviceFee > 0 ? [{ label: o.serviceFee, value: formatRupiah(pay.serviceFee) }] : []),
    // The payment's times live here, once: when it was paid, or until when it can still be paid.
    ...(order.paymentStatus === "paid" && payment?.paidAt
      ? [{ label: o.paidOn, value: `${formatDateTime(payment.paidAt, locale)} ${t.common.wib}` }]
      : order.paymentStatus === "awaiting" && payment?.expiresAt
        ? [{ label: o.payBefore, value: `${formatDateTime(payment.expiresAt, locale)} ${t.common.wib}` }]
        : []),
    ...(gateway && payment?.vaNumber ? [{ label: o.paymentNumber, value: payment.vaNumber, mono: true }] : []),
    ...(gateway && payment?.reference ? [{ label: o.reference, value: payment.reference, mono: true }] : []),
    ...(payment?.transactionId ? [{ label: o.transactionId, value: payment.transactionId, mono: true }] : []),
  ];

  return (
    <AdminMain>
      <Link
        href="/admin/orders"
        className="relative inline-flex w-fit items-center gap-1.5 text-sm leading-[21px] font-bold text-primary underline-offset-2 after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-[''] hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {o.back}
      </Link>

      <div className="flex w-full flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          {/* The status badge beside the title, as on the customer's order page. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="font-display text-[34px] leading-none font-bold tracking-[-1px] lg:text-[44px]">
              {o.title(order.orderNumber)}
            </h1>
            <Badge tone={fs.tone}>{fs[locale]}</Badge>
          </div>
          <p className="text-[15px] leading-[23px] text-muted-foreground">{subParts.filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/invoice/${order.orderNumber}`}
            aria-label={tx.invoice.openInvoiceLabel(order.orderNumber)}
            className={buttonClasses("secondary", "min-h-11 px-5 py-3")}
          >
            <Printer className="size-[18px]" aria-hidden />
            {tx.invoice.openInvoice}
          </Link>
        </div>
      </div>

      {refund && order.refundedAt ? (
        // Marked refunded: no longer something to do, just what happened.
        <p className="flex w-full items-start gap-2.5 text-[15px] leading-[23px] text-muted-foreground">
          <CircleCheck className="mt-0.5 size-[18px] shrink-0 text-success" aria-hidden />
          <span>
            {o.refund.done(formatRupiah(refundAmount), formatDateTime(order.refundedAt, locale))}
            {order.refundNote ? <span className="text-foreground"> {order.refundNote}</span> : null}
          </span>
        </p>
      ) : refund ? (
        <div role="alert" className="flex w-full flex-wrap items-start gap-4 rounded-m bg-tint-salmon px-6 py-[18px]">
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
          <div className="w-full pl-10 sm:w-auto sm:pl-0">
            <MarkRefunded orderNumber={order.orderNumber} amount={formatRupiah(refundAmount)} />
          </div>
        </div>
      ) : null}

      {stockShort ? (
        <div role="alert" className="flex w-full items-start gap-4 rounded-m bg-tint-salmon px-6 py-[18px]">
          <CircleAlert className="mt-0.5 size-6 shrink-0 text-error" aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-base leading-6 font-bold text-foreground">{o.shortTitle}</p>
            <p className="text-sm leading-[21px] text-muted-foreground">{o.shortBody}</p>
          </div>
        </div>
      ) : null}

      <div className="grid w-full grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Items, fulfilment and the customer here; status and payment in the sticky side card. Neither
            stretches to the other, so no card ends in an empty white slab. */}
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
                    {line.short ? <span className="text-[13px] leading-5 font-semibold text-error">{line.short}</span> : null}
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

          {/* Fulfilment as label / value rows over the card's full width, so it never leaves a half-empty
              pane whatever the order holds. Optional facts (recipient, courier note, distance, pin) only add rows. */}
          <section aria-labelledby="order-fulfilment-title" className={sectionClasses}>
            <SectionTitle id="order-fulfilment-title">{o.fulfilment}</SectionTitle>
            <dl className="flex w-full flex-col">
              <div className={rowClasses}>
                <dt className={dtClasses}>{o.method}</dt>
                <dd className="flex items-center gap-2 font-bold">
                  {isDelivery ? (
                    <Truck className="size-[18px] shrink-0 text-primary" aria-hidden />
                  ) : (
                    <Store className="size-[18px] shrink-0 text-primary" aria-hidden />
                  )}
                  {methodLabel}
                </dd>
              </div>
              <div className={rowClasses}>
                <dt className={dtClasses}>{isDelivery ? o.deliverTo : o.pickupFrom}</dt>
                <dd className="flex flex-col items-start gap-1.5 break-words">
                  {isDelivery ? address : settings.address}
                  {isDelivery && order.shippingLat !== null && order.shippingLng !== null ? (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${order.shippingLat},${order.shippingLng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative inline-flex items-center gap-1.5 text-sm leading-[18px] font-semibold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
                    >
                      <MapPin className="size-4" aria-hidden />
                      {o.openPin}
                    </a>
                  ) : null}
                </dd>
              </div>
              {recipient ? (
                <div className={rowClasses}>
                  <dt className={dtClasses}>{o.recipientLabel}</dt>
                  <dd className="break-words">
                    {recipient.name}
                    {" · "}
                    <a href={`tel:${recipient.phone.replace(/\s/g, "")}`} className={linkClasses}>
                      {recipient.phone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {isDelivery && order.deliveryNote ? (
                <div className={rowClasses}>
                  <dt className={dtClasses}>{o.courierNote}</dt>
                  <dd className="self-start rounded-sm bg-tint-mustard px-3 py-1.5 break-words">{order.deliveryNote}</dd>
                </div>
              ) : null}
              {isDelivery && order.deliveryDistanceM !== null ? (
                <div className={rowClasses}>
                  <dt className={dtClasses}>{o.distanceLabel}</dt>
                  <dd className="tabular-nums">
                    {o.distance(formatDistance(order.deliveryDistanceM, locale))} · <span className="font-bold">{formatRupiah(order.deliveryFee)}</span>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
          <section aria-labelledby="order-customer-title" className={sectionClasses}>
            <SectionTitle id="order-customer-title">{o.customer}</SectionTitle>
            <dl className="flex w-full flex-col">
              <div className={rowClasses}>
                <dt className={dtClasses}>{o.contactName}</dt>
                <dd className="flex min-w-0 items-center gap-2 font-bold break-words">
                  <User className="size-[18px] shrink-0 text-primary" aria-hidden />
                  {order.customerName}
                </dd>
              </div>
              <div className={rowClasses}>
                <dt className={dtClasses}>{o.contactEmail}</dt>
                <dd className="min-w-0 [overflow-wrap:anywhere]">
                  <a href={`mailto:${order.email}`} className={linkClasses}>
                    {order.email}
                  </a>
                </dd>
              </div>
              <div className={rowClasses}>
                <dt className={dtClasses}>{o.contactPhone}</dt>
                <dd>
                  <a href={`tel:${order.phone.replace(/\s/g, "")}`} className={linkClasses}>
                    {order.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </section>
          <section aria-labelledby="order-timeline-title" className={sectionClasses}>
            <SectionTitle id="order-timeline-title">{tl.title}</SectionTitle>
            <ol className="flex w-full flex-col">
              {timeline.map(([label, at]) => (
                <li key={label} className={rowClasses}>
                  <span className={dtClasses}>{label}</span>
                  <time dateTime={at.toISOString()} className="tabular-nums">
                    {formatDateTime(at, locale)} {t.common.wib}
                  </time>
                </li>
              ))}
            </ol>
          </section>
        </Card>

        {/* From md to xl the side card spans the page with status and payment side by side. */}
        <Card as="div" className="flex w-full flex-col max-xl:order-first md:max-xl:grid md:max-xl:grid-cols-2 xl:sticky xl:top-6">
          <section aria-labelledby="order-status-title" className={sectionClasses}>
            <SectionTitle id="order-status-title">{o.status}</SectionTitle>
            {closed ? (
              // The status badge is in the page header. No "closed on" date: updatedAt also moves on later
              // writes (a late payment, a guest order claimed at sign-in), so it isn't when the order closed.
              <div className="flex flex-col gap-3">
                {cancelWhy ? <p className="text-[15px] leading-[23px] font-semibold">{cancelWhy}</p> : null}
                <p className="text-sm leading-[21px] text-muted-foreground">{o.finalNote}</p>
                {closedNote ? (
                  <p className="flex w-full gap-2 rounded-sm bg-tint-salmon p-3 text-[13px] leading-5 font-semibold">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span className="flex-1">{closedNote}</span>
                  </p>
                ) : null}
              </div>
            ) : order.paymentStatus === "paid" && order.fulfilmentStatus === "pending" ? (
              <OrderDecision orderNumber={order.orderNumber} paidAmount={noMoney ? null : formatRupiah(pay.amount)} />
            ) : (
              <StatusForm
                orderNumber={order.orderNumber}
                current={order.fulfilmentStatus}
                options={options}
                // Unpaid: there is nothing to move along yet, only the cancel.
                cancelOnly={
                  order.paymentStatus !== "paid"
                    ? { hint: order.paymentStatus === "awaiting" ? o.unpaidHint : o.failedNote }
                    : undefined
                }
                paidAmount={order.paymentStatus === "paid" && !noMoney ? formatRupiah(pay.amount) : undefined}
                paid={order.paymentStatus === "paid"}
              />
            )}
          </section>
          <section aria-labelledby="order-payment-title" className={cn(sectionClasses, "md:max-xl:shadow-[inset_1px_0_0_var(--border-subtle)]")}>
            <div className="flex w-full items-center justify-between gap-3">
              <SectionTitle id="order-payment-title">{o.payment}</SectionTitle>
              <Badge tone={ps.tone}>{ps[locale]}</Badge>
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
