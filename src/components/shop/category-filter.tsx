"use client";

import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";
import { categoryDot } from "./menu-url";

export type FilterOption = { slug: string | null; name: string; count: number };

const hrefFor = (slug: string | null) => (slug ? `/menu?category=${slug}` : "/menu");

/**
 * The menu's categories, each with its logo-colour dot and a count that follows the search. From lg
 * a segmented control in one white capsule beside the search field, the same 48px tall; below lg a
 * row of chips under the field that scrolls sideways. Links, so they work before JS; with JS they
 * filter in place.
 */
export function CategoryFilter({
  options,
  active,
  onSelect,
}: {
  options: FilterOption[];
  active: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const t = useMessages(menuMessages).filter;

  const select = (e: React.MouseEvent, slug: string | null) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(slug);
  };

  return (
    <nav
      aria-label={t.open}
      // Bleeds to the screen edge while scrolling sideways, so chips don't clip at the page padding.
      className="-mx-4 w-[calc(100%+32px)] shrink-0 overflow-x-auto px-4 [scrollbar-width:none] sm:-mx-8 sm:w-[calc(100%+64px)] sm:px-8 lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
    >
      <ul className="flex w-max items-center gap-2 lg:h-12 lg:gap-1 lg:rounded-pill lg:bg-white lg:p-1 lg:inset-ring-[1.25px] lg:inset-ring-muted-foreground/50">
        {options.map((o) => {
          const isActive = o.slug === active;
          const empty = o.count === 0 && !isActive;
          return (
            <li key={o.slug ?? "all"}>
              <a
                href={hrefFor(o.slug)}
                onClick={(e) => select(e, o.slug)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-pill pr-4 pl-3.5 whitespace-nowrap transition-[background-color,color,opacity] duration-200 lg:h-10",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-white text-foreground inset-ring-1 inset-ring-border-subtle hover:bg-card lg:bg-transparent lg:inset-ring-0 lg:hover:bg-oat",
                  empty && "opacity-55",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    o.slug ? (categoryDot[o.slug] ?? "bg-accent-teal") : isActive ? "bg-highlight" : "bg-primary",
                  )}
                />
                <span className="text-[15px] leading-[18px] font-semibold">{o.name}</span>
                <span
                  className={cn(
                    "min-w-[1ch] font-mono text-xs leading-[14px] font-semibold tabular-nums",
                    isActive ? "text-mint" : "text-muted-foreground",
                  )}
                >
                  {o.count}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
