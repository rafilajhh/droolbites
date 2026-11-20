import type { Metadata } from "next";
import Image from "next/image";
import { Ban, CircleAlert, CircleX, Download, Hourglass, Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { PrintButton } from "@/components/admin/print-button";
import { buttonClasses } from "@/components/ui/button";
import { BarItem, BarList, ColumnChart, type ColumnPoint } from "@/components/admin/report-charts";
import { SegmentedLinks } from "@/components/admin/reports-segmented";
import { categoryStyle, paymentMethodShort } from "@/components/admin/rules";
import { AdminMain, Card, PageHead, PaneCard, paneClasses, SectionTitle, StatPane } from "@/components/admin/ui";
import { categoryName } from "@/content/products";
import { requireAdmin } from "@/lib/auth";
import { formatDateTime, formatRupiah } from "@/lib/format";
import {
  DEFAULT_REPORT_PRESET,
  getSalesReport,
  REPORT_EARLIEST_DAY,
  REPORT_PRESETS,
  resolveReportRange,
  wibDayKey,
  type ReportPreset,
  type SalesReport,
} from "@/lib/reports";
import { getStoreSettings } from "@/lib/settings";
import { cn } from "@/lib/cn";
import type { Locale } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";
import { adminReportsMessages } from "@/i18n/messages/admin-reports";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminReportsMessages);
  return { title: t.metaTitle };
}

// A4 paper, white instead of the cream page, and the bars printed in colour.
const printCss =
  "@page{size:A4;margin:12mm}@media print{html,body{background:#fff!important}body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}";

/** A calendar day ("2026-11-09") as an instant inside that Surabaya day, for Intl formatting. */
const noon = (key: string) => new Date(`${key}T12:00:00+07:00`);

function dayFormat(locale: Locale, options: Intl.DateTimeFormatOptions) {
  const f = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", { ...options, timeZone: "Asia/Jakarta" });
  return (key: string) => f.format(noon(key)).replace(/[.,]/g, "");
}

/** "9 Nov 2026", "9 – 15 Nov 2026", "28 Oct – 3 Nov 2026", "28 Dec 2025 – 3 Jan 2026". */
function formatSpan(from: string, to: string, locale: Locale) {
  const full = dayFormat(locale, { day: "numeric", month: "short", year: "numeric" });
  if (from === to) return full(from);
  const sameYear = from.slice(0, 4) === to.slice(0, 4);
  const sameMonth = sameYear && from.slice(0, 7) === to.slice(0, 7);
  const start = sameMonth
    ? dayFormat(locale, { day: "numeric" })(from)
    : sameYear
      ? dayFormat(locale, { day: "numeric", month: "short" })(from)
      : full(from);
  return `${start} – ${full(to)}`;
}

