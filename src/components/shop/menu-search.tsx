"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";

/** How long typing pauses before the grid below filters. */
const DEBOUNCE_MS = 200;

/**
 * Toolbar search on the menu page: a real field that filters the grid right below it as you type.
 * (The header's search icon opens the site-wide sheet instead; this one stays where you clicked.)
 */
export function MenuSearch({ query, onCommit }: { query: string; onCommit: (q: string) => void }) {
  const t = useMessages(menuMessages).search;
  const [draft, setDraft] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A query set from elsewhere (the header sheet, back/forward) shows up here, unless you're mid-typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(query);
  }, [query]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const commit = (value: string, delay = DEBOUNCE_MS) => {
    clearTimeout(timer.current);
    const q = value.trim();
    if (q === query) return;
    timer.current = setTimeout(() => onCommit(q), delay);
  };

  return (
    <form
      role="search"
      className="relative w-full max-w-[640px]"
      onSubmit={(e) => {
        e.preventDefault();
        commit(draft, 0);
        inputRef.current?.blur();
      }}
    >
      <label className="flex h-12 w-full cursor-text items-center gap-2.5 rounded-pill bg-white pl-4 inset-ring-[1.25px] inset-ring-muted-foreground/50 transition-shadow focus-within:inset-ring-[1.5px] focus-within:inset-ring-border">
        <Search className="size-[18px] shrink-0 text-foreground" aria-hidden />
        <span className="sr-only">{t.label}</span>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && draft) {
              e.preventDefault();
              setDraft("");
              commit("", 0);
            }
          }}
          placeholder={t.placeholder}
          className="h-full min-w-0 flex-1 bg-transparent pr-4 text-[15px] leading-[23px] font-semibold text-foreground outline-hidden placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
        {draft ? (
          <button
            type="button"
            onClick={() => {
              setDraft("");
              commit("", 0);
              inputRef.current?.focus();
            }}
            aria-label={t.clear}
            className="mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-pill hover:bg-card"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </label>
    </form>
  );
}
