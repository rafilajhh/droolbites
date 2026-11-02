import type { Metadata } from "next";
import { Ban, CircleX, Hourglass, Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { SegmentedLinks } from "@/components/admin/reports-segmented";
import { categoryStyle } from "@/components/admin/rules";
import { AdminMain, Card, PageHead, thClasses } from "@/components/admin/ui";
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

const h2Classes = "font-display text-[22px] leading-[33px] font-bold";

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

      <div className="grid w-full grid-cols-1 overflow-hidden max-md:rounded-m max-md:bg-white max-md:inset-ring-1 max-md:inset-ring-border-subtle md:grid-cols-2 md:gap-5 min-[1360px]:grid-cols-4">
        <Stat
          label={t.kpi.revenue}
          icon={Wallet}
          iconBg="bg-mint"
          value={formatRupiah(report.revenue)}
          sub={t.kpi.revenueSub(formatRupiah(report.itemRevenue), formatRupiah(report.deliveryRevenue))}
        />
        <Stat
          label={t.kpi.paidOrders}
          icon={Receipt}
          iconBg="bg-tint-lavender"
          value={String(report.paidOrders)}
          sub={t.kpi.paidOrdersSub}
        />
        <Stat
          label={t.kpi.average}
          icon={ShoppingBag}
          iconBg="bg-tint-mustard"
          value={formatRupiah(report.averageOrder)}
          sub={t.kpi.averageSub}
        />
        <Stat
          label={t.kpi.itemsSold}
          icon={Package}
          iconBg="bg-tint-salmon"
          value={String(report.itemsSold)}
          sub={t.kpi.itemsSoldSub(report.productsSold)}
        />
      </div>

      <Card className="flex w-full flex-col gap-4 p-6">
        <h2 className={h2Classes}>{t.notCounted.title}</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
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
            <div key={label} className="flex items-start gap-3 rounded-sm bg-background p-4">
              <Icon className="mt-0.5 size-[18px] shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <dt className="text-sm leading-[21px] font-semibold text-muted-foreground">{label}</dt>
                <dd className="font-display text-[28px] leading-8 font-bold tabular-nums">{value}</dd>
                <dd className="text-[13px] leading-5 text-muted-foreground">{sub}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Card>

      {daily ? (
        <Card className="flex w-full flex-col gap-4 p-6">
          <div className="flex flex-col">
            <h2 className={h2Classes}>{t.daily.title}</h2>
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

      <div className="flex w-full flex-col gap-5 xl:flex-row xl:items-start">
        <Card className="flex min-w-0 flex-1 flex-col gap-4 p-6">
          <div className="flex flex-col">
            <h2 className={h2Classes}>{t.top.title}</h2>
            <p className="text-sm leading-[21px] text-muted-foreground">{t.top.sub}</p>
          </div>
          {report.topProducts.length === 0 ? (
            <p className="text-[15px] leading-[23px] text-muted-foreground">{t.top.empty}</p>
          ) : (
            <table aria-label={t.top.title} className="w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th scope="col" className={cn(thClasses, "w-8 rounded-l-lg bg-background py-2.5 pl-3 sm:w-10")}>
                    <span className="sr-only">{t.top.rank}</span>#
                  </th>
                  <th scope="col" className={cn(thClasses, "bg-background py-2.5 pr-3")}>
                    {t.top.product}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-16 bg-background py-2.5 pr-3 text-right sm:w-20")}>
                    {t.top.sold}
                  </th>
                  <th scope="col" className={cn(thClasses, "w-[112px] rounded-r-lg bg-background py-2.5 pr-3 text-right sm:w-[130px]")}>
                    {t.top.revenue}
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:not(:last-child)_td]:shadow-[inset_0_-1px_0_var(--border-subtle)] [&_tr:not(:last-child)_th]:shadow-[inset_0_-1px_0_var(--border-subtle)]">
                {report.topProducts.map((p, i) => (
                  <tr key={p.id}>
                    <td className="py-3 pl-3 font-mono text-[13px] leading-5 font-semibold text-muted-foreground tabular-nums">
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
                    <td className="py-3 pr-3 text-right text-[15px] leading-[23px] font-semibold whitespace-nowrap tabular-nums">
                      {formatRupiah(p.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="flex w-full flex-col gap-4 p-6 xl:w-[360px] xl:shrink-0">
          <div className="flex flex-col">
            <h2 className={h2Classes}>{t.categories.title}</h2>
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
        </Card>
      </div>

      <p className="text-[13px] leading-5 text-muted-foreground">{t.footnote}</p>
    </AdminMain>
  );
}

/** A totals card, styled like the overview KPI cards (a single white list below md). */
function Stat({
  label,
  icon: Icon,
  iconBg,
  value,
  sub,
}: {
  label: string;
  icon: typeof Wallet;
  iconBg: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="max-md:not-last:shadow-[inset_0_-1px_0_var(--border-subtle)]">
      <Card className="flex h-full flex-col gap-2 p-4 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:items-center max-md:gap-x-3 max-md:gap-y-0.5 max-md:rounded-none max-md:bg-transparent max-md:inset-ring-0 md:gap-4 md:p-6">
        <div className="flex w-full items-center justify-between gap-3 max-md:col-start-1 max-md:row-start-1">
          <h2 className="text-sm leading-[21px] font-semibold text-muted-foreground">{label}</h2>
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px] max-md:hidden", iconBg)}>
            <Icon className="size-[18px] text-foreground" aria-hidden />
          </span>
        </div>
        <p className="font-display text-[28px] leading-8 font-bold tabular-nums max-md:col-start-2 max-md:row-span-2 max-md:row-start-1 md:text-[32px] md:leading-[44px] min-[1360px]:text-[28px]">
          {value}
        </p>
        <p className="text-[13px] leading-5 text-muted-foreground max-md:col-start-1 max-md:row-start-2">{sub}</p>
      </Card>
    </div>
  );
}
