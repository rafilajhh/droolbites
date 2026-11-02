import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, Printer, Store, Truck, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/badges";
import { StatusForm } from "@/components/admin/status-form";
import { fulfilmentOptions, paymentMethodShort } from "@/components/admin/rules";
import { AdminMain, Card, smallButtonClasses } from "@/components/admin/ui";
import { variantLabel } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatDateTime, formatItemCount, formatRupiah } from "@/lib/format";
import { fulfilmentBadgeInfo, paymentMethodInfo, paymentStatusInfo } from "@/lib/order-status";
import { payable } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";

export async function generateMetadata({ params }: PageProps<"/admin/orders/[orderNumber]">): Promise<Metadata> {
  const [{ orderNumber }, t] = await Promise.all([params, getMessages(adminMessages)]);
  return { title: t.meta.order(decodeURIComponent(orderNumber)) };
}

/** pen: Admin / Order detail (FHhpk) with the fulfilment dropdown state (IPL0N). */
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
              product: { select: { name: true, imageUrl: true, category: { select: { slug: true } } } },
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
  // Money that arrived after the order was cancelled: the order stays cancelled and unpaid (see markOrderPaid).
  const refund =
    order.fulfilmentStatus === "cancelled" && order.paymentStatus !== "paid" ? order.payments.find((p) => p.status === "paid") : undefined;
  const fs = fulfilmentBadgeInfo(order);
  const ps = paymentStatusInfo[refund ? "paid" : order.paymentStatus];
  const isDelivery = order.fulfilmentMethod === "delivery";
  const methodLabel = isDelivery ? t.common.delivery : t.common.pickup;

  const lines = order.items.map((item) => {
    const label = variantLabel(item.variant.name, item.variant.product.category.slug, locale);
    return {
      id: item.id.toString(),
      name: item.variant.product.name,
      imageUrl: item.variant.product.imageUrl,
      meta: item.qty === 1 ? label : `${item.qty} × ${label}`,
      price: formatRupiah(item.unitPrice * item.qty),
    };
  });
  const half = Math.ceil(lines.length / 2);
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
            <p className="text-base leading-6 font-bold text-foreground">{o.refundTitle}</p>
            <p className="text-sm leading-[21px] text-muted-foreground">
              {o.refundBody(
                formatRupiah(payable(order, refund).amount),
                paymentMethodInfo[refund.method].name,
                formatDateTime(refund.paidAt ?? refund.createdAt, locale),
              )}
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex w-full flex-col gap-5 xl:flex-row xl:items-start">
        {/* Stacked (<xl) the columns dissolve so the status card can lead; xl keeps the pen's two columns. */}
        <div className="flex min-w-0 flex-1 flex-col gap-5 max-xl:contents">
          <Card className="flex w-full flex-col gap-3 p-6">
            <h2 className="font-display text-[22px] leading-[33px] font-bold">{o.items}</h2>
            <div className="flex w-full flex-col gap-3 md:flex-row md:gap-6">
              {[lines.slice(0, half), lines.slice(half)].map((col, i) => (
                <ul key={i} className="flex min-w-0 flex-1 flex-col gap-3">
                  {col.map((line) => (
                    <li key={line.id} className="flex w-full items-center gap-4">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-sm bg-oat">
                        {line.imageUrl ? (
                          <Image src={line.imageUrl} alt="" fill sizes="44px" quality={100} className="object-cover" />
                        ) : null}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="font-display text-[15px] leading-[19px] font-semibold">{line.name}</span>
                        <span className="text-[13px] leading-5 text-muted-foreground">{line.meta}</span>
                      </span>
                      <span className="shrink-0 text-sm leading-[21px] font-bold">{line.price}</span>
                    </li>
                  ))}
                </ul>
              ))}
            </div>
            <div className="flex w-full flex-wrap items-start justify-between gap-2 pt-3 shadow-[inset_0_1px_0_var(--border-subtle)]">
              <p className="text-[15px] leading-[23px] text-muted-foreground">
                {o.total(
                  formatItemCount(itemCount, locale),
                  order.deliveryFee > 0 ? formatRupiah(order.deliveryFee) : null,
                )}
              </p>
              <p className="font-display text-[22px] leading-[33px] font-bold">{formatRupiah(order.total)}</p>
            </div>
          </Card>

          <div className="flex w-full flex-col gap-5 md:flex-row">
            <Card className="flex min-h-[122px] flex-1 flex-col gap-2 p-6">
              <h2 className="sr-only">{o.fulfilment}</h2>
              <p className="flex items-center gap-2 text-base leading-6 font-bold">
                {isDelivery ? <Truck className="size-[18px] text-primary" aria-hidden /> : <Store className="size-[18px] text-primary" aria-hidden />}
                {methodLabel}
              </p>
              <p className="text-sm leading-[21px] text-muted-foreground">
                {isDelivery ? address : o.pickupAt(settings.address)}
              </p>
            </Card>
            <Card className="flex min-h-[122px] min-w-0 flex-1 flex-col gap-2 p-6">
              <h2 className="sr-only">{o.customer}</h2>
              <p className="flex items-center gap-2 text-base leading-6 font-bold">
                <User className="size-[18px] text-primary" aria-hidden />
                {order.customerName}
              </p>
              <p className="text-sm leading-[21px] break-words text-muted-foreground">
                <a href={`mailto:${order.email}`} className="underline decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-current">
                  {order.email}
                </a>
                {" · "}
                <a href={`tel:${order.phone.replace(/\s/g, "")}`} className="underline decoration-muted-foreground/40 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-current">
                  {order.phone}
                </a>
              </p>
            </Card>
          </div>
        </div>

        <div className="flex w-full flex-col gap-5 max-xl:contents xl:w-[360px] xl:shrink-0">
          <Card className="flex w-full flex-col gap-4 p-6 max-xl:order-first">
            <h2 className="font-display text-xl leading-[30px] font-bold">{o.status}</h2>
            <StatusForm
              orderNumber={order.orderNumber}
              current={order.fulfilmentStatus}
              options={options}
              note={note}
              paidAmount={order.paymentStatus === "paid" ? formatRupiah(pay.amount) : undefined}
            />
          </Card>
          <Card className="flex w-full flex-col gap-4 p-6">
            <div className="flex w-full items-center justify-between gap-3">
              <h2 className="font-display text-xl leading-[30px] font-bold">{o.payment}</h2>
              <StatusBadge tone={ps.tone}>{ps[locale]}</StatusBadge>
            </div>
            <dl className="flex w-full flex-col gap-4 text-[15px] leading-[23px]">
              <div className="flex w-full items-center justify-between gap-3">
                <dt className="text-muted-foreground">{o.method}</dt>
                <dd className="font-bold">{payment ? paymentMethodShort(payment.method) : o.noPayment}</dd>
              </div>
              <div className="flex w-full items-center justify-between gap-3">
                <dt className="text-muted-foreground">{o.amount}</dt>
                <dd className="font-bold">{formatRupiah(pay.amount)}</dd>
              </div>
              {pay.serviceFee > 0 ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{o.serviceFee}</dt>
                  <dd className="font-bold">{formatRupiah(pay.serviceFee)}</dd>
                </div>
              ) : null}
              {gateway && payment?.vaNumber ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{o.paymentNumber}</dt>
                  <dd className="font-mono text-sm font-semibold">{payment.vaNumber}</dd>
                </div>
              ) : null}
              {gateway && payment?.reference ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <dt className="text-muted-foreground">{o.reference}</dt>
                  <dd className="font-mono text-sm font-semibold">{payment.reference}</dd>
                </div>
              ) : null}
              {payment?.transactionId ? (
                <div className="flex w-full flex-wrap items-center justify-between gap-x-3">
                  <dt className="text-muted-foreground">{o.transactionId}</dt>
                  <dd className="font-mono text-sm font-semibold break-all">{payment.transactionId}</dd>
                </div>
              ) : null}
            </dl>
          </Card>
        </div>
      </div>
    </AdminMain>
  );
}
