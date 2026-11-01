"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Below lg the order summary (children) folds behind a "Show order summary ·
 * Rp…" bar; from lg the bar hides and the summary always shows.
 */
export function SummaryToggle({
  id,
  labels,
  total,
  className,
  children,
}: {
  id: string;
  labels: { show: string; hide: string };
  total: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("flex w-full flex-col gap-3", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-14 w-full items-center gap-2 rounded-m bg-card px-5 py-3 text-left lg:hidden"
      >
        <span className="text-[15px] leading-[23px] font-semibold text-foreground">{open ? labels.hide : labels.show}</span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-foreground transition-transform motion-reduce:transition-none", open && "rotate-180")}
          aria-hidden
        />
        <span className="ml-auto font-display text-lg leading-6 font-bold text-foreground">{total}</span>
      </button>
      <div id={id} className={cn("w-full", !open && "hidden lg:block")}>
        {children}
      </div>
    </div>
  );
}
