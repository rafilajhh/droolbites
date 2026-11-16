import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CircleAlert, CircleCheck, Cookie, Hourglass, Wallet } from "lucide-react";
import { ArrowLink, buttonClasses } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { AdminMain, CellLabel, PageHead, PaneCard, paneClasses, SectionTitle, StatPane, thClasses } from "@/components/admin/ui";
import { categoryStyle, isTrayCategory } from "@/components/admin/rules";
import { categoryName } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRupiah, formatTime } from "@/lib/format";
import { ACTIVE_FULFILMENT, fulfilmentBadgeInfo, inProgressWhere, needsActionWhere, paymentStatusInfo } from "@/lib/order-status";
import { cn } from "@/lib/cn";
import { LOW_STOCK } from "@/lib/stock";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminMessages);
  return { title: t.meta.overview };
}

/** "SUNDAY, 18 OCTOBER" and the hour, both in Surabaya time. */
function jakartaNow(locale: "en" | "id", now = new Date()) {
  const parts = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { label: `${get("weekday")}, ${get("day")} ${get("month")}`.toUpperCase(), hour: Number(get("hour")) };
}

/** Low-stock sizes listed in "Your menu"; the rest are a link to the products page. */
const LOW_ROWS = 5;

const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

/** pen: Admin / Overview (a6LxRK). */
export default async function AdminOverviewPage() {
  await requireAdmin();
  const [t, locale] = await Promise.all([getMessages(adminMessages), getLocale()]);
  const o = t.overview;

  const bannerSelect = {
    orderNumber: true,
    fulfilmentStatus: true,
    createdAt: true,
    payments: { where: { status: "paid" }, orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true } },
  } as const;
  const [awaiting, paid, productsOnMenu, variantsOnMenu, newOrders, inProgress, recent, categories, lowStock, shortOrders] = await Promise.all([
    db.order.count({ where: { paymentStatus: "awaiting", fulfilmentStatus: { not: "cancelled" } } }),
    // Paid but later cancelled by the store (a refund) is not money kept.
    db.order.aggregate({
      where: { paymentStatus: "paid", fulfilmentStatus: { not: "cancelled" } },
      _sum: { total: true },
      _count: true,
    }),
    db.product.count({ where: { isAvailable: true } }),
    db.productVariant.count({ where: { product: { isAvailable: true } } }),
    // The banner leads with new orders (the same count as the sidebar badge); with none, it reminds
    // about accepted orders still on their way.
    db.order.findMany({ where: needsActionWhere, orderBy: { createdAt: "asc" }, select: bannerSelect }),
    db.order.findMany({ where: inProgressWhere, orderBy: { createdAt: "asc" }, select: bannerSelect }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { orderNumber: true, fulfilmentMethod: true, fulfilmentStatus: true, paymentStatus: true, total: true },
    }),
    db.category.findMany({
      orderBy: { id: "asc" },
      select: {
        slug: true,
        name: true,
        products: { where: { isAvailable: true }, select: { _count: { select: { variants: true } } } },
      },
    }),
    // Sizes on the menu with LOW_STOCK or fewer left (sold out first).
    db.productVariant.findMany({
      where: { stock: { not: null, lte: LOW_STOCK }, product: { isAvailable: true } },
      orderBy: [{ stock: "asc" }, { productId: "asc" }, { price: "asc" }],
      select: {
        id: true,
        name: true,
        stock: true,
        product: { select: { id: true, name: true, _count: { select: { variants: true } } } },
      },
    }),
    // Paid while a size had fewer left than ordered, and still to be baked or handed over.
    db.order.findMany({
      where: { stockShort: true, paymentStatus: "paid", fulfilmentStatus: { notIn: ["completed", "cancelled"] } },
      orderBy: { createdAt: "asc" },
      select: { orderNumber: true },
    }),
  ]);

  const now = jakartaNow(locale);
  const needsAction = newOrders.length > 0 ? newOrders : inProgress;
  const first = needsAction[0];
  const paidAt = first ? (first.payments[0]?.paidAt ?? first.createdAt) : null;
  const paidDate = paidAt && dayKey(paidAt) !== dayKey(new Date()) ? formatDate(paidAt, locale) : null;
  const single = needsAction.length === 1;

  return (
    <AdminMain className="gap-7">
      {/* The pen's 🍪 renders as an ink line drawing; an icon keeps that look instead of each OS's colour emoji. */}
      <PageHead
        eyebrow={now.label}
        title={
          <>
            {o.greeting(now.hour)}{" "}
            <Cookie className="inline-block size-[0.82em] align-[-0.1em]" strokeWidth={2.25} aria-hidden />
          </>
        }
      />

      {first && paidAt ? (
        <div className="flex w-full flex-wrap items-center gap-4 rounded-m bg-tint-mustard px-5 py-[18px]" role="status">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-highlight">
            <BellRing className="size-5 text-foreground" aria-hidden />
          </span>
          <div className="flex min-w-[200px] flex-1 flex-col">
            <p className="text-base leading-6 font-bold">
              {single ? o.alertOne[first.fulfilmentStatus as (typeof ACTIVE_FULFILMENT)[number]] : o.alertMany(needsAction.length)}
            </p>
            <p className="text-sm leading-[21px] text-muted-foreground">
              {(first.fulfilmentStatus === "pending"
                ? single
                  ? o.paidAtNew
                  : o.paidAtManyNew
                : single
                  ? o.paidAt
                  : o.paidAtMany)(first.orderNumber, formatTime(paidAt), paidDate)}
            </p>
          </div>
          <Link
            href={
              single
                ? `/admin/orders/${first.orderNumber}`
                : newOrders.length > 0
                  ? "/admin/orders?needs=action"
                  : "/admin/orders?status=paid"
            }
            className="inline-flex items-center justify-center rounded-sm bg-primary px-5 py-3 font-display text-[13px] leading-4 font-semibold tracking-[0.5px] text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {single ? (first.fulfilmentStatus === "pending" ? o.confirmOrder : o.viewOrder) : o.viewOrders}
          </Link>
        </div>
      ) : (
        <div className="flex w-full items-center gap-4 rounded-m bg-mint px-5 py-[18px]" role="status">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-white">
            <CircleCheck className="size-5 text-success" aria-hidden />
          </span>
          <div className="flex flex-1 flex-col">
            <p className="text-base leading-6 font-bold">{o.allClearTitle}</p>
            <p className="text-sm leading-[21px] text-muted-foreground">{o.allClearSub}</p>
          </div>
        </div>
      )}

      {/* Paid orders that came up short: a slim banner of their own, each order linked. */}
      {shortOrders.length > 0 ? (
        <div className="flex w-full flex-wrap items-center gap-4 rounded-m bg-tint-salmon px-5 py-[18px]" role="alert">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-white">
            <CircleAlert className="size-5 text-error" aria-hidden />
          </span>
          <div className="flex min-w-[200px] flex-1 flex-col">
            <p className="text-base leading-6 font-bold">
              {shortOrders.length === 1 ? o.shortOne(shortOrders[0].orderNumber) : o.shortMany(shortOrders.length)}
            </p>
            <p className="text-sm leading-[21px] text-muted-foreground">{o.shortSub}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {shortOrders.slice(0, 3).map(({ orderNumber }) => (
              <Link
                key={orderNumber}
                href={`/admin/orders/${orderNumber}`}
                aria-label={t.orders.viewLabel(orderNumber)}
                className="inline-flex items-center justify-center rounded-sm bg-primary px-5 py-3 font-display text-[13px] leading-4 font-semibold tracking-[0.5px] text-primary-foreground transition-colors hover:bg-primary-hover"
              >
                {shortOrders.length === 1 ? o.viewOrder : orderNumber}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* One strip for the three figures; from xl its last column lines up with "Your menu" below. */}
      <PaneCard as="div" cols="grid-cols-1 md:grid-cols-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <StatPane
          label={o.awaiting}
          icon={Hourglass}
          iconBg="bg-tint-mustard"
          value={String(awaiting)}
          sub={o.awaitingSub}
          href="/admin/orders?status=awaiting"
        />
        <StatPane
          label={o.received}
          icon={Wallet}
          iconBg="bg-mint"
          value={formatRupiah(paid._sum.total ?? 0)}
          sub={`${o.receivedSub(paid._count)} · ${o.allTime}`}
          href="/admin/reports?range=all"
        />
        <StatPane
          label={o.onMenu}
          icon={Cookie}
          iconBg="bg-tint-lavender"
          value={String(productsOnMenu)}
          sub={o.onMenuSub(variantsOnMenu)}
        />
      </PaneCard>

      {/* Recent orders and the menu in one card, split by a hairline, so both end at the same height. */}
      <PaneCard as="div" cols="grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="recent-orders-title" className={cn(paneClasses, "gap-3 p-5 md:p-6")}>
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <SectionTitle id="recent-orders-title">{o.recent}</SectionTitle>
            <ArrowLink href="/admin/orders">{o.allOrders}</ArrowLink>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm leading-[21px] text-muted-foreground">{o.noOrders}</p>
          ) : (
            <table aria-labelledby="recent-orders-title" className="w-full border-collapse max-md:block">
              <thead className="max-md:hidden">
                <tr className="shadow-[inset_0_-1px_0_var(--border-subtle)]">
                  <th scope="col" className={cn(thClasses, "py-2.5 pr-4")}>
                    {t.orders.col.order}
                  </th>
                  <th scope="col" className={cn(thClasses, "py-2.5 pr-4")}>
                    {t.orders.col.method}
                  </th>
                  <th scope="col" className={cn(thClasses, "py-2.5 pr-4")}>
                    {t.orders.col.payment}
                  </th>
                  <th scope="col" className={cn(thClasses, "py-2.5 pr-4")}>
                    {t.orders.col.status}
                  </th>
                  <th scope="col" className={cn(thClasses, "py-2.5 pr-4 text-right")}>
                    {t.orders.col.total}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-px py-2.5")}>
                    <span className="sr-only">{t.orders.col.action}</span>
                  </th>
                </tr>
              </thead>
              {/* Below md each row wraps onto two lines; cells carry sr-only labels since the header row is hidden. */}
              <tbody className="max-md:flex max-md:flex-col">
                {recent.map((order) => {
                  const status = fulfilmentBadgeInfo(order);
                  const payment = paymentStatusInfo[order.paymentStatus];
                  const unpaid = order.paymentStatus !== "paid" && order.fulfilmentStatus === "pending";
                  return (
                    <tr
                      key={order.orderNumber}
                      className="shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-2 max-md:gap-y-2 max-md:py-3.5"
                    >
                      <th
                        scope="row"
                        className="py-3.5 pr-4 text-left text-base leading-6 font-bold whitespace-nowrap max-md:order-1 max-md:grow max-md:basis-[55%] max-md:p-0"
                      >
                        {order.orderNumber}
                      </th>
                      <td className="py-3.5 pr-4 text-[15px] leading-[23px] whitespace-nowrap max-md:order-5 max-md:grow max-md:basis-[55%] max-md:p-0 max-md:text-sm max-md:leading-[21px] max-md:text-muted-foreground">
                        <CellLabel>{t.orders.col.method}</CellLabel>
                        {order.fulfilmentMethod === "delivery" ? t.common.delivery : t.common.pickup}
                      </td>
                      <td className="py-3.5 pr-4 max-md:order-3 max-md:p-0">
                        <CellLabel>{t.orders.col.payment}</CellLabel>
                        <StatusBadge tone={payment.tone} className="whitespace-nowrap">
                          {payment[locale]}
                        </StatusBadge>
                      </td>
                      <td className="py-3.5 pr-4 max-md:order-4 max-md:p-0">
                        <CellLabel>{t.orders.col.status}</CellLabel>
                        {unpaid ? (
                          <span className="text-muted-foreground" aria-label={status[locale]}>
                            —
                          </span>
                        ) : (
                          <StatusBadge tone={status.tone} className="whitespace-nowrap">
                            {status[locale]}
                          </StatusBadge>
                        )}
                      </td>
                      <td className="py-3.5 pr-4 text-right text-base leading-6 font-bold whitespace-nowrap tabular-nums max-md:order-2 max-md:grow max-md:basis-[calc(45%-0.5rem)] max-md:p-0">
                        <CellLabel>{t.orders.col.total}</CellLabel>
                        {formatRupiah(order.total)}
                      </td>
                      <td className="py-3.5 text-right max-md:order-6 max-md:ml-auto max-md:p-0">
                        <ArrowLink
                          href={`/admin/orders/${order.orderNumber}`}
                          aria-label={t.orders.viewLabel(order.orderNumber)}
                          className="after:-inset-y-3"
                        >
                          {t.common.view}
                        </ArrowLink>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="your-menu-title" className={cn(paneClasses, "gap-3 p-5 md:p-6")}>
          <SectionTitle id="your-menu-title">{o.yourMenu}</SectionTitle>
          <ul className="flex flex-col">
            {categories.map((c) => {
              const variants = c.products.reduce((sum, p) => sum + p._count.variants, 0);
              return (
                <li key={c.slug} className="flex items-center gap-2.5 py-3.5 shadow-[inset_0_-1px_0_var(--border-subtle)]">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", categoryStyle(c.slug).dot)} />
                  <span className="flex-1 text-[15px] leading-[23px] font-semibold">{categoryName(c.slug, c.name, locale)}</span>
                  <span className="text-sm leading-[21px] text-muted-foreground">
                    {isTrayCategory(c.slug) ? o.traySizes(variants) : o.flavors(c.products.length)}
                  </span>
                </li>
              );
            })}
          </ul>
          {/* Sizes running low, under the categories in the same pane: each links to its product. */}
          {lowStock.length > 0 ? (
            <div className="flex flex-col pt-2">
              <p className={cn(thClasses, "pb-1")}>{o.stockTitle}</p>
              <ul className="flex flex-col">
                {lowStock.slice(0, LOW_ROWS).map((v) => (
                  <li key={v.id.toString()} className="shadow-[inset_0_-1px_0_var(--border-subtle)]">
                    <Link
                      href={`/admin/products/${v.product.id}/edit`}
                      className="group flex items-center gap-2.5 py-2.5 text-[15px] leading-[23px]"
                    >
                      <span className="min-w-0 flex-1 truncate font-semibold group-hover:underline">
                        {v.product._count.variants > 1 ? `${v.product.name} · ${v.name}` : v.product.name}
                      </span>
                      <StatusBadge tone={v.stock === 0 ? "crimson" : "mustard"} className="whitespace-nowrap">
                        {v.stock === 0 ? t.products.soldOut : t.products.stockLeft(v.stock ?? 0)}
                      </StatusBadge>
                    </Link>
                  </li>
                ))}
              </ul>
              {lowStock.length > LOW_ROWS ? (
                <Link href="/admin/products" className="pt-2.5 text-sm leading-[21px] font-semibold text-primary hover:underline">
                  {o.stockMore(lowStock.length - LOW_ROWS)}
                </Link>
              ) : null}
            </div>
          ) : null}
          {/* From xl the pane is as tall as Recent orders: the button closes it at the bottom, level with the last order row. */}
          <Link href="/admin/products" className={buttonClasses("secondary", "mt-2 w-full xl:mt-auto")}>
            {o.manage}
          </Link>
        </section>
      </PaneCard>
    </AdminMain>
  );
}
