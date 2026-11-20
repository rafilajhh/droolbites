"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

const FADE = "48px";

/**
 * A sideways scroller (a row of pills on a phone) whose edges fade out while there is more to scroll
 * that way, so a cut-off pill reads as "more this way" instead of clipped. Without JS, or when
 * everything fits, nothing fades.
 */
export function ScrollFade({
  as: Tag = "div",
  className,
  children,
  ...props
}: { as?: "div" | "nav"; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const max = el.scrollWidth - el.clientWidth;
      const next = { start: el.scrollLeft > 1, end: el.scrollLeft < max - 1 };
      setEdges((prev) => (prev.start === next.start && prev.end === next.end ? prev : next));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  const mask =
    edges.start || edges.end
      ? `linear-gradient(to right, ${edges.start ? "transparent" : "#000"}, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.end ? "transparent" : "#000"})`
      : undefined;

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", className)}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      {...props}
    >
      {children}
    </Tag>
  );
}
