"use client";

import { useActionState, useRef, useState } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { useMessages } from "@/i18n/client";
import { commonMessages } from "@/i18n/messages/common";
import { cn } from "@/lib/cn";

/** Good enough to catch a missing "@" or top-level domain before a round trip; the server checks again. */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[^\s@.]{2,}$/;

/**
 * pen: Input/Email (hzz1k) inverse override inside the footer. An invalid address is caught here, so the
 * form never submits (and React never resets it): the typed address stays for the fix, with the invalid
 * ring and an alert. Editing the field clears the error; a successful sign-up empties it.
 */
export function NewsletterForm() {
  const f = useMessages(commonMessages).footer;
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, { status: "idle" });
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // The server's verdict shows until the field is edited (it is the same object until the next submit).
  const [seen, setSeen] = useState<NewsletterState | null>(null);
  const serverInvalid = state.status === "invalid" && seen !== state;
  const showInvalid = invalid || serverInvalid;

  return (
    <form
      action={action}
      onSubmit={(event) => {
        const value = input.current?.value.trim() ?? "";
        if (EMAIL.test(value)) {
          setInvalid(false);
          return;
        }
        event.preventDefault();
        setInvalid(true);
        input.current?.focus();
      }}
      className="flex flex-col gap-2"
      noValidate
    >
      <div
        className={cn(
          "flex w-full items-center gap-3 rounded-sm px-4 py-3.5 inset-ring-[1.25px] inset-ring-foreground-inverse focus-within:inset-ring-2",
          // On the moss footer the crimson token is too dark to see; the salmon tint is the error colour here.
          showInvalid && "inset-ring-2 inset-ring-tint-salmon",
        )}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          {f.newsPlaceholder}
        </label>
        <input
          ref={input}
          id="newsletter-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          // A server-side rejection resets the form; the address it rejected comes back as the default.
          defaultValue={state.status === "invalid" ? state.email : undefined}
          onChange={() => {
            setInvalid(false);
            setSeen(state);
          }}
          placeholder={f.newsPlaceholder}
          aria-invalid={showInvalid || undefined}
          aria-describedby="newsletter-msg"
          className="-my-3.5 min-w-0 flex-1 bg-transparent py-3.5 text-base leading-normal text-foreground-inverse outline-hidden placeholder:text-foreground-inverse"
        />
        <button type="submit" disabled={pending} aria-label={f.newsSubmit} className="relative text-foreground-inverse after:absolute after:-inset-3 after:content-[''] disabled:opacity-50">
          <ArrowRight className="size-5" aria-hidden />
        </button>
      </div>
      {/* Only takes space after a submit, so the idle footer matches the pen frame. */}
      {showInvalid ? (
        <p id="newsletter-msg" role="alert" className="flex items-center gap-2 text-[13px] leading-[20px] font-semibold text-tint-salmon">
          <CircleAlert className="size-4 shrink-0" aria-hidden />
          {f.newsInvalid}
        </p>
      ) : (
        <p id="newsletter-msg" className="text-[13px] leading-[20px] text-mint empty:hidden" aria-live="polite">
          {state.status === "ok" ? f.newsThanks : ""}
        </p>
      )}
    </form>
  );
}
