import { cn } from "@/lib/cn";

/** White card used by each part of Checkout · Details. The header stepper numbers the steps, so the cards are not numbered. */
export function CheckoutSection({
  id,
  title,
  meta,
  className,
  children,
}: {
  id: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex w-full flex-col gap-5 rounded-m bg-white p-5 inset-ring-1 inset-ring-border-subtle sm:p-7", className)}
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
