"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";

/** pen: Input/Email (hzz1k) inverse override inside the footer. */
export function NewsletterForm() {
  const f = useMessages(commonMessages).footer;
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, { status: "idle" });

  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      <div className="flex w-full items-center gap-3 rounded-sm px-4 py-3.5 inset-ring-[1.25px] inset-ring-foreground-inverse focus-within:inset-ring-2">
        <label htmlFor="newsletter-email" className="sr-only">
          {f.newsPlaceholder}
        </label>
        <input
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder={f.newsPlaceholder}
          aria-invalid={state.status === "invalid" || undefined}
          className="min-w-0 flex-1 bg-transparent text-base leading-normal text-foreground-inverse outline-hidden placeholder:text-foreground-inverse"
        />
        <button type="submit" disabled={pending} aria-label={f.newsSubmit} className="relative text-foreground-inverse after:absolute after:-inset-3 after:content-[''] disabled:opacity-50">
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
      {/* Only takes space after a submit, so the idle footer matches the pen frame. */}
      <p className="text-[13px] leading-[20px] text-mint empty:hidden" aria-live="polite">
        {state.status === "ok" ? f.newsThanks : state.status === "invalid" ? f.newsInvalid : ""}
      </p>
    </form>
  );
}
