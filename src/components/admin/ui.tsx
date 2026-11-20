import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Main column of every admin page (pen: Main, 40/48 padding). Capped at 1280px and centred beside the
 * sidebar, so on wide screens a row's label and its figure don't drift a screen apart.
 */
export function AdminMain({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto flex w-full max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 lg:px-12 lg:py-10", className)}>
      {children}
    </div>
  );
}

/** Page title block: optional eyebrow, 44px title, sub line and a right-aligned action. */
export function PageHead({
  eyebrow,
  title,
  sub,
  action,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex w-full flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {eyebrow ? (
          <p className="font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-[34px] leading-none font-bold tracking-[-1px] text-foreground lg:text-[44px]">
          {title}
        </h1>
        {sub ? <p className="text-[15px] leading-[23px] text-muted-foreground">{sub}</p> : null}
      </div>
      {action}
    </div>
  );
}

/** White card with the subtle 1px moss stroke and radius-m. */
export function Card({
  as: Tag = "section",
  className,
  children,
  ...props
}: { as?: "section" | "div"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("rounded-m bg-white inset-ring-1 inset-ring-border-subtle", className)} {...props}>
      {children}
    </Tag>
  );
}

/**
 * The one heading size inside admin pages: every card and card-section h2 (Recent orders, Items
 * ordered, Payment, Opening hours…). Labels (stat names, field groups) are not headings.
 */
export const sectionTitleClasses = "font-display text-[22px] leading-[28px] font-bold text-foreground";

export function SectionTitle({
  as: Tag = "h2",
  className,
  children,
  ...props
}: { as?: "h2" | "h3"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <Tag className={cn(sectionTitleClasses, className)} {...props}>
      {children}
    </Tag>
  );
}

/**
 * One white card split into panes by 1px hairlines (a stat strip, a list beside a side list). The
 * grid's own fill shows through the 1px gaps, so the lines follow any column count and wrap; a
 * row must be full (no empty cell) or the fill shows through it. `cols` sets the grid columns.
 */
export function PaneCard({
  as: Tag = "section",
  className,
  cols,
  children,
  ...props
}: {
  as?: "section" | "div";
  className?: string;
  cols: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn("w-full rounded-m bg-white p-px inset-ring-1 inset-ring-border-subtle", className)} {...props}>
      <div className={cn("grid h-full gap-px overflow-hidden rounded-[19px] bg-border-subtle", cols)}>{children}</div>
    </Tag>
  );
}

/** A pane inside a PaneCard. */
export const paneClasses = "flex min-w-0 flex-col bg-white";

/**
 * A figure in a stat strip: label line with its tinted icon, the number, a sub line. With `href` the
 * whole pane links to the list behind the number.
 */
