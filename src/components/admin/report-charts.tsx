import { cn } from "@/lib/cn";

/** A round step for a value axis: 1, 2, 2.5 or 5 times a power of ten. */
function niceStep(raw: number) {
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit <= 1 ? 1 : unit <= 2 ? 2 : unit <= 2.5 ? 2.5 : unit <= 5 ? 5 : 10) * power;
}

export type ColumnPoint = {
  key: string;
  /** Under the column (only some are shown when there are many). */
  axisLabel: string;
  /** Tooltip and screen-reader line: the period, the value, the detail. */
  title: string;
  value: number;
  valueText: string;
  detail: string;
};

/**
 * Column chart in plain HTML and CSS (no chart library): a value axis with round steps and hairline
 * grid lines, one moss column per point, and a tooltip on hover and keyboard focus. Each column is a
 * focusable list item whose text says the period and value, so screen readers get the same data as
 * a list. Server-rendered, prints as is.
 */
export function ColumnChart({
  points,
  formatTick,
  label,
  empty,
}: {
  points: ColumnPoint[];
  formatTick: (value: number) => string;
  /** Accessible name of the list of columns. */
  label: string;
  /** Shown over the empty plot when every value is 0. */
  empty: string;
}) {
  const max = Math.max(0, ...points.map((p) => p.value));
  const step = max > 0 ? niceStep(max / 4) : 1;
  const top = max > 0 ? Math.ceil(max / step) * step : 4;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  // Keep the axis labels apart: at most ~4 on a phone, ~7 on a tablet, ~10 wide; always the first and the
  // last, and the regular label just before the last steps aside when the two would touch.
  const every = (cap: number) => Math.max(1, Math.ceil(points.length / cap));
  const shown = (i: number, cap: number) => {
    const last = points.length - 1;
    const e = every(cap);
    return i === last || (i % e === 0 && last - i >= e * 0.75);
  };

  return (
    <div className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3">
      <div aria-hidden className="relative h-[200px] md:h-[240px] print:h-[200px]">
        {ticks.map((v) => (
          <span
            key={v}
            className="absolute right-0 translate-y-1/2 font-mono text-[11px] leading-[14px] font-semibold whitespace-nowrap text-muted-foreground tabular-nums"
            style={{ bottom: `${(v / top) * 100}%` }}
          >
            {max > 0 || v === 0 ? formatTick(v) : ""}
          </span>
        ))}
        {/* Reserves the widest label's width so the column doesn't change size between ranges. */}
        <span className="invisible block h-0 font-mono text-[11px] font-semibold whitespace-nowrap">{formatTick(top)}</span>
      </div>

      <div className="relative h-[200px] md:h-[240px] print:h-[200px]">
        {ticks.map((v) => (
          <span
            key={v}
            aria-hidden
            className={cn("absolute inset-x-0 h-px", v === 0 ? "bg-border-divider" : "bg-border-subtle")}
            style={{ bottom: `${(v / top) * 100}%` }}
          />
        ))}
        {max === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-[15px] leading-[23px] text-muted-foreground">
            {empty}
          </p>
        ) : null}
        <ol
          aria-label={label}
          className={cn(
            "absolute inset-0 flex items-end",
            points.length > 20 ? "gap-px sm:gap-0.5" : points.length > 10 ? "gap-1 sm:gap-1.5" : "gap-2 sm:gap-4",
          )}
        >
          {points.map((p, i) => {
            const pct = (p.value / top) * 100;
            // Tooltips near the edges open inward so they stay inside the card.
            const align = i < points.length / 4 ? "left-0" : i >= (points.length * 3) / 4 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <li
                key={p.key}
                tabIndex={0}
                className="group relative flex h-full min-w-0 flex-1 cursor-default items-end justify-center rounded-sm outline-offset-2"
              >
                <span className="sr-only">
                  {p.title}: {p.valueText}, {p.detail}
                </span>
                <span
                  aria-hidden
                  className="w-full max-w-12 rounded-t-sm bg-primary transition-colors duration-150 ease-out group-hover:bg-primary-hover group-focus-visible:bg-primary-hover motion-reduce:transition-none"
                  style={{ height: p.value > 0 ? `max(${pct}%, 3px)` : 0 }}
                />
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute z-10 hidden w-max max-w-[220px] flex-col gap-0.5 rounded-sm bg-white px-3 py-2 shadow-[0_4px_12px_rgb(31_42_20/0.15)] inset-ring-1 inset-ring-border-subtle group-hover:flex group-focus-visible:flex print:hidden!",
                    align,
                  )}
                  style={{ bottom: `calc(${Math.min(pct, 100)}% + 8px)` }}
                >
                  <span className="font-mono text-[11px] leading-[14px] font-semibold text-muted-foreground">{p.title}</span>
                  <span className="font-display text-[15px] leading-5 font-bold tabular-nums text-foreground">{p.valueText}</span>
                  <span className="text-[13px] leading-5 text-muted-foreground">{p.detail}</span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <span aria-hidden />
      <ol
        aria-hidden
        className={cn(
          "mt-2 flex",
          points.length > 20 ? "gap-px sm:gap-0.5" : points.length > 10 ? "gap-1 sm:gap-1.5" : "gap-2 sm:gap-4",
        )}
      >
        {points.map((p, i) => (
          <li key={p.key} className="relative h-[14px] min-w-0 flex-1">
            <span
              className={cn(
                "absolute top-0 left-1/2 -translate-x-1/2 font-mono text-[11px] leading-[14px] font-semibold whitespace-nowrap text-muted-foreground",
                // Centred under its column; the first and last may run into the axis gutter and card padding.
                !shown(i, 4) && "max-sm:hidden",
                !shown(i, 7) && "sm:max-xl:hidden",
                !shown(i, 10) && "xl:hidden",
              )}
            >
              {p.axisLabel}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export type BarRow = {
  key: string;
  label: React.ReactNode;
  /** Bar length, relative to the largest value in the list. */
  value: number;
  valueText: string;
  detail?: string;
};

/** One horizontal bar: label and figure on one line, a pill bar under them, an optional muted line. */
export function BarItem({ row, max }: { row: BarRow; max: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline gap-3">
        <span className="flex min-w-0 flex-1 items-center gap-2 text-[15px] leading-[23px] font-semibold">{row.label}</span>
        <span className="shrink-0 text-[15px] leading-[23px] font-bold whitespace-nowrap tabular-nums">{row.valueText}</span>
      </div>
      <span aria-hidden className="block h-2 overflow-hidden rounded-pill bg-oat">
        {row.value > 0 ? (
          <span className="block h-full min-w-1 rounded-pill bg-primary" style={{ width: `${max ? (row.value / max) * 100 : 0}%` }} />
        ) : null}
      </span>
      {row.detail ? <span className="text-[13px] leading-5 text-muted-foreground tabular-nums">{row.detail}</span> : null}
    </div>
  );
}

/** A list of horizontal bars, each relative to the largest value in it. */
export function BarList({ rows, className }: { rows: BarRow[]; className?: string }) {
  const max = Math.max(0, ...rows.map((r) => r.value));
  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <BarItem row={r} max={max} />
        </li>
      ))}
    </ul>
  );
}
