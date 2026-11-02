"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search, X } from "lucide-react";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { rankProducts } from "@/components/shop/menu-url";
import type { ShopCategory } from "@/components/shop/shop-product";
import { photoFrame } from "@/components/ui/snapshot";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { useModal, useShopUI } from "./shop-ui";

const MAX_RESULTS = 5;

/**
 * Site-wide search, opened in place from the header (or the menu toolbar): a sheet that eases down
 * under the header over a dimmed page. Empty, it offers the categories; results appear as you type.
 * Always mounted, like the nav drawer, so it animates both ways.
 */
export function SearchOverlay({ categories }: { categories: ShopCategory[] }) {
  const { search: t, card } = useMessages(menuMessages);
  const { panel, close } = useShopUI();
  const isOpen = panel === "search";
  const panelRef = useModal(isOpen, close);
  const router = useRouter();
  const listId = useId();
  const [draft, setDraft] = useState("");
  // -1: nothing highlighted, so Enter searches for the typed text.
  const [active, setActive] = useState(-1);
  const wasOpen = useRef(false);

  // Each opening starts from the menu's current query (or empty elsewhere).
  useEffect(() => {
    if (isOpen && !wasOpen.current) {
      const onMenu = window.location.pathname === "/menu";
      setDraft(onMenu ? (new URLSearchParams(window.location.search).get("q") ?? "") : "");
      setActive(-1);
    }
    wasOpen.current = isOpen;
  }, [isOpen]);

  const products = categories.flatMap((c) => c.products);
  const q = draft.trim();
  const results = q ? rankProducts(products, q).slice(0, MAX_RESULTS) : [];
  // Options: the results, then "See all results" while there is a query.
  const optionCount = q ? results.length + 1 : 0;
  const activeIndex = Math.min(active, optionCount - 1);
  const optionId = (i: number) => `${listId}-${i}`;

  const go = (href: string) => {
    close();
    router.push(href);
  };
  const choose = (index: number) => {
    const product = results[index];
    go(product ? `/menu/${product.slug}` : `/menu?q=${encodeURIComponent(q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && optionCount) {
      e.preventDefault();
      setActive((activeIndex + 1) % optionCount);
    } else if (e.key === "ArrowUp" && optionCount) {
      e.preventDefault();
      setActive(activeIndex <= 0 ? optionCount - 1 : activeIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0) choose(activeIndex);
      else go(q ? `/menu?q=${encodeURIComponent(q)}` : "/menu");
    }
  };

  return (
    <div className={cn("fixed inset-0 z-50", !isOpen && "pointer-events-none")} inert={!isOpen}>
      <div
        className={cn(
          "absolute inset-0 bg-ink/30 transition-opacity duration-300 ease-out",
          isOpen ? "opacity-100" : "opacity-0",
        )}
        onClick={close}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center px-3 pt-3 sm:px-6 sm:pt-20">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={t.label}
          className={cn(
            "pointer-events-auto flex max-h-[calc(100dvh-24px)] w-full max-w-[640px] flex-col overflow-y-auto rounded-m bg-background p-2 shadow-[0_24px_48px_color-mix(in_srgb,var(--ink)_18%,transparent)] sm:max-h-[calc(100dvh-112px)]",
            // Ease-out-quint in, a quicker ease-in out; reduced motion keeps only the fade.
            "transition-[opacity,translate,scale] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity",
            isOpen
              ? "translate-y-0 scale-100 opacity-100 duration-300"
              : "-translate-y-3 scale-[0.98] opacity-0 duration-150 ease-in motion-reduce:translate-y-0 motion-reduce:scale-100",
          )}
        >
          <div className="flex w-full items-center gap-3 rounded-pill bg-white py-3 pr-2 pl-5 inset-ring-[1.5px] inset-ring-border">
            <Search className="size-5 shrink-0 text-foreground" aria-hidden />
            <input
              data-autofocus
              type="search"
              role="combobox"
              aria-label={t.label}
              aria-expanded={optionCount > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
              enterKeyHint="search"
              autoComplete="off"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onKeyDown}
              placeholder={t.placeholder}
              className="h-7 min-w-0 flex-1 bg-transparent text-[17px] leading-7 font-semibold text-foreground outline-hidden placeholder:font-normal placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="button"
              onClick={close}
              aria-label={t.close}
              className="relative flex size-9 shrink-0 items-center justify-center rounded-pill transition-colors after:absolute after:-inset-1 after:content-[''] hover:bg-card"
            >
              <X className="size-[18px]" aria-hidden />
            </button>
          </div>

          {q ? (
            results.length ? (
              <ul id={listId} role="listbox" aria-label={t.label} className="flex flex-col gap-0.5 pt-2">
                {results.map((p, i) => (
                  <li
                    key={p.id}
                    id={optionId(i)}
                    role="option"
                    aria-selected={i === activeIndex}
                    onClick={() => choose(i)}
                    onMouseEnter={() => setActive(i)}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-sm p-2.5 transition-[background-color,opacity] duration-200 starting:opacity-0",
                      i === activeIndex && "bg-oat",
                    )}
                  >
                    <span className={cn(photoFrame, "size-12 shrink-0 rounded-sm bg-oat")}>
                      <Image src={p.imageUrl} alt="" fill sizes="48px" quality={100} className="object-cover" />
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
                <li
                  id={optionId(results.length)}
                  role="option"
                  aria-selected={activeIndex === results.length}
                  onClick={() => choose(results.length)}
                  onMouseEnter={() => setActive(results.length)}
                  className={cn(
                    "mt-1 flex w-full cursor-pointer items-center justify-between rounded-sm px-3 py-3 shadow-[inset_0_1px_0_var(--border-subtle)] transition-colors",
                    activeIndex === results.length && "bg-oat",
                  )}
                >
                  <span className="text-sm leading-[21px] font-semibold text-foreground">{t.seeAll(q)}</span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden />
                </li>
              </ul>
            ) : (
              <p className="px-4 pt-4 pb-3 text-sm leading-[21px] text-muted-foreground" role="status">
                {t.none(q)}
              </p>
            )
          ) : null}

          {/* Before (or instead of) results: the three ways into the menu. */}
          {!q || !results.length ? (
            <div className="flex flex-col gap-2.5 px-3 pt-4 pb-3">
              <p className="font-mono text-[11px] leading-[17px] font-semibold tracking-[1px] text-muted-foreground">
                {t.browse}
              </p>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/menu?category=${c.slug}`}
                    onClick={close}
                    className="flex min-h-11 items-center rounded-pill bg-white px-4 text-sm leading-[21px] font-semibold text-foreground inset-ring-[1.25px] inset-ring-border-subtle transition-colors hover:bg-oat"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
