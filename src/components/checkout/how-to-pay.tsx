import { Minus, Plus } from "lucide-react";

/**
 * "How to pay" on Checkout · Pay (KKqcJ), straight on the paper under a hairline like the other
 * checkout sections. Native <details> per channel; the first one starts open. The toggle swaps + for − on an oat circle.
 */
export function HowToPay({ title, sections }: { title: string; sections: readonly { title: string; steps: readonly string[] }[] }) {
  return (
    <section
      aria-labelledby="how-to-pay"
      className="flex w-full flex-col pt-8 shadow-[inset_0_1px_0_var(--border-subtle)]"
    >
      <h2 id="how-to-pay" className="font-display text-xl leading-7 font-bold text-foreground sm:text-[22px]">
        {title}
      </h2>
      {sections.map((section, i) => (
        <details
          key={section.title}
          open={i === 0}
          className="group w-full py-6 shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none"
        >
          <summary className="relative flex w-full cursor-pointer list-none items-center gap-6 after:absolute after:-inset-y-3 after:inset-x-0 after:content-[''] [&::-webkit-details-marker]:hidden">
            <span className="flex-1 font-display text-lg leading-[23px] font-semibold text-foreground">{section.title}</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-oat">
              <Plus className="size-[18px] group-open:hidden" aria-hidden />
              <Minus className="hidden size-[18px] group-open:block" aria-hidden />
            </span>
          </summary>
          <ol className="pt-3 text-[15px] leading-[23px] text-muted-foreground">
            {section.steps.map((step, n) => (
              <li key={step}>
                {n + 1}. {step}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </section>
  );
}
