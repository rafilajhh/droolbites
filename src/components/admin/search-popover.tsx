"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { popoverClasses, Scrim, toolbarFieldClasses } from "./dropdown";

export type SearchItem = { key: string; href: string; content: React.ReactNode };

/**
 * pen: Order Search / Product Search — the toolbar search field opens a
 * popover with a live query and matching results. Enter applies the query to
 * the table (?q=); picking a result opens it. A result is highlighted (and
 * opened by Enter) only after arrow-key navigation; hover alone just tints it.
 */
export function SearchPopover({
  label,
  placeholder,
  query,
  fetchItems,
  onSubmit,
}: {
  label: string;
  placeholder: string;
  query: string;
  fetchItems: (q: string) => Promise<SearchItem[]>;
  onSubmit: (q: string) => void;
}) {
  const t = useMessages(adminMessages).common;
  const router = useRouter();
  const id = useId();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(query);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const request = useRef(0);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const q = text.trim();
    const ticket = ++request.current;
    const timer = setTimeout(
      async () => {
        if (!q) {
          setItems([]);
          setFailed(false);
          setLoading(false);
          return;
        }
        setLoading(true);
        const next = await fetchItems(q).catch(() => null);
        if (ticket !== request.current) return;
        setFailed(next === null);
        setItems(next ?? []);
        setActive(0);
        setNavigated(false);
        setLoading(false);
      },
      q ? 180 : 0,
    );
    return () => clearTimeout(timer);
  }, [open, text, fetchItems]);

  const show = () => {
    setText(query);
    setOpen(true);
  };
  const hide = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      setActive((i) => (navigated ? Math.min(items.length - 1, i + 1) : 0));
      setNavigated(true);
    } else if (e.key === "ArrowUp" && items.length) {
      setActive((i) => Math.max(0, i - 1));
      setNavigated(true);
    } else if (e.key === "Escape") hide();
    else return;
    e.preventDefault();
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const item = navigated ? items[active] : undefined;
    setOpen(false);
    if (item) router.push(item.href);
    else onSubmit(text.trim());
  };

  // Tab / Shift+Tab (or any focus move) out of the popover closes it.
  const onBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && !e.currentTarget.contains(next)) setOpen(false);
  };

  const listId = `${id}-results`;
  const q = text.trim();
  const expanded = items.length > 0;
  const announcement = !open
    ? ""
    : loading
      ? t.searching
      : expanded
        ? t.results(items.length)
        : failed
          ? t.searchFailed
          : q
            ? t.noMatches(q)
            : "";

  return (
    <div className="relative w-full sm:w-[320px]">
      <button
        ref={triggerRef}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={query ? `${label}: ${query}` : label}
        className={cn(toolbarFieldClasses, "w-full text-left", query && "pr-11")}
      >
        <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        <span
          className={cn(
            "truncate text-[15px] leading-[23px]",
            query ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {query || placeholder}
        </span>
      </button>
      {query && !open ? (
        <button
          type="button"
          onClick={() => onSubmit("")}
          aria-label={t.clearSearch}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground after:absolute after:-inset-1 after:content-[''] hover:bg-card hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}

      {open ? (
        <>
          <Scrim onClick={hide} />
          <div
            role="dialog"
            aria-label={label}
            onBlur={onBlur}
            className={cn(popoverClasses, "top-0 left-0 w-[380px] max-w-[calc(100vw-2rem)]")}
          >
            <form role="search" onSubmit={submit}>
              <div className="flex items-center gap-2.5 rounded-sm px-3 py-2.5 inset-ring-[1.5px] inset-ring-border">
                <Search className="size-[18px] shrink-0 text-foreground" aria-hidden />
                <input
                  ref={inputRef}
                  type="search"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={placeholder}
                  role="combobox"
                  aria-label={label}
                  aria-expanded={expanded}
                  aria-controls={listId}
                  aria-autocomplete="list"
                  aria-activedescendant={navigated && items[active] ? `${id}-r-${active}` : undefined}
                  className="min-w-0 flex-1 bg-transparent text-[15px] leading-[23px] font-semibold text-foreground outline-hidden placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
                />
              </div>
            </form>
            <div id={listId} role="listbox" aria-label={label} className="flex flex-col gap-0.5">
              {items.map((item, i) => (
                <Link
                  key={item.key}
                  id={`${id}-r-${i}`}
                  href={item.href}
                  role="option"
                  tabIndex={-1}
                  aria-selected={navigated && i === active}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => {
                    if (navigated) setActive(i);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm p-2.5 transition-colors",
                    navigated && i === active ? "bg-oat" : "hover:bg-oat",
                  )}
                >
                  {item.content}
                </Link>
              ))}
            </div>
            {q && !loading && items.length === 0 ? (
              <p className={cn("px-2.5 py-2 text-[13px] leading-5", failed ? "text-error" : "text-muted-foreground")}>
                {failed ? t.searchFailed : t.noMatches(q)}
              </p>
            ) : null}
          </div>
        </>
      ) : null}
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/** Two-line result text: bold name + small muted meta. */
export function ResultText({ name, sub }: { name: string; sub: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col">
      <span className="truncate text-[15px] leading-5 font-bold text-foreground">{name}</span>
      <span className="truncate text-xs leading-[18px] text-muted-foreground">{sub}</span>
    </span>
  );
}
