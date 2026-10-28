"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Select the text of the element with this id so the shopper can copy it by hand. */
function selectText(id?: string) {
  const el = id ? document.getElementById(id) : null;
  const selection = window.getSelection();
  if (!el || !selection) return false;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
  return true;
}

/**
 * Outlined "Copy" button from the VA card. If the clipboard API is unavailable or refused,
 * it selects the value (`selectId`), tries the legacy copy command, and otherwise shows a
 * "select it yourself" message. That message is a full-width line, so the parent row must be
 * `flex-wrap`; screen readers hear it once, through the button's live label.
 */
export function CopyButton({
  value,
  label,
  copiedLabel,
  failedLabel,
  ariaLabel,
  selectId,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  failedLabel: string;
  ariaLabel: string;
  selectId?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state !== "copied") return;
    const id = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(id);
  }, [state]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // Older browsers and non-HTTPS origins: copy the selection the old way.
      const selected = selectText(selectId);
      const copied = selected && document.execCommand("copy");
      setState(copied ? "copied" : "failed");
    }
  };

  const copied = state === "copied";
  const failed = state === "failed";
  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={ariaLabel}
        className="relative flex shrink-0 items-center gap-2 rounded-sm px-3.5 py-2.5 text-sm leading-[21px] font-bold text-foreground inset-ring-[1.25px] inset-ring-border transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-card"
      >
        {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
        <span aria-live="polite">
          {copied ? copiedLabel : label}
          {failed ? <span className="sr-only"> · {failedLabel}</span> : null}
        </span>
      </button>
      {failed ? (
        <p aria-hidden className="basis-full text-right text-[13px] leading-5 text-error">
          {failedLabel}
        </p>
      ) : null}
    </>
  );
}
