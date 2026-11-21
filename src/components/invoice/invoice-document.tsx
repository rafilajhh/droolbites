import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { FulfilmentMethod, PaymentMethod } from "@/generated/prisma/enums";
import { PrintButton } from "@/components/admin/print-button";
import { thClasses } from "@/components/admin/ui";
import { variantLabel } from "@/content/products";
import type { Locale } from "@/i18n/config";
import type { adminExtraMessages } from "@/i18n/messages/admin-extra";
import { cn } from "@/lib/cn";
import { formatDateTime, formatDistance, formatRupiah } from "@/lib/format";
import { paymentMethodInfo } from "@/lib/order-status";
import { orderAddress, otherRecipient } from "@/lib/orders";

type InvoiceMessages = (typeof adminExtraMessages)["en"]["invoice"];

/** What the invoice prints of an order; the admin's own query and the customer's full order both fit. */
export type InvoiceOrder = {
  orderNumber: string;
  createdAt: Date;
  customerName: string;
  email: string;
  phone: string;
  fulfilmentMethod: FulfilmentMethod;
  shippingAddress: string | null;
  shippingDistrict: string | null;
  shippingCity: string | null;
  shippingPostal: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  deliveryNote: string | null;
  deliveryDistanceM: number | null;
  subtotal: number;
  deliveryFee: number;
  items: {
    id: bigint;
    qty: number;
    unitPrice: number;
    variant: { name: string; product: { name: string; category: { slug: string } } };
  }[];
};

// A4 page, no cream background on paper. Kept here so it only applies to the invoice pages.
const printCss = "@page{size:A4;margin:14mm}@media print{html,body{background:#fff!important;color:#000!important}}";

const muted = "text-muted-foreground print:text-neutral-700";
const rule = "border-border-divider print:border-neutral-400";

/**
 * The printable invoice of one order, shared by the store's page (/admin/invoice/…) and the customer's
 * receipt (/orders/…/invoice). Each page decides what the payment block says (its status) and where
 * Back goes; the rest is the same paper.
 */
