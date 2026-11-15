"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { toolbarFieldClasses } from "./dropdown";

/** Typing pauses this long before the list below is filtered. */
const DEBOUNCE_MS = 300;

/**
 * Toolbar search for the admin lists: a plain field that filters the table below as you
 * type (?q=, applied after a short pause; Enter applies it at once). No popup: the list
 * itself is the result.
 */
export function SearchField({
  label,
  placeholder,
  query,
  onSearch,
}: {
  label: string;
  placeholder: string;
  /** The query the list is currently filtered by (?q=). */
  query: string;
  onSearch: (q: string) => void;
}) {
  const t = useMessages(adminMessages).common;
  const [text, setText] = useState(query);
  const [synced, setSynced] = useState(query);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Back/forward or a filter link changed ?q=: show it (React's "adjust state on prop change").
  if (query !== synced) {
    setSynced(query);
    setText(query);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const apply = (next: string) => {
    clearTimeout(timer.current);
    if (next.trim() !== query) onSearch(next.trim());
  };

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        apply(text);
      }}
      className="relative w-full sm:w-[320px]"
    >
      <label
        className={cn(
          toolbarFieldClasses,
          "w-full cursor-text focus-within:inset-ring-[1.5px] focus-within:inset-ring-border",
          text && "pr-11",
        )}
      >
        <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">{label}</span>
        <input
          type="search"
          value={text}
          onChange={(e) => {
            const next = e.target.value;
            setText(next);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => apply(next), DEBOUNCE_MS);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape" && text) {
              e.preventDefault();
              setText("");
              apply("");
            }
          }}
          maxLength={100}
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] leading-[23px] font-semibold text-foreground outline-hidden placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {text ? (
        <button
          type="button"
          onClick={() => {
            setText("");
            apply("");
          }}
          aria-label={t.clearSearch}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground after:absolute after:-inset-1 after:content-[''] hover:bg-card hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}