/** Column labels and tooltips for the revenue chart, in the bucket size the report picked. */
function chartPoints(report: SalesReport, locale: Locale, t: typeof adminReportsMessages.en): ColumnPoint[] {
  const { unit, buckets } = report.series;
  const multiYear = report.from.slice(0, 4) !== report.to.slice(0, 4);
  const short = dayFormat(locale, { day: "numeric", month: "short" });
  const weekdayDay = dayFormat(locale, { weekday: "short", day: "numeric" });
  const longDay = dayFormat(locale, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const month = dayFormat(locale, multiYear ? { month: "short", year: "2-digit" } : { month: "short" });
  const monthLong = dayFormat(locale, { month: "long", year: "numeric" });
  return buckets.map((b) => ({
    key: b.from,
    axisLabel: unit === "day" ? (report.days <= 7 ? weekdayDay(b.from) : short(b.from)) : unit === "week" ? short(b.from) : month(b.from),
    title: unit === "day" ? longDay(b.from) : unit === "week" ? t.chart.weekOf(formatSpan(b.from, b.to, locale)) : monthLong(b.from),
    value: b.revenue,
    valueText: formatRupiah(b.revenue),
    detail: t.chart.orders(b.orders),
  }));
}

// The admin toolbar field look (toolbarFieldClasses lives in a client module, so it can't be imported here).
const fieldClasses =
  "flex items-center gap-2.5 rounded-sm bg-white px-3.5 inset-ring-[1.25px] inset-ring-border-input transition-shadow hover:inset-ring-border";

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** Admin / Sales report: a preset (?range=) or custom days (?from=&to=), whole Surabaya days; prints on A4. */
export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requireAdmin();
  const params = await searchParams;
  const one = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v) ?? undefined;
  };
  const range = resolveReportRange({ range: one("range"), period: one("period"), from: one("from"), to: one("to") });

  const [t, ta, locale, report, settings] = await Promise.all([
    getMessages(adminReportsMessages),
    getMessages(adminMessages),
    getLocale(),
    getSalesReport(range),
    getStoreSettings(),
  ]);

  const span = formatSpan(report.from, report.to, locale);
  const eyebrow = range.from === null ? t.allTime : span.toUpperCase();
  const periodName = range.preset ? t.periods[range.preset] : t.custom.label;
  const today = wibDayKey(new Date());
  const presetHref = (p: ReportPreset) => (p === DEFAULT_REPORT_PRESET ? "/admin/reports" : `/admin/reports?range=${p}`);
  // All time exports every order (no dates).
  const exportHref = range.from ? `/admin/orders/export?from=${range.from}&to=${range.to}` : "/admin/orders/export";

  const points = chartPoints(report, locale, t);
  const unit = report.series.unit;
  const best = points.reduce<ColumnPoint | null>((top, p) => (p.value > 0 && (!top || p.value > top.value) ? p : top), null);
  const compact = new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-GB", { notation: "compact", maximumFractionDigits: 1 });
  const categoryTotal = report.categories.reduce((sum, c) => sum + c.revenue, 0);

  const sectionHead = (id: string, title: string, sub: string) => (
    <div className="flex flex-col gap-1">
      <SectionTitle id={id}>{title}</SectionTitle>
      <p className="text-sm leading-[21px] text-muted-foreground">{sub}</p>
    </div>
  );
  const emptyLine = (text: string) => <p className="text-[15px] leading-[23px] text-muted-foreground">{text}</p>;

  return (
    <AdminMain className="gap-7 print:gap-5 print:p-0">
      <style>{printCss}</style>

      {/* On paper the page head becomes a letterhead: store, report, period and when it was printed. */}
      <header className="hidden w-full items-start justify-between gap-6 border-b border-border-divider pb-4 print:flex">
        <div className="flex min-w-0 items-center gap-3">
          <Image src="/images/site/logo-badge.png" alt="" width={48} height={48} loading="eager" quality={100} className="size-12 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col">
            <p className="font-display text-[22px] leading-[28px] font-bold">{settings.storeName}</p>
            <p className="text-[13px] leading-5 text-muted-foreground">{settings.address}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end text-right">
          <p className="font-display text-[22px] leading-[28px] font-bold">{t.title}</p>
          <p className="text-[13px] leading-5 font-semibold">
            {t.print.period}: {periodName} · {span}
          </p>
          <p className="text-[13px] leading-5 text-muted-foreground">{t.print.generated(formatDateTime(new Date(), locale))}</p>
        </div>
      </header>

      <div className="w-full print:hidden">
        <PageHead
          eyebrow={eyebrow}
          title={t.title}
          sub={t.sub}
          action={
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={exportHref}
                download
                aria-label={t.actions.exportLabel}
                className={buttonClasses("secondary", "min-h-11 px-5 py-3")}
              >
                <Download className="size-4" aria-hidden />
                {t.actions.export}
              </a>
              <PrintButton label={t.actions.print} ariaLabel={t.actions.printLabel} className="min-h-11 px-5 py-3" />
            </div>
          }
        />
      </div>

      <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 print:hidden">
        <SegmentedLinks
          dense
          label={t.periods.label}
          value={range.preset ?? ""}
          options={REPORT_PRESETS.map((p) => ({ value: p, label: t.periods[p], href: presetHref(p) }))}
        />
        {/* Plain GET form: the dates land in the URL like the presets. Keyed by the period so the
            fields show the new days after every navigation. */}
        <form
          key={`${report.from}_${report.to}`}
          action="/admin/reports"
          method="get"
          aria-label={t.custom.label}
          className="grid w-full grid-cols-2 items-center gap-2 max-[479px]:grid-cols-1 sm:flex sm:w-auto sm:flex-wrap"
        >
          {(
            [
              { name: "from", label: t.custom.from, value: report.from },
              { name: "to", label: t.custom.to, value: report.to },
            ] as const
          ).map((f) => (
            <label
              key={f.name}
              className={cn(
                fieldClasses,
                "min-h-11 min-w-0 gap-2 py-0 text-sm leading-[21px] focus-within:inset-ring-2 focus-within:inset-ring-primary",
              )}
            >
              <span className="text-muted-foreground">{f.label}</span>
              <input
                type="date"
                name={f.name}
                required
                defaultValue={f.value}
                min={REPORT_EARLIEST_DAY}
                max={today}
                className="h-11 min-w-0 flex-1 bg-transparent font-semibold text-foreground tabular-nums outline-hidden"
              />
            </label>
          ))}
          <button
            type="submit"
            className="col-span-full min-h-11 rounded-sm bg-primary px-4 font-display text-[15px] leading-[18px] font-semibold tracking-[0.5px] text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            {t.custom.apply}
          </button>
        </form>
      </div>

      {range.invalid ? (
        <p role="alert" className="flex w-full items-start gap-3 rounded-sm bg-tint-mustard px-4 py-3 text-sm leading-[21px] font-semibold print:hidden">
          <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden />
          {t.custom.invalid}
        </p>
      ) : null}

      {/* Totals: the four figures in one strip, and what was left out of them as the strip's last row. */}
      <PaneCard as="div" cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-4 print:grid-cols-2" className="print:break-inside-avoid">
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
          <dl className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 xl:col-span-3 xl:gap-0 print:grid-cols-3 print:gap-6">
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

      <Card aria-labelledby="chart-title" className="flex w-full flex-col gap-6 p-5 md:p-6 print:break-inside-avoid">
        <div className="flex w-full flex-wrap items-end justify-between gap-x-6 gap-y-2">
          {sectionHead("chart-title", t.chart.title, t.chart.sub(unit))}
          {best ? (
            <p className="flex flex-col text-sm leading-[21px] sm:items-end">
              <span className="text-muted-foreground">{t.chart.best(unit)}</span>
              <span className="font-semibold">
                {best.title} · <span className="font-bold tabular-nums">{best.valueText}</span>
              </span>
            </p>
          ) : null}
        </div>
        <ColumnChart
          points={points}
          label={t.chart.columns(unit)}
          empty={t.chart.empty}
          formatTick={(v) => `Rp${compact.format(v)}`}
        />
      </Card>

      <Card aria-labelledby="top-products-title" className="flex w-full flex-col gap-5 p-5 md:p-6 print:break-inside-avoid">
        {sectionHead("top-products-title", t.top.title, t.top.sub)}
        {report.topProducts.length === 0 ? (
          emptyLine(t.top.empty)
        ) : (
          // Ranks 1–5 in the left column and 6–10 in the right from xl.
          <ol className="flex flex-col gap-4 xl:grid xl:grid-flow-col xl:grid-cols-2 xl:gap-x-12 print:grid print:grid-flow-col print:grid-cols-2 print:gap-x-8" style={{ gridTemplateRows: `repeat(${Math.ceil(report.topProducts.length / 2)}, auto)` }}>
            {report.topProducts.map((p, i) => (
              <li key={p.id} className="min-w-0">
                <BarItem
                  max={report.topProducts[0].qty}
                  row={{
                    key: p.id,
                    label: (
                      <>
                        <span className="w-6 shrink-0 font-mono text-[13px] leading-5 font-semibold text-muted-foreground tabular-nums">
                          {i + 1}
                        </span>
                        <span className="truncate">{p.name}</span>
                      </>
                    ),
                    value: p.qty,
                    valueText: t.top.sold(p.qty),
                    detail: `${formatRupiah(p.revenue)} · ${categoryName(p.categorySlug, p.categoryName, locale)}`,
                  }}
                />
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* The three splits side by side: what sold, how it reached the customer, how it was paid. */}
      <PaneCard as="div" cols="grid-cols-1 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3" className="print:break-inside-avoid">
        <section aria-labelledby="categories-title" className={cn(paneClasses, "gap-5 p-5 md:p-6")}>
          {sectionHead("categories-title", t.categories.title, t.categories.sub)}
          {report.categories.length === 0 ? (
            emptyLine(t.categories.empty)
          ) : (
            <BarList
              rows={report.categories.map((c) => ({
                key: c.slug,
                label: (
                  <>
                    <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", categoryStyle(c.slug).dot)} />
                    <span className="truncate">{categoryName(c.slug, c.name, locale)}</span>
                  </>
                ),
                value: c.revenue,
                valueText: formatRupiah(c.revenue),
                detail: `${t.categories.share(pct(c.revenue, categoryTotal))} · ${t.categories.items(c.qty)}`,
              }))}
            />
          )}
        </section>

        <section aria-labelledby="fulfilment-title" className={cn(paneClasses, "gap-5 p-5 md:p-6")}>
          {sectionHead("fulfilment-title", t.fulfilment.title, t.fulfilment.sub)}
          {report.paidOrders === 0 ? (
            emptyLine(t.fulfilment.empty)
          ) : (
            <BarList
              rows={report.fulfilment.map((f) => ({
                key: f.method,
                label: f.method === "delivery" ? ta.common.delivery : ta.common.pickup,
                value: f.orders,
                valueText: t.fulfilment.orders(f.orders),
                detail: `${t.fulfilment.share(pct(f.orders, report.paidOrders))} · ${formatRupiah(f.revenue)}`,
              }))}
            />
          )}
        </section>

        <section aria-labelledby="payments-title" className={cn(paneClasses, "gap-5 p-5 md:p-6 md:max-xl:col-span-2 print:col-span-1")}>
          {sectionHead("payments-title", t.payments.title, t.payments.sub)}
          {report.payments.length === 0 ? (
            emptyLine(t.payments.empty)
          ) : (
            <BarList
              rows={report.payments.map((p) => ({
                key: p.method,
                label: paymentMethodShort(p.method),
                value: p.orders,
                valueText: t.payments.orders(p.orders),
                detail: `${t.payments.share(pct(p.orders, report.paidOrders))} · ${formatRupiah(p.revenue)}`,
              }))}
            />
          )}
        </section>
      </PaneCard>

      <p className="text-[13px] leading-5 text-muted-foreground">{t.footnote}</p>
    </AdminMain>
  );
}
