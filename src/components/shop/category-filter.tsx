"use client";

import { useEffect, useId, useRef } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useModal } from "@/components/layout/shop-ui";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";
import { categoryDot } from "./menu-url";

export type FilterOption = { slug: string | null; name: string; count: number };

const pill = "flex h-[42px] shrink-0 items-center gap-2 rounded-pill px-[18px] transition-colors";
const hrefFor = (slug: string | null) => (slug ? `/menu?category=${slug}` : "/menu");

/**
 * Category tabs (uQ4f5 toolbar) and the "Filter by category" dropdown
 * (nIoP5). The active tab opens the dropdown; the others filter directly.
 * Below lg only the active tab is shown, with a chevron. All tabs are the same
 * <button> (keyed by slug), so the clicked tab keeps focus when it turns active.
 */
export function CategoryFilter({
  options,
  active,
  open,
  onToggle,
  onClose,
  onSelect,
}: {
  options: FilterOption[];
  active: string | null;
  open: boolean;
  onToggle: () => void;
  /** Must be stable (useCallback): the dropdown's focus handling depends on it. */
  onClose: () => void;
  onSelect: (slug: string | null) => void;
}) {
  const t = useMessages(menuMessages).filter;
  const menuId = useId();
  const tabs = useRef(new Map<string, HTMLButtonElement>());
  // After picking from the dropdown, focus the newly active tab (the old one may be hidden below lg).
  const focusActive = useRef(false);

  useEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    tabs.current.get(active ?? "all")?.focus();
  }, [active]);

  const select = (e: React.MouseEvent, slug: string | null) => {
    // Plain links without JS; instant client-side filtering with it.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    focusActive.current = slug !== active;
    onSelect(slug);
  };

  return (
    <div className="relative flex items-center gap-2 max-lg:w-full">
      {options.map((o) => {
        const isActive = o.slug === active;
        const count = (
          <span
            className={cn(
              "font-mono text-xs leading-[14px] font-semibold",
              isActive ? "text-mint" : "text-muted-foreground",
            )}
          >
            {o.count}
          </span>
        );
        const key = o.slug ?? "all";
        return (
          <button
            key={key}
            ref={(el) => {
              if (el) tabs.current.set(key, el);
              else tabs.current.delete(key);
            }}
            type="button"
            onClick={isActive ? onToggle : () => onSelect(o.slug)}
            aria-current={isActive ? "true" : undefined}
            aria-haspopup={isActive ? "dialog" : undefined}
            aria-expanded={isActive ? open : undefined}
            aria-controls={isActive && open ? menuId : undefined}
            aria-label={isActive ? `${t.open}: ${o.name}` : undefined}
            className={cn(
              pill,
              isActive
                ? "bg-primary text-primary-foreground hover:bg-primary-hover"
                : "hidden bg-white inset-ring-1 inset-ring-border-subtle hover:bg-card lg:flex",
            )}
          >
            <span className={cn("text-[15px] leading-[18px] font-semibold", !isActive && "text-foreground")}>
              {o.name}
            </span>
            {count}
            {isActive ? <ChevronDown className="-mr-1 size-4 lg:hidden" aria-hidden /> : null}
          </button>
        );
      })}

      {open ? (
        <Dropdown
          id={menuId}
          options={options}
          active={active}
          heading={t.heading}
          onClose={onClose}
          onSelect={select}
        />
      ) : null}
    </div>
  );
}

function Dropdown({
  id,
  options,
  active,
  heading,
  onClose,
  onSelect,
}: {
  id: string;
  options: FilterOption[];
  active: string | null;
  heading: string;
  onClose: () => void;
  onSelect: (e: React.MouseEvent, slug: string | null) => void;
}) {
  const panelRef = useModal(true, onClose);
  const headingId = `${id}-heading`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/8" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="absolute top-[calc(100%+7.5px)] z-50 flex w-[320px] max-w-[calc(100vw-32px)] flex-col gap-0.5 rounded-m bg-white p-2 shadow-[0_12px_32px_color-mix(in_srgb,var(--ink)_15%,transparent)] inset-ring-1 inset-ring-border-subtle max-lg:left-0 lg:right-0"
      >
        <p
          id={headingId}
          className="px-3 pt-3 pb-1 font-mono text-[11px] leading-[17px] font-semibold tracking-[1px] text-muted-foreground"
        >
          {heading}
        </p>
        <ul className="flex w-full flex-col gap-0.5">
          {options.map((o) => {
            const isActive = o.slug === active;
            return (
              <li key={o.slug ?? "all"}>
                <a
                  href={hrefFor(o.slug)}
                  aria-current={isActive ? "page" : undefined}
                  data-autofocus={isActive || undefined}
                  onClick={(e) => onSelect(e, o.slug)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm p-3 transition-colors",
                    isActive ? "bg-mint" : "hover:bg-oat",
                  )}
                >
                  <span
                    className={cn(
                      "size-2.5 shrink-0 rounded-full",
                      o.slug ? (categoryDot[o.slug] ?? "bg-accent-teal") : "bg-primary",
                    )}
                    aria-hidden
                  />
                  <span
                    className={cn(
                      "flex-1 text-[15px] leading-[23px] text-foreground",
                      isActive ? "font-bold" : "font-medium",
                    )}
                  >
                    {o.name}
                  </span>
                  <span className="min-w-[2ch] text-right font-mono text-xs leading-[18px] text-muted-foreground tabular-nums">
                    {o.count}
                  </span>
                  {/* Every row keeps the check's slot so the counts line up. */}
                  <Check className={cn("size-[18px] shrink-0 text-primary", !isActive && "invisible")} aria-hidden />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
