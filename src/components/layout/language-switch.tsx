"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/i18n/actions";
import { useLocale } from "@/i18n/client";
import { cn } from "@/lib/cn";

/**
 * EN / ID switch. Not in the pen file; styled with the mono chip language
 * so it sits quietly next to the header icons.
 */
export function LanguageSwitch({ className, tone = "default" }: { className?: string; tone?: "default" | "inverse" }) {
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: "en" | "id") => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label={locale === "id" ? "Bahasa" : "Language"}
      className={cn(
        "inline-flex items-center rounded-pill p-0.5 font-mono text-xs font-semibold leading-none",
        tone === "inverse" ? "inset-ring-1 inset-ring-white/60" : "inset-ring-[1.25px] inset-ring-border-subtle",
        pending && "opacity-60",
        className,
      )}
    >
      {(["en", "id"] as const).map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => choose(code)}
            className={cn(
              // Hit-slop to 44px tall; each half also reaches 8px outward, which stays clear of the
              // admin Sign out button (gap-2) and the header search icon (mr-3).
              "relative rounded-pill px-2 py-1.5 uppercase transition-colors after:absolute after:-inset-y-2.5 after:content-['']",
              code === "en" ? "after:-left-2 after:right-0" : "after:left-0 after:-right-2",
              active
                ? tone === "inverse"
                  ? "bg-white text-foreground"
                  : "bg-primary text-primary-foreground"
                : tone === "inverse"
                  ? "text-white hover:bg-white/15"
                  : "text-foreground hover:bg-card",
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
