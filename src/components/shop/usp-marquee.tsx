import type { LucideIcon } from "lucide-react";
import { MarqueePause } from "./marquee-pause";
import { UspItem } from "./usp-item";

type Usp = { icon: LucideIcon; label: string };

/** How many times the four items repeat inside each half, so wide screens never show the seam. */
const REPEAT = 2;

/**
 * pen: USP Strip (F2zhze) on bg-card, 18px vertical padding, 56px between items —
 * running as an endless marquee. The track holds two identical halves and slides
 * by -50%, so the loop has no visible jump. Hover pauses it; clicking, tapping
 * or pressing the strip toggles a pause (MarqueePause).
 * With reduced motion the strip is the static, centered row from the pen.
 */
export function UspMarquee({ items, label, pauseLabel }: { items: Usp[]; label: string; pauseLabel: string }) {
  const half = Array.from({ length: REPEAT }, () => items).flat();

  return (
    <section aria-label={label} className="w-full bg-card">
      {/* Static version: reduced motion only. */}
      <ul className="hidden w-full grid-cols-1 gap-x-14 gap-y-3 px-6 py-[18px] motion-reduce:grid sm:grid-cols-2 lg:motion-reduce:flex lg:justify-center lg:px-16">
        {items.map((u) => (
          <UspItem key={u.label} icon={u.icon} label={u.label} />
        ))}
      </ul>

      <MarqueePause label={pauseLabel}>
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1 || undefined} className="flex shrink-0 items-center gap-14 pr-14">
            {half.map((u, i) => (
              <UspItem
                key={`${u.label}-${i}`}
                icon={u.icon}
                label={u.label}
                // Only the first set is read by screen readers; the rest is visual repetition.
                hidden={copy === 0 && i >= items.length}
              />
            ))}
          </ul>
        ))}
      </MarqueePause>
    </section>
  );
}
