"use client";

import { Search, X } from "lucide-react";
import { useShopUI } from "@/components/layout/shop-ui";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";

/** Toolbar search field: shows the current query and opens the site-wide search sheet. */
export function MenuSearch({ query, onCommit }: { query: string; onCommit: (q: string) => void }) {
  const t = useMessages(menuMessages).search;
  const { panel, open } = useShopUI();

  return (
    <div className="relative w-full lg:flex-1">
      <div className="flex h-[47px] w-full items-center rounded-pill bg-white inset-ring-[1.25px] inset-ring-muted-foreground/50">
        <button
          type="button"
          onClick={() => open("search")}
          aria-haspopup="dialog"
          aria-expanded={panel === "search"}
          aria-label={query ? `${t.open}: ${query}` : t.open}
          className="flex h-full min-w-0 flex-1 items-center gap-2.5 rounded-pill pl-4 text-left"
        >
          <Search className="size-[18px] shrink-0 text-foreground" aria-hidden />
          <span
            className={cn(
              "truncate text-[15px] leading-[23px]",
              query ? "font-semibold text-foreground" : "text-muted-foreground",
            )}
          >
            {query || t.placeholder}
          </span>
        </button>
        {query ? (
          <button
            type="button"
            onClick={() => onCommit("")}
            aria-label={t.clear}
            className="mr-1.5 flex size-9 shrink-0 items-center justify-center rounded-pill hover:bg-card"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  );
}
