"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Outlined "Copy" button from the VA card. */
export function CopyButton({
  value,
  label,
  copiedLabel,
  ariaLabel,
}: {
  value: string;
  label: string;
  copiedLabel: string;
  ariaLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={ariaLabel}
      className="relative flex shrink-0 items-center gap-2 rounded-sm px-3.5 py-2.5 text-sm leading-[21px] font-bold text-foreground inset-ring-[1.25px] inset-ring-border transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-card"
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span aria-live="polite">{copied ? copiedLabel : label}</span>
    </button>
  );
}
