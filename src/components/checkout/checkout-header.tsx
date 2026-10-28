import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import { getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";

/**
 * pen: Checkout Header (zWLto). `step` is the current step (1 Cart … 4 Done);
 * earlier steps show a check. On phones only the current step keeps its label.
 */
export async function CheckoutHeader({ step }: { step: 2 | 3 | 4 }) {
  const t = (await getMessages(checkoutMessages)).header;

  return (
    <header className="flex h-[72px] w-full items-center justify-between gap-2 bg-background px-4 sm:gap-3 shadow-[inset_0_-1px_0_var(--border-subtle)] md:h-24 md:px-8 lg:px-16">
      <div className="flex items-center gap-3 lg:w-[280px] lg:shrink-0">
        <Link href="/" aria-label={t.home} className="shrink-0 rounded-pill">
          <Image
            src="/images/site/logo-badge.png"
            alt="Droolbites"
            width={56}
            height={56}
            quality={100}
            priority
            className="size-10 rounded-pill object-cover md:size-14"
          />
        </Link>
        <Link
          href="/menu"
          className="relative flex shrink-0 items-center gap-1.5 text-sm leading-normal font-semibold text-muted-foreground transition-colors after:absolute after:-inset-x-2 after:-inset-y-3.5 after:content-[''] hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <span className="sr-only md:not-sr-only">{t.back}</span>
        </Link>
      </div>

      <nav aria-label={t.progress}>
        <ol className="flex items-center gap-1 sm:gap-3">
          {t.steps.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const current = n === step;
            const content = (
              <>
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-pill text-xs leading-none font-bold sm:size-7",
                    done ? "bg-primary text-primary-foreground" : current ? "bg-highlight text-foreground" : "bg-card text-foreground",
                  )}
                  aria-hidden
                >
                  {done ? "✓" : n}
                </span>
                <span
                  className={cn(
                    "text-sm leading-normal font-semibold whitespace-nowrap",
                    done || current ? "text-foreground" : "text-muted-foreground",
                    current ? "" : "sr-only sm:not-sr-only",
                  )}
                >
                  {label}
                  {done ? <span className="sr-only"> ({t.done})</span> : null}
                  {current ? <span className="sr-only"> ({t.current})</span> : null}
                </span>
              </>
            );
            return (
              <li key={label} className="flex items-center gap-1 sm:gap-3" aria-current={current ? "step" : undefined}>
                {i > 0 ? <span className="h-[1.5px] w-2 bg-border-subtle sm:w-10" aria-hidden /> : null}
                {done && n === 1 ? (
                  // The finished Cart step links back to the menu, where the header opens the cart drawer.
                  <Link
                    href="/menu"
                    className="relative flex items-center gap-2 rounded-pill after:absolute after:-inset-2.5 after:content-[''] [&:hover>span:last-child]:underline"
                  >
                    {content}
                  </Link>
                ) : (
                  <span className="flex items-center gap-2">{content}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex items-center justify-end gap-2 lg:w-[280px] lg:shrink-0">
        <Lock className="size-4 text-primary" aria-hidden />
        <span className="text-xs leading-normal font-semibold text-foreground sm:text-sm lg:hidden" aria-hidden>
          {t.secureShort}
        </span>
        <span className="sr-only text-sm leading-normal font-semibold text-foreground lg:not-sr-only">{t.secure}</span>
      </div>
    </header>
  );
}
