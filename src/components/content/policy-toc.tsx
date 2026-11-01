"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * "On this page" list from the policy frames. Highlights the section being
 * read (oat fill + moss bar); the first one is active until the reader scrolls
 * past it, the last one once the page is scrolled to the end.
 */
export function PolicyToc({ heading, items }: { heading: string; items: { id: string; title: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  // Set by a click on the list so the clicked entry stays highlighted even when the
  // page cannot scroll it to the top (the last sections near the page end).
  // Cleared by the next scroll the reader starts (wheel, touch, keys).
  const pinned = useRef<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    // Scroll spy: at the very end of the page the last section wins (a short last
    // section never reaches the line); otherwise the last section whose top has
    // passed the active line (160px down, or a third of a short viewport) is
    // active, and the first one while the reader is still above it.
    let frame = 0;
    const update = () => {
      frame = 0;
      if (pinned.current) return;
      const doc = document.documentElement;
      const atBottom = window.scrollY + window.innerHeight >= doc.scrollHeight - 2;
      const line = Math.min(window.innerHeight / 3, 160);
      let current = sections[0];
      if (atBottom) current = sections[sections.length - 1];
      else for (const section of sections) if (section.getBoundingClientRect().top <= line) current = section;
      setActive(current.id);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const unpin = () => {
      pinned.current = null;
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", unpin, { passive: true });
    window.addEventListener("touchstart", unpin, { passive: true });
    window.addEventListener("keydown", unpin);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", unpin);
      window.removeEventListener("touchstart", unpin);
      window.removeEventListener("keydown", unpin);
    };
  }, [items]);

  return (
    <nav aria-label={heading} className="flex w-full flex-col gap-1.5 lg:sticky lg:top-[88px] lg:w-[300px] lg:shrink-0 lg:self-start">
      <p className="font-mono text-xs leading-[18px] font-semibold tracking-[1px] text-muted-foreground">{heading}</p>
      {items.map((item) => {
        const isActive = item.id === active;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={isActive ? "location" : undefined}
            onClick={() => {
              pinned.current = item.id;
              setActive(item.id);
            }}
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