export function InvoiceDocument({
  order,
  settings,
  locale,
  t,
  title,
  numberLabel = t.number,
  back,
  paidAt,
  method,
  status,
  statusAlert,
  amount,
  serviceFee,
}: {
  order: InvoiceOrder;
  settings: { storeName: string; address: string; phone: string; email: string };
  locale: Locale;
  t: InvoiceMessages;
  /** "Invoice" for the store, "Receipt" for the customer. */
  title: string;
  /** "Invoice no." for the store, "Order no." on the customer's receipt. */
  numberLabel?: string;
  back: { href: string; label: string };
  /** The paid-on line: a WIB date-time, or why there is none. */
  paidAt: string;
  method: PaymentMethod | null;
  status: string;
  /** Crimson status (cancelled). */
  statusAlert: boolean;
  /** What the customer pays or paid, with the gateway's fee in it, and that fee. */
  amount: number;
  serviceFee: number;
}) {
  const isDelivery = order.fulfilmentMethod === "delivery";
  // Only when someone other than the billed customer receives it (Bill to already has their name and phone).
  const recipient = isDelivery ? otherRecipient(order) : null;
  const lines = order.items.map((item) => ({
    id: item.id.toString(),
    name: item.variant.product.name,
    size: variantLabel(item.variant.name, item.variant.product.category.slug, locale),
    qty: item.qty,
    unit: formatRupiah(item.unitPrice),
    total: formatRupiah(item.unitPrice * item.qty),
  }));

  return (
    <main className="flex w-full flex-1 flex-col px-4 py-6 sm:px-6 lg:py-10 print:p-0">
      <style>{printCss}</style>
      <div className="mx-auto flex w-full max-w-[210mm] flex-col gap-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={back.href}
            className="relative inline-flex w-fit items-center gap-1.5 text-sm leading-[21px] font-bold text-primary underline-offset-2 after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-[''] hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
          <PrintButton label={t.print} ariaLabel={t.printLabel} className="px-5 py-3" />
        </div>

        <article className="flex w-full flex-col gap-8 rounded-m bg-white p-5 text-foreground inset-ring-1 inset-ring-border-subtle sm:p-10 print:gap-6 print:rounded-none print:p-0 print:text-black print:inset-ring-0">
          <header className={cn("flex w-full flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between", rule)}>
            <div className="flex min-w-0 items-start gap-4">
              <Image
                src="/images/site/logo-badge.png"
                alt=""
                width={64}
                height={64}
                loading="eager"
                quality={100}
                className="size-16 shrink-0 rounded-full"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="font-display text-[22px] leading-[28px] font-bold">{settings.storeName}</p>
                <p className={cn("text-[13px] leading-5", muted)}>{settings.address}</p>
                <p className={cn("text-[13px] leading-5 break-words", muted)}>
                  {settings.phone} · {settings.email}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:items-end sm:text-right">
              <h1 className="font-display text-[34px] leading-none font-bold tracking-[-1px]">{title}</h1>
              <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[13px] leading-5 sm:justify-end">
                <dt className={muted}>{numberLabel}</dt>
                <dd className="font-mono font-semibold">{order.orderNumber}</dd>
                <dt className={muted}>{t.placed}</dt>
                <dd className="font-semibold">
                  {formatDateTime(order.createdAt, locale)} {t.wib}
                </dd>
                <dt className={muted}>{t.paid}</dt>
                <dd className="font-semibold">{paidAt}</dd>
              </dl>
            </div>
          </header>

          <div className="grid w-full gap-6 sm:grid-cols-2">
            <section className="flex min-w-0 flex-col gap-1">
              <h2 className={cn(thClasses, "print:text-neutral-700")}>{t.billTo}</h2>
              <p className="text-[15px] leading-[23px] font-bold">{order.customerName}</p>
              <p className={cn("text-sm leading-[21px] break-words", muted)}>{order.email}</p>
              <p className={cn("text-sm leading-[21px]", muted)}>{order.phone}</p>
            </section>
            <section className="flex min-w-0 flex-col gap-1">
              <h2 className={cn(thClasses, "print:text-neutral-700")}>{t.fulfilment}</h2>
              <p className="text-[15px] leading-[23px] font-bold">{isDelivery ? t.delivery : t.pickup}</p>
              <p className={cn("text-sm leading-[21px] break-words", muted)}>
                {isDelivery ? orderAddress(order) : t.pickupAt(settings.address)}
              </p>
              {recipient ? (
                <p className={cn("text-sm leading-[21px] break-words", muted)}>{t.recipient(recipient.name, recipient.phone)}</p>
              ) : null}
              {isDelivery && order.deliveryNote ? (
                <p className={cn("text-sm leading-[21px] break-words", muted)}>{t.note(order.deliveryNote)}</p>
              ) : null}
            </section>
          </div>

          <section className="flex w-full flex-col gap-3">
            <h2 className="sr-only">{t.items}</h2>
            <table className="w-full border-collapse text-sm leading-[21px]">
              <thead>
                <tr className={cn("border-b", rule)}>
                  <th scope="col" className={cn(thClasses, "py-2 pr-3 print:text-neutral-700")}>
                    {t.col.product}
                  </th>
                  <th scope="col" className={cn(thClasses, "hidden py-2 pr-3 sm:table-cell print:table-cell print:text-neutral-700")}>
                    {t.col.size}
                  </th>
                  <th scope="col" className={cn(thClasses, "hidden py-2 pr-3 text-right sm:table-cell print:table-cell print:text-neutral-700")}>
                    {t.col.qty}
                  </th>
                  <th scope="col" className={cn(thClasses, "hidden py-2 pr-3 text-right sm:table-cell print:table-cell print:text-neutral-700")}>
                    {t.col.unit}
                  </th>
                  <th scope="col" className={cn(thClasses, "py-2 text-right print:text-neutral-700")}>
                    {t.col.total}
                  </th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className={cn("border-b break-inside-avoid", rule)}>
                    <th scope="row" className="py-2.5 pr-3 text-left align-top font-semibold">
                      {line.name}
                      {/* Below sm the size, qty and unit price columns fold into this line. */}
                      <span className={cn("block text-[13px] leading-5 font-normal sm:hidden print:hidden", muted)}>
                        {line.size} · {line.qty} × {line.unit}
                      </span>
                    </th>
                    <td className="hidden py-2.5 pr-3 align-top sm:table-cell print:table-cell">{line.size}</td>
                    <td className="hidden py-2.5 pr-3 text-right align-top tabular-nums sm:table-cell print:table-cell">{line.qty}</td>
                    <td className="hidden py-2.5 pr-3 text-right align-top whitespace-nowrap tabular-nums sm:table-cell print:table-cell">
                      {line.unit}
                    </td>
                    <td className="py-2.5 text-right align-top font-semibold whitespace-nowrap tabular-nums">{line.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="ml-auto grid w-full grid-cols-[1fr_auto] gap-y-1.5 text-sm leading-[21px] break-inside-avoid sm:w-80 [&>dd]:pl-6">
              <dt className={muted}>{t.subtotal}</dt>
              <dd className="text-right tabular-nums">{formatRupiah(order.subtotal)}</dd>
              {isDelivery || order.deliveryFee > 0 ? (
                <>
                  <dt className={muted}>
                    {t.deliveryFee}
                    {order.deliveryDistanceM !== null ? ` (${formatDistance(order.deliveryDistanceM, locale)})` : ""}
                  </dt>
                  <dd className="text-right tabular-nums">{formatRupiah(order.deliveryFee)}</dd>
                </>
              ) : null}
              {serviceFee > 0 ? (
                <>
                  <dt className={muted}>{t.serviceFee}</dt>
                  <dd className="text-right tabular-nums">{formatRupiah(serviceFee)}</dd>
                </>
              ) : null}
              <dt className={cn("mt-1.5 border-t pt-2.5 text-base font-bold", rule)}>{t.total}</dt>
              <dd className={cn("mt-1.5 border-t pt-2.5 text-right font-display text-xl leading-7 font-bold tabular-nums", rule)}>
                {formatRupiah(amount)}
              </dd>
            </dl>
          </section>

          <section className="flex w-full flex-col gap-2 rounded-sm bg-background p-4 break-inside-avoid print:border print:border-neutral-400 print:bg-white">
            <h2 className={cn(thClasses, "print:text-neutral-700")}>{t.payment}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-[21px]">
              <dt className={muted}>{t.method}</dt>
              <dd className="font-semibold">{method ? paymentMethodInfo[method].name : t.noPayment}</dd>
              <dt className={muted}>{t.status}</dt>
              <dd className={cn("font-semibold", statusAlert && "text-error print:text-black")}>{status}</dd>
            </dl>
          </section>

          <p className={cn("text-center text-sm leading-[21px]", muted)}>{t.thanks}</p>
        </article>
      </div>
    </main>
  );
}
