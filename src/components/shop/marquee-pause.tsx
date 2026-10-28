"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

/**
 * The moving part of the USP marquee (WCAG 2.2.2): hovering pauses it, and a
 * transparent button over the whole strip toggles it by click, tap or keyboard.
 * The button sits on top instead of around the track, so the USP list inside
 * stays readable by screen readers.
 */
export function MarqueePause({ label, children }: { label: string; children: React.ReactNode }) {
  const [paused, setPaused] = useState(false);

  return (
    <div className="group relative w-full overflow-hidden py-[18px] motion-reduce:hidden">
      <div
        className={cn(
          "flex w-max animate-marquee group-hover:[animation-play-state:paused]",
          paused && "[animation-play-state:paused]",
        )}
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        aria-label={label}
        className="absolute inset-0 focus-visible:-outline-offset-4"
      />
    </div>
  );
}
