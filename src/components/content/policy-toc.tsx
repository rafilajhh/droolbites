"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * "On this page" list from the policy frames. Highlights the section being
 * read (oat fill + moss bar); the first one is active until the reader scrolls.
 */
export function PolicyToc({ heading, items }: { heading: string; items: { id: string; title: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // Active band: from just under the sticky header (72px / 100px) to a third down the viewport.
    // The first section (document order) touching the band is active; when none does
    // (a long section spans it) the previous one stays active.
    // A short last section never reaches the band, so once it is fully on screen
    // (the reader hit the end of the page) it wins.
    const visible = new Set<string>();
    const last = sections[sections.length - 1];
    let lastFullyVisible = false;
    const update = () => {
      const current = lastFullyVisible ? last : sections.find((section) => visible.has(section.id));
      if (current) setActive(current.id);
    };
    const band = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        update();
      },
      { rootMargin: "-110px 0px -66% 0px" },
    );
    const end = new IntersectionObserver(
      ([entry]) => {
        lastFullyVisible = entry.intersectionRatio >= 0.99;
        update();
      },
      { threshold: [0.99] },
    );
    for (const section of sections) band.observe(section);
    end.observe(last);
    return () => {
      band.disconnect();
      end.disconnect();
    };
  }, [items]);

  return (
    <nav aria-label={heading} className="flex w-full flex-col gap-1.5 lg:sticky lg:top-8 lg:w-[300px] lg:shrink-0 lg:self-start">
      <p className="font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-muted-foreground">{heading}</p>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "location" : undefined}
            onClick={() => setActive(item.id)}
            className={cn(
              "flex items-center gap-2.5 rounded-sm px-3.5 py-2.5 text-[15px] leading-[23px] text-foreground transition-colors",
              isActive ? "bg-card font-bold" : "font-medium hover:bg-card/60",
            )}
          >
            <span className={cn("h-[18px] w-[3px] shrink-0 rounded-[2px]", isActive && "bg-primary")} aria-hidden />
            {item.title}
          </a>
        );
      })}
    </nav>
  );
}
