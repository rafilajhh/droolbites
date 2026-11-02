import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/admin/print-button";
import { thClasses } from "@/components/admin/ui";
import { variantLabel } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { formatDateTime, formatRupiah } from "@/lib/format";
import { paymentMethodInfo, paymentStatusInfo } from "@/lib/order-status";
import { formatAddress, payable } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";
import { getLocale, getMessages } from "@/i18n/server";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";

export async function generateMetadata({ params }: PageProps<"/admin/invoice/[orderNumber]">): Promise<Metadata> {
  const [{ orderNumber }, t] = await Promise.all([params, getMessages(adminExtraMessages)]);
  return { title: t.invoice.metaTitle(decodeURIComponent(orderNumber)), robots: { index: false, follow: false } };
}

// A4 page, no cream background on paper. Kept here so it only applies to this page.
const printCss = "@page{size:A4;margin:14mm}@media print{html,body{background:#fff!important;color:#000!important}}";

const muted = "text-muted-foreground print:text-neutral-700";
const rule = "border-border-divider print:border-neutral-400";

/**
 * Printable invoice for one order. Lives outside the (panel) group so the admin
 * sidebar isn't on the page or the paper; it checks the admin itself.
 */
export default async function AdminInvoicePage({ params }: PageProps<"/admin/invoice/[orderNumber]">) {
  await requireAdmin();
  const { orderNumber } = await params;
  const order = await db.order.findUnique({
    where: { orderNumber: decodeURIComponent(orderNumber) },
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
  const payment = order.payments.find((p) => p.status === "paid") ?? order.payments[0];
  const pay = payable(order, payment);
  const isDelivery = order.fulfilmentMethod === "delivery";
  const paidAt =
    order.paymentStatus === "paid" ? `${formatDateTime(payment?.paidAt ?? order.updatedAt ?? order.createdAt, locale)} ${t.wib}` : t.notPaid;

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
            href={`/admin/orders/${order.orderNumber}`}
            className="inline-flex w-fit items-center gap-1.5 text-sm leading-[21px] font-bold text-primary underline-offset-2 hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden />
            {t.back}
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
                className="size-16 shrink-0"
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
              <h1 className="font-display text-[34px] leading-none font-bold tracking-[-1px]">{t.title}</h1>
              <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-[13px] leading-5 sm:justify-end">
                <dt className={muted}>{t.number}</dt>
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
                {isDelivery
                  ? formatAddress({ address: order.shippingAddress, city: order.shippingCity, postal: order.shippingPostal })
                  : t.pickupAt(settings.address)}
              </p>
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

            <dl className="ml-auto grid w-full grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm leading-[21px] break-inside-avoid sm:w-80">
              <dt className={muted}>{t.subtotal}</dt>
              <dd className="text-right tabular-nums">{formatRupiah(order.subtotal)}</dd>
              {isDelivery || order.deliveryFee > 0 ? (
                <>
                  <dt className={muted}>{t.deliveryFee}</dt>
                  <dd className="text-right tabular-nums">{formatRupiah(order.deliveryFee)}</dd>
                </>
              ) : null}
              {pay.serviceFee > 0 ? (
                <>
                  <dt className={muted}>{t.serviceFee}</dt>
                  <dd className="text-right tabular-nums">{formatRupiah(pay.serviceFee)}</dd>
                </>
              ) : null}
              <dt className={cn("mt-1.5 border-t pt-2.5 text-base font-bold", rule)}>{t.total}</dt>
              <dd className={cn("mt-1.5 border-t pt-2.5 text-right font-display text-xl leading-7 font-bold tabular-nums", rule)}>
                {formatRupiah(pay.amount)}
              </dd>
            </dl>
          </section>

          <section className="flex w-full flex-col gap-2 rounded-sm bg-background p-4 break-inside-avoid print:border print:border-neutral-400 print:bg-white">
            <h2 className={cn(thClasses, "print:text-neutral-700")}>{t.payment}</h2>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm leading-[21px]">
              <dt className={muted}>{t.method}</dt>
              <dd className="font-semibold">{payment ? paymentMethodInfo[payment.method].name : t.noPayment}</dd>
              <dt className={muted}>{t.status}</dt>
              <dd className="font-semibold">{paymentStatusInfo[order.paymentStatus][locale]}</dd>
            </dl>
          </section>

          <p className={cn("text-center text-sm leading-[21px]", muted)}>{t.thanks}</p>
        </article>
      </div>
    </main>
  );
}