export function StatPane({
  label,
  icon: Icon,
  iconBg,
  value,
  sub,
  href,
  className,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  iconBg: string;
  value: string;
  sub: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <span className="flex items-center gap-2.5 max-md:col-start-1 max-md:row-start-1">
        <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-pill", iconBg)}>
          <Icon className="size-4 text-foreground" aria-hidden />
        </span>
        <span className="text-sm leading-[21px] font-semibold text-muted-foreground">{label}</span>
      </span>
      <span data-stat-value className="font-display text-[26px] leading-8 font-bold tabular-nums max-md:col-start-2 max-md:row-start-1 max-md:self-center md:text-[32px] md:leading-[38px]">
        {value}
      </span>
      <span className="text-[13px] leading-5 text-muted-foreground max-md:col-span-2 max-md:col-start-1 max-md:row-start-2 max-md:pl-[38px]">{sub}</span>
    </>
  );
  // Below md a compact row: the label on the left and the figure on the right, the sub line under both
  // (beside the figure it got one or two words per line on a phone).
  const classes = cn(
    paneClasses,
    "px-5 py-4 max-md:grid max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-x-4 max-md:gap-y-0.5 md:gap-3 md:px-6 md:py-5",
    className,
  );
  return href ? (
    <Link
      href={href}
      className={cn(classes, "transition-colors duration-150 ease-out hover:bg-background motion-reduce:transition-none")}
    >
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** A settings topic: heading (and its note) on the left from lg, the fields on the right. */
export function SettingsSection({
  id,
  title,
  help,
  children,
}: {
  id: string;
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="grid w-full min-w-0 gap-4 p-5 not-first:shadow-[inset_0_1px_0_var(--border-subtle)] md:p-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10 lg:py-8"
    >
      <div className="flex flex-col gap-1">
        <SectionTitle id={`${id}-title`}>{title}</SectionTitle>
        {help ? <p className="text-[13px] leading-5 text-muted-foreground">{help}</p> : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
}

/** Mono column header text used in every admin table. */
export const thClasses = "text-left font-mono text-xs leading-[18px] font-semibold text-muted-foreground";

/**
 * pen: Toggle (48×28, moss when on). A real checkbox with role="switch" so it
 * posts "on" inside a plain form.
 */
export function Toggle({
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-7 w-12 shrink-0", className)}>
      {/* The input stretches 8px past the track on each side: a 64×44 hit area, same look. */}
      <input type="checkbox" role="switch" className="peer absolute -inset-2 z-10 cursor-pointer opacity-0" {...props} />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-pill bg-muted-foreground/40 transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-[3px] left-[3px] size-[22px] rounded-full bg-white transition-transform peer-checked:translate-x-5 motion-reduce:transition-none"
      />
    </span>
  );
}

/** Small outlined button (EDIT, UPLOAD PHOTO): 12px display caps, 8×14 padding. */
export const smallButtonClasses =
  "inline-flex items-center justify-center gap-2 rounded-sm px-3.5 py-2 font-display text-xs leading-[14px] font-semibold tracking-[0.5px] text-foreground inset-ring-[1.25px] inset-ring-border transition-colors hover:bg-card";

/**
 * Column header cell of an admin list table: the mono label over a 1px hairline, no band (as on the
 * overview's Recent orders and the sales report).
 */
export const listThClasses = `${thClasses} py-3 shadow-[inset_0_-1px_0_var(--border-subtle)]`;

/**
 * The white card around an admin list table. From xl the table has its own column padding (pl-4/pr-4
 * on the outer cells). Below xl, where the sidebar leaves too little room for the columns, the rows
 * stack and sit 16px in from the card edge.
 */
export const listCardClasses = "w-full p-2 max-xl:px-4 max-xl:py-0";

/**
 * The box around a list table inside that card. Only the xl table can be wider than the card, so only it
 * scrolls, and only sideways: the hit-slop of a row's last button or link (`after:-inset-*`) reaches past
 * the box and would otherwise add a stray scrollbar. Below xl the rows wrap, so nothing is scrolled.
 */
export const listScrollClasses = "relative w-full xl:overflow-x-auto xl:overflow-y-hidden";

/**
 * Admin list tables below xl: each row becomes a stacked block of wrapped cells (placed with
 * max-xl:order-*), separated from the next by a hairline inside the one white card. The header row is
 * hidden there, so cells carry a <CellLabel> for screen readers.
 */
export const mobileCardRowClasses =
  "max-xl:flex max-xl:flex-wrap max-xl:items-center max-xl:gap-x-2 max-xl:gap-y-2.5 max-xl:py-4 max-xl:shadow-[inset_0_-1px_0_var(--border-subtle)] max-xl:last:shadow-none";

/** Screen-reader label for a cell whose header row is hidden below `until` (md by default, xl for the list tables). */
export function CellLabel({ until = "md", children }: { until?: "md" | "xl"; children: React.ReactNode }) {
  return <span className={until === "xl" ? "sr-only xl:hidden" : "sr-only md:hidden"}>{children}: </span>;
}
