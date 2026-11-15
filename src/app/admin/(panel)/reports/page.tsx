import type { Metadata } from "next";
import { Ban, CircleX, Hourglass, Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { SegmentedLinks } from "@/components/admin/reports-segmented";
import { categoryStyle } from "@/components/admin/rules";
import { AdminMain, Card, PageHead, PaneCard, paneClasses, SectionTitle, StatPane, thClasses } from "@/components/admin/ui";
import { categoryName } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { formatDate, formatRupiah } from "@/lib/format";
import { getSalesReport, isReportPeriod, REPORT_PERIODS, type ReportPeriod } from "@/lib/reports";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { adminReportsMessages } from "@/i18n/messages/admin-reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminReportsMessages);
  return { title: t.metaTitle };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Mon 2 Nov" / "Sen 2 Nov" in Surabaya time, for the revenue-by-day rows. */
function formatDay(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  })
    .format(date)
    .replace(/[.,]/g, "");
}

/** Admin / Sales report: ?period=today|7d|30d|all (default 7d), whole Surabaya days. */
export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin();
  const params = await searchParams;
  const raw = Array.isArray(params.period) ? params.period[0] : params.period;
  const period: ReportPeriod = raw && isReportPeriod(raw) ? raw : "7d";

  const [t, locale, report] = await Promise.all([
    getMessages(adminReportsMessages),
    getLocale(),
    getSalesReport(period),
  ]);

  const range = report.range;
  const lastDay = range ? new Date(range.to.getTime() - DAY_MS) : null;
  const eyebrow = !range
    ? t.allTime
    : range.days === 1
      ? formatDate(range.from, locale).toUpperCase()
      : `${formatDate(range.from, locale)} – ${formatDate(lastDay!, locale)}`.toUpperCase();

  const daily = report.daily;
  const dailyMax = daily ? Math.max(0, ...daily.map((d) => d.revenue)) : 0;
  const categoryTotal = report.categories.reduce((sum, c) => sum + c.revenue, 0);

  return (
    <AdminMain className="gap-7">
      <PageHead eyebrow={eyebrow} title={t.title} sub={t.sub} />

      <SegmentedLinks
        label={t.periods.label}
        value={period}
        options={REPORT_PERIODS.map((p) => ({
          value: p,
          label: t.periods[p],
          href: p === "7d" ? "/admin/reports" : `/admin/reports?period=${p}`,
        }))}
      />

      {/* Totals: the four figures in one strip, and what was left out of them as the strip's last row. */}
      <PaneCard as="div" cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        <StatPane
          label={t.kpi.revenue}
          icon={Wallet}
          iconBg="bg-mint"
          value={formatRupiah(report.revenue)}
          sub={t.kpi.revenueSub(formatRupiah(report.itemRevenue), formatRupiah(report.deliveryRevenue))}
        />
        <StatPane
          label={t.kpi.paidOrders}
          icon={Receipt}
          iconBg="bg-tint-lavender"
          value={String(report.paidOrders)}
          sub={t.kpi.paidOrdersSub}
        />
        <StatPane
          label={t.kpi.average}
          icon={ShoppingBag}
          iconBg="bg-tint-mustard"
          value={formatRupiah(report.averageOrder)}
          sub={t.kpi.averageSub}
        />
        <StatPane
          label={t.kpi.itemsSold}
          icon={Package}
          iconBg="bg-tint-salmon"
          value={String(report.itemsSold)}
          sub={t.kpi.itemsSoldSub(report.productsSold)}
        />
        <section
          aria-labelledby="not-counted-title"
          className={cn(paneClasses, "col-span-full gap-4 bg-background px-5 py-4 md:px-6 md:py-5 xl:grid xl:grid-cols-4 xl:gap-0 xl:px-0")}
        >
          <SectionTitle id="not-counted-title" className="xl:px-6">
            {t.notCounted.title}
          </SectionTitle>
          {/* From xl each figure sits under a column of the strip above. Below md each is a compact row with
              the figure on the right, like the stat rows above it. */}
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 xl:col-span-3 xl:gap-0">
            {[
              { label: t.notCounted.awaiting, sub: t.notCounted.awaitingSub, value: report.awaiting, icon: Hourglass },
              { label: t.notCounted.expired, sub: t.notCounted.expiredSub, value: report.expired, icon: CircleX },
              {
                label: t.notCounted.cancelled,
                sub: t.notCounted.cancelledSub(report.cancelledPaid),
                value: report.cancelled,
                icon: Ban,
              },
            ].map(({ label, sub, value, icon: Icon }) => (
              <div key={label} className="flex items-start gap-3 xl:px-6">
                <Icon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-col max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4">
                  <dt className="text-sm leading-[21px] font-semibold text-muted-foreground">{label}</dt>
                  <dd className="font-display text-[22px] leading-[28px] font-bold tabular-nums max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 max-md:self-center">
                    {value}
                  </dd>
                  <dd className="text-[13px] leading-5 text-muted-foreground max-md:col-start-1 max-md:row-start-2">{sub}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>
      </PaneCard>

      {daily ? (
        <Card aria-labelledby="daily-title" className="flex w-full flex-col gap-4 p-5 md:p-6">
          <div className="flex flex-col gap-1">
            <SectionTitle id="daily-title">{t.daily.title}</SectionTitle>
            <p className="text-sm leading-[21px] text-muted-foreground">{t.daily.sub}</p>
          </div>
          {dailyMax === 0 ? (
            <p className="text-[15px] leading-[23px] text-muted-foreground">{t.daily.empty}</p>
          ) : (
            <ol className="flex flex-col gap-1">
              {daily.map((d) => (
                <li
                  key={d.date.toISOString()}
                  className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-center gap-3 py-1 sm:grid-cols-[96px_minmax(0,1fr)_200px]"
                >
                  <span className="font-mono text-xs leading-[18px] font-semibold whitespace-nowrap text-muted-foreground">
                    {formatDay(d.date, locale)}
                  </span>
                  <span aria-hidden className="h-3 overflow-hidden rounded-pill bg-oat">
                    {d.revenue > 0 ? (
                      <span
                        className="block h-full min-w-1 rounded-pill bg-primary"
                        style={{ width: `${(d.revenue / dailyMax) * 100}%` }}
                      />
                    ) : null}
                  </span>
                  <span className="flex flex-wrap items-baseline justify-end gap-x-2 text-right">
                    <span className="text-[15px] leading-[23px] font-bold tabular-nums">{formatRupiah(d.revenue)}</span>
                    <span className="text-[13px] leading-5 text-muted-foreground tabular-nums max-sm:sr-only">
                      {t.daily.orders(d.orders)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      ) : null}

      {/* Best sellers and the category split in one card, the same two-pane rhythm as the overview. */}
      <PaneCard as="div" cols="grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section aria-labelledby="top-products-title" className={cn(paneClasses, "gap-4 p-5 md:p-6")}>
          <div className="flex flex-col gap-1">
            <SectionTitle id="top-products-title">{t.top.title}</SectionTitle>
            <p className="text-sm leading-[21px] text-muted-foreground">{t.top.sub}</p>
          </div>
          {report.topProducts.length === 0 ? (
            <p className="text-[15px] leading-[23px] text-muted-foreground">{t.top.empty}</p>
          ) : (
            <table aria-labelledby="top-products-title" className="w-full border-collapse">
              <thead>
                <tr className="shadow-[inset_0_-1px_0_var(--border-subtle)]">
                  <th scope="col" className={cn(thClasses, "w-8 py-2.5 sm:w-10")}>
                    <span className="sr-only">{t.top.rank}</span>#
                  </th>
                  <th scope="col" className={cn(thClasses, "py-2.5 pr-3")}>
                    {t.top.product}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-16 py-2.5 pr-3 text-right sm:w-20")}>
                    {t.top.sold}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[112px] py-2.5 text-right sm:w-[130px]")}>
                    {t.top.revenue}
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.topProducts.map((p, i) => (
                  <tr key={p.id} className="shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none">
                    <td className="py-3 font-mono text-[13px] leading-5 font-semibold text-muted-foreground tabular-nums">
                      {i + 1}
                    </td>
                    <th scope="row" className="py-3 pr-3 text-left font-normal">
                      <span className="block text-[15px] leading-[23px] font-bold">{p.name}</span>
                      <span className="flex items-center gap-1.5 text-[13px] leading-5 text-muted-foreground">
                        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", categoryStyle(p.categorySlug).dot)} />
                        {categoryName(p.categorySlug, p.categoryName, locale)}
                      </span>
                    </th>
                    <td className="py-3 pr-3 text-right text-[15px] leading-[23px] font-semibold tabular-nums">{p.qty}</td>
                    <td className="py-3 text-right text-[15px] leading-[23px] font-semibold whitespace-nowrap tabular-nums">
                      {formatRupiah(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section aria-labelledby="categories-title" className={cn(paneClasses, "gap-4 p-5 md:p-6")}>
          <div className="flex flex-col gap-1">
            <SectionTitle id="categories-title">{t.categories.title}</SectionTitle>
            <p className="text-sm leading-[21px] text-muted-foreground">{t.categories.sub}</p>
          </div>
          {report.categories.length === 0 ? (
            <p className="text-[15px] leading-[23px] text-muted-foreground">{t.categories.empty}</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.categories.map((c) => {
                const pct = categoryTotal ? Math.round((c.revenue / categoryTotal) * 100) : 0;
                return (
                  <li key={c.slug} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2.5">
                      <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", categoryStyle(c.slug).dot)} />
                      <span className="flex-1 text-[15px] leading-[23px] font-semibold">
                        {categoryName(c.slug, c.name, locale)}
                      </span>
                      <span className="text-[15px] leading-[23px] font-bold whitespace-nowrap tabular-nums">
                        {formatRupiah(c.revenue)}
                      </span>
                    </div>
                    <span aria-hidden className="h-2 overflow-hidden rounded-pill bg-oat">
                      <span className="block h-full rounded-pill bg-primary" style={{ width: `${pct}%` }} />
                    </span>
                    <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
                      {t.categories.share(pct)} · {t.categories.items(c.qty)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PaneCard>

      <p className="text-[13px] leading-5 text-muted-foreground">{t.footnote}</p>
    </AdminMain>
  );
}
