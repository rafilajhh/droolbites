import { cn } from "@/lib/cn";

/** Main column of every admin page (pen: Main, 40/48 padding). */
export function AdminMain({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-12 lg:py-10", className)}>{children}</div>
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
 * Admin order tables below md: each row becomes a stacked card (cells are
 * placed with max-md:order-*). The header row is hidden there, so cells
 * carry a <CellLabel> for screen readers.
 */
export const mobileCardRowClasses =
  "max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-2 max-md:gap-y-2.5 max-md:rounded-sm max-md:bg-white max-md:p-4 max-md:inset-ring-1 max-md:inset-ring-border-subtle";

export function CellLabel({ children }: { children: React.ReactNode }) {
  return <span className="sr-only md:hidden">{children}: </span>;
}
