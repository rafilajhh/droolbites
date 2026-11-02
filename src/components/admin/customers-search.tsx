"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { toolbarFieldClasses } from "./dropdown";

/**
 * Toolbar search for Admin / Customers: a plain GET form (?q=, keeping ?tab=), so Enter
 * reloads the list server-side. Sized like the orders toolbar search field.
 */
export function CustomersSearch({
  q,
  tab,
  label,
  placeholder,
  clearLabel,
  clearHref,
}: {
  q: string;
  tab: string | null;
  label: string;
  placeholder: string;
  clearLabel: string;
  clearHref: string;
}) {
  return (
    <form action="/admin/customers" method="get" role="search" className="relative w-full sm:w-[320px]">
      {tab ? <input type="hidden" name="tab" value={tab} /> : null}
      <label
        className={cn(
          toolbarFieldClasses,
          "w-full cursor-text focus-within:inset-ring-[1.5px] focus-within:inset-ring-border",
          q && "pr-11",
        )}
      >
        <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">{label}</span>
        <input
          key={q}
          type="search"
          name="q"
          defaultValue={q}
          maxLength={100}
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent text-[15px] leading-[23px] font-semibold text-foreground outline-hidden placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
        />
      </label>
      {q ? (
        <Link
          href={clearHref}
          aria-label={clearLabel}
          className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground after:absolute after:-inset-1 after:content-[''] hover:bg-card hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </Link>
      ) : null}
    </form>
  );
}
