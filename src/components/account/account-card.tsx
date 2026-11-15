import { cn } from "@/lib/cn";

/** The account's one heading size for a panel section (order history, account information, saved address). */
export const accountTitleClasses =
  "font-display text-[24px] leading-[28px] font-bold tracking-[-0.5px] text-foreground lg:text-[28px] lg:leading-[31px]";

/**
 * A form panel of the account (account information, saved address), flat on the page: from lg the
 * heading and its note take the left third and the fields the rest, so the form never floats in a
 * wide empty box.
 */
export function AccountSection({
  id,
  title,
  sub,
  children,
  className,
}: {
  id: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("grid w-full scroll-mt-[88px] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-12", className)}
    >
      {/* A long form scrolls past its heading, which stays in view beside it from lg. */}
      <div className="flex max-w-[420px] flex-col gap-2 lg:sticky lg:top-[88px] lg:self-start">
        <h2 id={`${id}-title`} className={accountTitleClasses}>
          {title}
        </h2>
        {sub ? <p className="text-[15px] leading-[23px] text-muted-foreground">{sub}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/**
 * One group of an account form panel (recipient, location, sign-in method, …): a small heading over
 * its fields, split from the group above by a hairline, so a long form stays one surface.
 */
export function AccountGroup({
  id,
  title,
  aside,
  children,
  className,
}: {
  id: string;
  title?: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-labelledby={title ? `${id}-title` : undefined}
      className={cn(
        // of-type: a form with a server action starts with React's hidden action inputs.
        "flex w-full flex-col gap-5 py-7 shadow-[inset_0_1px_0_var(--border-subtle)] first-of-type:pt-0 first-of-type:shadow-none last-of-type:pb-0",
        className,
      )}
    >
      {title ? (
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={`${id}-title`} className="font-display text-lg leading-6 font-semibold text-foreground">
            {title}
          </h3>
          {aside}
        </div>
      ) : null}
      {children}
    </section>
  );
}
