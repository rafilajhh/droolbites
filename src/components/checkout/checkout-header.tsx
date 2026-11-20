import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";

type StepState = "done" | "current" | "todo";

/**
 * The checkout header: the logo and "Back to menu" on the left, the four steps (Cart, Details, Payment,
 * Done) centred in the header from md as numbered circles joined by lines: done is moss with a check,
 * current is mustard with a soft mustard ring, to-do is oat; the line into a reached step is moss.
 * Every label shows from xl; from md to xl only the current step is labelled. Below md it sits on the right
 * as "Step 3 of 4 · Payment" over the circles without labels. On the last step
 * (the success page) every segment is moss and there is no way back into the flow.
 */
export async function CheckoutHeader({ step }: { step: 2 | 3 | 4 }) {
  const t = (await getMessages(checkoutMessages)).header;
  const finished = step === 4;
  const steps = t.steps.map((label, i) => {
    const n = i + 1;
    const state: StepState = n < step || finished ? "done" : n === step ? "current" : "todo";
    return { label, state, current: n === step };
  });

  return (
    <header className="w-full bg-background shadow-[inset_0_-1px_0_var(--border-subtle)]">
      {/* From md: three columns (left block, steps, an equal empty column) so the steps sit in the true centre. */}
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 md:grid md:h-20 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:px-8 lg:px-16">
        <div className="flex min-w-0 items-center gap-1 md:gap-4">
          <Link href="/" aria-label={t.home} className="shrink-0 rounded-pill">
            <Image
              src="/images/site/logo-badge.png"
              alt="Droolbites"
              width={48}
              height={48}
              quality={100}
              loading="eager"
              className="size-10 rounded-pill object-cover md:size-12"
            />
          </Link>
          {finished ? null : (
            <Link
              href="/menu"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-sm text-sm leading-[21px] font-semibold text-muted-foreground transition-colors hover:text-foreground lg:justify-start"
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="sr-only lg:not-sr-only">{t.back}</span>
            </Link>
          )}
        </div>

        <nav aria-label={t.progress} className="flex shrink-0 flex-col items-end gap-1.5 md:items-center">
          {/* Below md the step's name is said once, in words; the list below keeps its labels for screen readers. */}
          <p aria-hidden className="text-xs leading-[18px] whitespace-nowrap text-muted-foreground md:hidden">
            {t.stepOf(step, steps.length)} · <span className="font-semibold text-foreground">{t.steps[step - 1]}</span>
          </p>
          <ol className="flex items-center">
            {steps.map((s, i) => (
              <li key={s.label} aria-current={s.current ? "step" : undefined} className="flex items-center">
                {/* The line into a step is moss once the flow has reached that step. */}
                {i > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "mx-1.5 w-3 rounded-pill md:mx-2 md:w-6 xl:mx-3 xl:w-12",
                      s.state === "todo" ? "h-0.5 bg-border-divider" : "h-[3px] bg-primary",
                    )}
                  />
                ) : null}
                <span className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-pill text-xs leading-none font-bold tabular-nums md:size-8 md:text-sm",
                      s.state === "done"
                        ? "bg-primary text-primary-foreground"
                        : s.state === "current"
                          ? "bg-highlight text-foreground ring-4 ring-tint-mustard"
                          : "bg-oat text-muted-foreground",
                    )}
                  >
                    {s.state === "done" ? <Check className="size-3.5 md:size-4" strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "text-sm leading-[21px] whitespace-nowrap",
                      // Every label from xl; below it only the current step's, so the bar clears the back link.
                      s.current ? "max-md:sr-only" : "max-xl:sr-only",
                      s.state === "todo" ? "font-medium text-muted-foreground" : "font-semibold text-foreground",
                    )}
                  >
                    {s.label}
                    {s.state === "done" && !s.current ? <span className="sr-only"> ({t.done})</span> : null}
                    {s.current ? <span className="sr-only"> ({t.current})</span> : null}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </nav>
        <div aria-hidden className="max-md:hidden" />
      </div>
    </header>
  );
}
