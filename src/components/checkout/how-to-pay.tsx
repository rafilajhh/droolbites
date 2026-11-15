import { Minus, Plus } from "lucide-react";

/**
 * "How to pay", the last part of the payment card on Checkout · Pay: the chosen method's own steps sit on
 * the card under a hairline, on a paper band so they read as the card's instructions. Native <details>
 * per channel (m-BCA, ATM, KlikBCA …); the first one starts open. The toggle swaps + for − on an oat circle.
 */
export function HowToPay({ title, sections }: { title: string; sections: readonly { title: string; steps: readonly string[] }[] }) {
  return (
    <section aria-labelledby="how-to-pay" className="flex w-full flex-col bg-background shadow-[inset_0_1px_0_var(--border-subtle)]">
      <h2 id="how-to-pay" className="px-5 pt-5 pb-1 font-display text-lg leading-[23px] font-bold text-foreground sm:px-6">
        {title}
      </h2>
      {sections.map((section, i) => (
        <details
          key={section.title}
          open={i === 0}
          className="group w-full px-5 shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none sm:px-6"
        >
          <summary className="flex min-h-14 w-full cursor-pointer list-none items-center gap-4 py-3 [&::-webkit-details-marker]:hidden">
            <span className="flex-1 text-[15px] leading-[23px] font-semibold text-foreground">{section.title}</span>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-oat transition-colors group-hover:bg-card-accent">
              <Plus className="size-4 group-open:hidden" aria-hidden />
              <Minus className="hidden size-4 group-open:block" aria-hidden />
            </span>
          </summary>
          <ol className="flex list-decimal flex-col gap-1.5 pb-5 pl-5 text-[15px] leading-[23px] text-muted-foreground marker:font-semibold marker:text-foreground">
            {section.steps.map((step) => (
              <li key={step} className="pl-1">
                {step}
              </li>
            ))}
          </ol>
        </details>
      ))}
    </section>
  );
}
