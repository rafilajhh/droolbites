import { cn } from "@/lib/cn";

/**
 * The page frame every checkout step shares (details, payment, pay, success): the step's own
 * column on the left and the order summary on the right, 440px and sticky from lg so the receipt
 * stays beside whatever part of the step is on screen. The checkout header does not stick, so the
 * summary sits 24px from the top of the viewport. Below lg it is one column; `summaryFirst` puts
 * the summary's toggle bar above the step (details and payment) instead of under it.
 */
export function CheckoutColumns({
  summary,
  summaryFirst = false,
  className,
  children,
}: {
  summary: React.ReactNode;
  summaryFirst?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  // From lg the summary can scroll on its own (a long order on a short screen) and holds nothing
  // focusable there, so it takes focus itself for keyboard scrolling; its name comes from the
  // summary's own heading.
  const aside = (
    <div
      tabIndex={0}
      aria-labelledby="order-summary-title"
      className={cn(
        "w-full lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:w-[440px] lg:shrink-0 lg:overflow-y-auto lg:rounded-m",
        summaryFirst && "lg:order-last",
      )}
    >
      {summary}
    </div>
  );
  return (
    <div
      className={cn(
        "flex w-full flex-col gap-8 px-4 pt-8 pb-16 md:px-8 lg:flex-row lg:items-start lg:gap-16 lg:px-16 lg:pt-12 lg:pb-24",
        className,
      )}
    >
      {summaryFirst ? aside : null}
      <div className="flex w-full min-w-0 flex-1 flex-col">{children}</div>
      {summaryFirst ? null : aside}
    </div>
  );
}

/** The step's heading: an optional badge or icon above the `type-checkout` h1, and one muted line under it. */
export function CheckoutHeading({ lead, title, sub }: { lead?: React.ReactNode; title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2.5">
      {lead}
      <h1 className="type-checkout font-display font-bold text-balance text-foreground">{title}</h1>
      {sub ? <p className="max-w-[600px] text-[17px] leading-[26px] text-pretty text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

/**
 * One part of a checkout step, straight on the paper: a hairline above, the heading (with an
 * optional link or action on its right) and the content. Sections follow each other with 32px of
 * space, so the only bordered things inside are the fields and choice tiles themselves.
 *
 * `named` (default) makes the section a region named by its heading. Turn it off when a fieldset
 * inside is already named by the same heading, so the question is not announced twice.
 */
export function CheckoutSection({
  id,
  title,
  meta,
  named = true,
  className,
  children,
}: {
  id: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  named?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={named ? id : undefined}
      className={cn("flex w-full flex-col gap-5 pt-8 shadow-[inset_0_1px_0_var(--border-subtle)]", className)}
    >
      {/* Top-aligned so the meta stays on the heading's first line when it wraps. */}
      <div className="flex w-full items-start gap-3">
        <h2 id={id} className="min-w-0 flex-1 font-display text-xl leading-7 font-bold text-balance text-foreground sm:text-[22px]">
          {title}
        </h2>
        {meta ? <div className="flex h-7 shrink-0 items-center">{meta}</div> : null}
      </div>
      {children}
    </section>
  );
}

/** The amount the step's button leads to, echoed beside it (pinned bar below lg, end of the column from lg). */
export function TotalEcho({ label, note, amount }: { label: React.ReactNode; note?: React.ReactNode; amount: string }) {
  return (
    <p className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[13px] leading-5 text-muted-foreground lg:text-sm lg:leading-[21px]">{label}</span>
      <span className="font-display text-xl leading-6 font-bold text-foreground tabular-nums lg:text-[28px] lg:leading-[31px]">{amount}</span>
      {/* Below lg the pinned bar keeps to two lines; the summary bar above the form has the delivery row. */}
      {note ? <span className="hidden truncate text-[13px] leading-5 text-muted-foreground lg:block">{note}</span> : null}
    </p>
  );
}

/** Label/value rows straight on the paper between hairlines: the payment step's review and the success page's facts. */
export function ReviewRows({ rows, className }: { rows: { label: string; value: React.ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex w-full flex-col shadow-[inset_0_1px_0_var(--border-subtle)]", className)}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex w-full flex-col gap-1 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none sm:flex-row sm:items-baseline sm:gap-4"
        >
          <dt className="text-sm leading-[21px] text-muted-foreground sm:w-[150px] sm:shrink-0">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-[15px] leading-[23px] font-semibold break-words text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
