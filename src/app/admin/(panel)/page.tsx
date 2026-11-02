import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, CircleCheck, Cookie, Hourglass, Wallet } from "lucide-react";
import { ArrowLink, buttonClasses } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badges";
import { AdminMain, Card, CellLabel, mobileCardRowClasses, PageHead, thClasses } from "@/components/admin/ui";
import { categoryStyle, isTrayCategory } from "@/components/admin/rules";
import { categoryName } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate, formatRupiah, formatTime } from "@/lib/format";
import { ACTIVE_FULFILMENT, fulfilmentBadgeInfo, needsActionWhere, paymentStatusInfo } from "@/lib/order-status";
import { cn } from "@/lib/cn";
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

const dayKey = (date: Date) => date.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

/** pen: Admin / Overview (a6LxRK). */
export default async function AdminOverviewPage() {
  await requireAdmin();
  const [t, locale] = await Promise.all([getMessages(adminMessages), getLocale()]);
  const o = t.overview;

  const [awaiting, paid, productsOnMenu, variantsOnMenu, needsAction, recent, categories] = await Promise.all([
    db.order.count({ where: { paymentStatus: "awaiting", fulfilmentStatus: { not: "cancelled" } } }),
    // Paid but later cancelled by the store (a refund) is not money kept.
    db.order.aggregate({
      where: { paymentStatus: "paid", fulfilmentStatus: { not: "cancelled" } },
      _sum: { total: true },
      _count: true,
    }),
    db.product.count({ where: { isAvailable: true } }),
    db.productVariant.count({ where: { product: { isAvailable: true } } }),
    db.order.findMany({
      where: needsActionWhere,
      orderBy: { createdAt: "asc" },
      select: {
        orderNumber: true,
        fulfilmentStatus: true,
        createdAt: true,
        payments: { where: { status: "paid" }, orderBy: { paidAt: "desc" }, take: 1, select: { paidAt: true } },
      },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
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
  ]);

  const now = jakartaNow(locale);
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
              {(single ? (first.fulfilmentStatus === "pending" ? o.paidAtNew : o.paidAt) : o.paidAtMany)(first.orderNumber, formatTime(paidAt), paidDate)}
            </p>
          </div>
          <Link
            href={single ? `/admin/orders/${first.orderNumber}` : "/admin/orders?needs=action"}
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

      <div className="grid w-full grid-cols-1 overflow-hidden max-md:rounded-m max-md:bg-white max-md:inset-ring-1 max-md:inset-ring-border-subtle md:grid-cols-3 md:gap-5">
        <Kpi
          label={o.awaiting}
          icon={Hourglass}
          iconBg="bg-tint-mustard"
          value={String(awaiting)}
          sub={o.awaitingSub}
          href="/admin/orders?status=awaiting"
        />
        <Kpi
          label={o.received}
          icon={Wallet}
          iconBg="bg-mint"
          value={formatRupiah(paid._sum.total ?? 0)}
          sub={`${o.receivedSub(paid._count)} · ${o.allTime}`}
          href="/admin/reports"
        />
        <Kpi
          label={o.onMenu}
          icon={Cookie}
          iconBg="bg-tint-lavender"
          value={String(productsOnMenu)}
          sub={o.onMenuSub(variantsOnMenu)}
        />
      </div>

      <div className="flex w-full flex-col gap-5 xl:flex-row">
        <Card className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex w-full flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-[22px] leading-[33px] font-bold">{o.recent}</h2>
            <ArrowLink href="/admin/orders">{o.allOrders}</ArrowLink>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm leading-[21px] text-muted-foreground">{o.noOrders}</p>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <table
                aria-label={o.recent}
                className="w-full border-separate border-spacing-x-0 border-spacing-y-4 max-md:block md:-my-4 md:min-w-[640px]"
              >
                <thead className="max-md:hidden">
                  <tr>
                    <th scope="col" className={cn(thClasses, "w-[102px] rounded-l-lg bg-background py-2.5 pl-3")}>
                      {t.orders.col.order}
                    </th>
                    <th scope="col" className={cn(thClasses, "w-[140px] bg-background py-2.5 pr-3")}>
                      {t.orders.col.method}
                    </th>
                    <th scope="col" className={cn(thClasses, "w-[90px] bg-background py-2.5 pr-3")}>
                      {t.orders.col.payment}
                    </th>
                    <th scope="col" className={cn(thClasses, "w-[130px] bg-background py-2.5 pr-3")}>
                      {t.orders.col.status}
                    </th>
                    <th scope="col" className={cn(thClasses, "bg-background py-2.5 pr-3")}>
                      {t.orders.col.total}
                    </th>
                    <th scope="col" className={cn(thClasses, "w-[82px] rounded-r-lg bg-background py-2.5 pr-3")}>
                      <span className="sr-only">{t.orders.col.action}</span>
                    </th>
                  </tr>
                </thead>
                {/* Below md each row is a stacked card; cells carry sr-only labels since the header row is hidden. */}
                <tbody className="max-md:flex max-md:flex-col max-md:gap-3">
                  {recent.map((order) => {
                    const status = fulfilmentBadgeInfo(order);
                    const payment = paymentStatusInfo[order.paymentStatus];
                    const unpaid = order.paymentStatus !== "paid" && order.fulfilmentStatus === "pending";
                    return (
                      <tr key={order.orderNumber} className={mobileCardRowClasses}>
                        <th scope="row" className="py-3.5 pr-3 pl-3 text-left text-base leading-6 font-bold whitespace-nowrap max-md:order-1 max-md:grow max-md:basis-[55%] max-md:p-0">
                          {order.orderNumber}
                        </th>
                        <td className="py-3.5 pr-3 text-[15px] leading-[23px] whitespace-nowrap max-md:order-5 max-md:grow max-md:basis-[55%] max-md:p-0 max-md:text-sm max-md:leading-[21px] max-md:text-muted-foreground">
                          <CellLabel>{t.orders.col.method}</CellLabel>
                          {order.fulfilmentMethod === "delivery" ? t.common.delivery : t.common.pickup}
                        </td>
                        <td className="py-3.5 pr-3 max-md:order-3 max-md:p-0">
                          <CellLabel>{t.orders.col.payment}</CellLabel>
                          <StatusBadge tone={payment.tone} className="whitespace-nowrap">{payment[locale]}</StatusBadge>
                        </td>
                        <td className="py-3.5 pr-3 max-md:order-4 max-md:p-0">
                          <CellLabel>{t.orders.col.status}</CellLabel>
                          {unpaid ? (
                            <span className="text-muted-foreground" aria-label={status[locale]}>—</span>
                          ) : (
                            <StatusBadge tone={status.tone} className="whitespace-nowrap">{status[locale]}</StatusBadge>
                          )}
                        </td>
                        <td className="py-3.5 pr-3 text-base leading-6 font-bold whitespace-nowrap max-md:order-2 max-md:grow max-md:basis-[calc(45%-0.5rem)] max-md:p-0 max-md:text-right">
                          <CellLabel>{t.orders.col.total}</CellLabel>
                          {formatRupiah(order.total)}
                        </td>
                        <td className="py-3.5 pr-3 text-right max-md:order-6 max-md:ml-auto max-md:p-0">
                          <ArrowLink
                            href={`/admin/orders/${order.orderNumber}`}
                            aria-label={t.orders.viewLabel(order.orderNumber)}
                            className="after:-inset-y-4"
                          >
                            {t.common.view}
                          </ArrowLink>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <section className="flex w-full flex-col gap-4 rounded-m bg-primary [--focus-ring:var(--white)] p-6 xl:w-[360px] xl:shrink-0">
          <h2 className="font-display text-[22px] leading-[33px] font-bold text-white">{o.yourMenu}</h2>
          <ul className="flex flex-col gap-4">
            {categories.map((c) => {
              const variants = c.products.reduce((sum, p) => sum + p._count.variants, 0);
              return (
                <li
                  key={c.slug}
                  className="flex items-center gap-2.5 py-2.5 shadow-[inset_0_-1px_0_rgb(255_255_255_/_0.15)]"
                >
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", categoryStyle(c.slug).dot)} />
                  <span className="flex-1 text-[15px] leading-[23px] font-semibold text-white">
                    {categoryName(c.slug, c.name, locale)}
                  </span>
                  <span className="text-sm leading-[21px] text-mint">
                    {isTrayCategory(c.slug) ? o.traySizes(variants) : o.flavors(c.products.length)}
                  </span>
                </li>
              );
            })}
          </ul>
          <Link
            href="/admin/products"
            className={buttonClasses(
              "primary",
              "w-full bg-transparent inset-ring-[1.5px] inset-ring-white hover:bg-white/10",
            )}
          >
            {o.manage}
          </Link>
        </section>
      </div>
    </AdminMain>
  );
}

function Kpi({
  label,
  icon: Icon,
  iconBg,
  value,
  sub,
  href,
  className,
}: {
  label: string;
  icon: typeof Cookie;
  iconBg: string;
  value: string;
  sub: string;
  /** Makes the whole card a link to the matching order list. */
  href?: string;
  className?: string;
}) {
  const card = (
    <Card
      className={cn(
        "flex flex-col gap-2 p-4 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-0.5 max-md:rounded-none max-md:bg-transparent max-md:inset-ring-0 md:gap-4 md:p-6",
        href &&
          "h-full transition-[background-color,box-shadow] duration-150 ease-out group-hover:bg-background group-hover:inset-ring-border/50",
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 max-md:col-start-1 max-md:row-start-1">
        <h2 className="text-sm leading-[21px] font-semibold text-muted-foreground">{label}</h2>
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] max-md:hidden", iconBg)}>
          <Icon className="size-[18px] text-foreground" aria-hidden />
        </span>
      </div>
      <p className="font-display text-[28px] leading-8 font-bold max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 md:text-[32px] md:leading-[44px] xl:text-[44px]">{value}</p>
      <p className="text-[13px] leading-5 text-muted-foreground max-md:col-start-1 max-md:row-start-2">{sub}</p>
    </Card>
  );
  return href ? (
    <Link href={href} className={cn("group block rounded-m max-md:rounded-none max-md:not-last:shadow-[inset_0_-1px_0_var(--border-subtle)]", className)}>
      {card}
    </Link>
  ) : (
    <div className={cn("max-md:not-last:shadow-[inset_0_-1px_0_var(--border-subtle)]", className)}>{card}</div>
  );
}
