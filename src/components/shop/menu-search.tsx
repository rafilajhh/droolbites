"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { useModal } from "@/components/layout/shop-ui";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { rankProducts } from "./menu-url";
import type { ShopProduct } from "./shop-product";

const MAX_SUGGESTIONS = 4;

/** Toolbar search field. It opens the suggestions panel (MPMQk) on top of itself. */
export function MenuSearch({
  products,
  query,
  open,
  onOpen,
  onClose,
  onCommit,
}: {
  products: ShopProduct[];
  query: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onCommit: (q: string) => void;
}) {
  const t = useMessages(menuMessages).search;
  const panelId = useId();

  return (
    <div className="relative w-full lg:flex-1">
      <div className="flex h-[47px] w-full items-center rounded-pill bg-white inset-ring-[1.25px] inset-ring-muted-foreground/50">
        <button
          type="button"
          onClick={onOpen}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
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
        {query && !open ? (
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
      {open ? (
        <SearchPanel id={panelId} products={products} query={query} onClose={onClose} onCommit={onCommit} />
      ) : null}
    </div>
  );
}

function SearchPanel({
  id,
  products,
  query,
  onClose,
  onCommit,
}: {
  id: string;
  products: ShopProduct[];
  query: string;
  onClose: () => void;
  onCommit: (q: string) => void;
}) {
  const { search: t, card } = useMessages(menuMessages);
  const router = useRouter();
  const panelRef = useModal(true, onClose);
  const listId = useId();
  const [draft, setDraft] = useState(query);
  // -1: nothing highlighted, so Enter searches for the typed text.
  const [active, setActive] = useState(-1);

  const q = draft.trim();
  const matches = q ? rankProducts(products, q) : products;
  const suggestions = matches.slice(0, MAX_SUGGESTIONS);
  // Options: the suggestions, then "See all results" while there is a query.
  const optionCount = suggestions.length + (q && matches.length ? 1 : 0);
  const activeIndex = Math.min(active, optionCount - 1);

  const choose = (index: number) => {
    const product = suggestions[index];
    if (product) {
      onClose();
      router.push(`/menu/${product.slug}`);
    } else {
      onCommit(q);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && q && optionCount) {
      e.preventDefault();
      setActive((activeIndex + 1) % optionCount);
    } else if (e.key === "ArrowUp" && q && optionCount) {
      e.preventDefault();
      setActive(activeIndex <= 0 ? optionCount - 1 : activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (q && activeIndex >= 0) choose(activeIndex);
      else onCommit(q);
    }
  };

  const optionId = (i: number) => `${listId}-${i}`;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/8" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={t.label}
        className="absolute top-0 left-0 z-50 flex w-full flex-col gap-0.5 rounded-m bg-white p-2 shadow-[0_12px_32px_color-mix(in_srgb,var(--ink)_15%,transparent)] inset-ring-1 inset-ring-border-subtle sm:w-[560px]"
      >
        <div className="flex w-full items-center gap-2.5 rounded-pill p-3 inset-ring-[1.5px] inset-ring-border">
          <Search className="size-[18px] shrink-0 text-foreground" aria-hidden />
          <input
            data-autofocus
            type="search"
            role="combobox"
            aria-label={t.label}
            aria-expanded={optionCount > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={q && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            enterKeyHint="search"
            autoComplete="off"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onKeyDown}
            placeholder={t.placeholder}
            className="h-[23px] min-w-0 flex-1 bg-transparent text-[15px] leading-[23px] font-semibold text-foreground outline-hidden placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
          />
          {draft ? (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                setActive(-1);
                if (query) onCommit("");
              }}
              aria-label={t.clear}
              className="-my-2 -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-pill hover:bg-card"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {suggestions.length ? (
          <>
            <p className="px-3 pt-3 pb-1 font-mono text-[11px] leading-[17px] font-semibold tracking-[1px] text-muted-foreground">
              {t.suggestions}
            </p>
            <ul id={listId} role="listbox" aria-label={t.suggestions} className="flex flex-col gap-0.5">
              {suggestions.map((p, i) => (
                <li
                  key={p.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={q ? i === activeIndex : false}
                  onClick={() => choose(i)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-3 rounded-sm p-2.5",
                    q && i === activeIndex && "bg-oat",
                  )}
                >
                  <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-oat">
                    <Image src={p.imageUrl} alt="" fill sizes="44px" quality={100} className="object-cover" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] leading-[20px] font-bold text-foreground">{p.name}</span>
                    <span className="text-xs leading-[18px] text-muted-foreground">{p.categoryName}</span>
                  </span>
                  <span className="shrink-0 text-sm leading-[21px] font-semibold text-foreground">
                    {p.variants.length > 1 ? card.from(formatRupiah(p.fromPrice)) : formatRupiah(p.fromPrice)}
                  </span>
                </li>
              ))}
              {q ? (
                <li
                  id={optionId(suggestions.length)}
                  role="option"
                  aria-selected={activeIndex === suggestions.length}
                  onClick={() => onCommit(q)}
                  onMouseEnter={() => setActive(suggestions.length)}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between p-3 shadow-[inset_0_1px_0_var(--border-subtle)]",
                    activeIndex === suggestions.length && "rounded-b-s bg-oat",
                  )}
                >
                  <span className="text-sm leading-[21px] font-semibold text-foreground">{t.seeAll(q)}</span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </li>
              ) : null}
            </ul>
          </>
        ) : (
          <p className="px-3 py-4 text-sm leading-[21px] text-muted-foreground" role="status">
            {t.none(q)}
          </p>
        )}
      </div>
    </>
  );
}
