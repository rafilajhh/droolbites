import { cn } from "@/lib/cn";

/** White numbered card used by each step of Checkout · Details. */
export function CheckoutSection({
  id,
  num,
  title,
  meta,
  className,
  children,
}: {
  id: string;
  num: number;
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
      <div className="flex w-full items-center gap-3">
        <span
          className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-primary text-sm leading-none font-bold text-primary-foreground"
          aria-hidden
        >
          {num}
        </span>
        <h2 id={id} className="min-w-0 flex-1 font-display text-xl leading-7 font-bold text-foreground sm:text-2xl">
          {title}
        </h2>
        {meta}
      </div>
      {children}
    </section>
  );
}

/** White card with a 22px heading and a small note on the right (payment groups, How to pay). */
export function CheckoutCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex w-full flex-col rounded-m bg-white inset-ring-1 inset-ring-border-subtle", className)}>
      {children}
    </div>
  );
}
