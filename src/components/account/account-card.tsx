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
      <div className="flex max-w-[420px] flex-col gap-2">
        <h2 id={`${id}-title`} className={accountTitleClasses}>
          {title}
        </h2>
        {sub ? <p className="text-[15px] leading-[23px] text-muted-foreground">{sub}</p> : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
