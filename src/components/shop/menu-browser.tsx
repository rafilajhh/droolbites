"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Cutout } from "@/components/ui/snapshot";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { CategoryFilter, type FilterOption } from "./category-filter";
import { MenuItemCard } from "./menu-item-card";
import { MenuSearch } from "./menu-search";
import { rankProducts, setMenuParams } from "./menu-url";
import type { ShopCategory, ShopProduct } from "./shop-product";

const COLUMNS = 4;

type Group = { key: string; categories: ShopCategory[] };

/**
 * Categories that fill a row of four stand alone; smaller neighbours share a
 * group ("Brownies & tiramisu"). Based on the full menu so the layout does
 * not jump around while searching.
 */
function groupCategories(categories: ShopCategory[]): Group[] {
  const groups: Group[] = [];
  let pending: ShopCategory[] = [];
  const flush = () => {
    if (pending.length) groups.push({ key: pending.map((c) => c.slug).join("+"), categories: pending });
    pending = [];
  };
  for (const c of categories) {
    if (c.products.length >= COLUMNS) {
      flush();
      groups.push({ key: c.slug, categories: [c] });
    } else {
      pending.push(c);
    }
  }
  flush();
  return groups;
}

/** "per piece" / "per portion" when every product in the group is sold one way. */
function unitOf(products: ShopProduct[]): "piece" | "portion" | null {
  const names = new Set(products.flatMap((p) => (p.variants.length === 1 ? [p.variants[0].name] : ["multi"])));
  if (names.size !== 1) return null;
  if (names.has("1 piece")) return "piece";
  if (names.has("1 portion")) return "portion";
  return null;
}

export function MenuBrowser({ categories }: { categories: ShopCategory[] }) {
  const t = useMessages(menuMessages);
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const requested = params.get("category");
  const active = categories.some((c) => c.slug === requested) ? requested : null;

  // The header search icon links to /menu?search=1, which opens the search panel.
  const [searchState, setSearchOpen] = useState(false);
  const searchOpen = searchState || params.get("search") === "1";
  const [filterOpen, setFilterOpen] = useState(false);
  // The result count is announced only after the shopper filters or searches.
  const [filtered, setFiltered] = useState(false);

  const allProducts = categories.flatMap((c) => c.products);
  const matching = new Set((query ? rankProducts(allProducts, query) : allProducts).map((p) => p.id));

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    if (new URLSearchParams(window.location.search).has("search")) setMenuParams({ search: null }, "replace");
  }, [setSearchOpen]);
  const closeFilter = useCallback(() => setFilterOpen(false), [setFilterOpen]);
  // The promo tile's button jumps back to the top and opens search. Focusing the search trigger first
  // means focus returns there (not to the tile at the bottom) when the panel closes.
  const toolbarRef = useRef<HTMLDivElement>(null);
  const searchFromPromo = useCallback(() => {
    toolbarRef.current?.querySelector("button")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
    setSearchOpen(true);
  }, [setSearchOpen]);
  const commitSearch = useCallback(
    (q: string) => {
      setSearchOpen(false);
      setFiltered(true);
      setMenuParams({ q: q || null, search: null });
    },
    [setSearchOpen, setFiltered],
  );
  const selectCategory = useCallback(
    (slug: string | null) => {
      setFilterOpen(false);
      setFiltered(true);
      setMenuParams({ category: slug });
    },
    [setFilterOpen, setFiltered],
  );

  const options: FilterOption[] = [
    { slug: null, name: t.filter.all, count: allProducts.length },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.products.length })),
  ];

  const groups = groupCategories(categories)
    .map((g) => {
      const cats = g.categories.filter((c) => !active || c.slug === active);
      const products = cats.flatMap((c) => c.products).filter((p) => matching.has(p.id));
      return { ...g, cats, products };
    })
    .filter((g) => g.products.length > 0);
  const shown = groups.reduce((n, g) => n + g.products.length, 0);

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {filtered ? t.results(shown) : ""}
      </p>
      <div
        ref={toolbarRef}
        className="flex w-full flex-col gap-3 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-6 lg:px-16"
      >
        <MenuSearch
          products={allProducts}
          query={query}
          open={searchOpen}
          onOpen={() => setSearchOpen(true)}
          onClose={closeSearch}
          onCommit={commitSearch}
        />
        <CategoryFilter
          options={options}
          active={active}
          open={filterOpen}
          onToggle={() => setFilterOpen((o) => !o)}
          onClose={closeFilter}
          onSelect={selectCategory}
        />
      </div>

      <div className="flex w-full flex-col gap-14 px-4 pt-10 pb-20 sm:px-8 lg:gap-[72px] lg:px-16 lg:pt-12 lg:pb-28">
        {groups.length === 0 ? (
          <div className="flex w-full flex-col items-start gap-4 rounded-m bg-card p-8 lg:p-12" role="status">
            <p className="font-display text-[28px] leading-[31px] font-semibold">{t.empty.title(query)}</p>
            <p className="text-base leading-[24px] text-muted-foreground">{t.empty.body}</p>
            <Link href="/menu" className={buttonClasses("primary", "mt-2")}>
              {t.empty.reset}
            </Link>
          </div>
        ) : (
          groups.map((g, gi) => {
            const single = g.cats.length === 1;
            const title = single ? g.cats[0].name : t.group.join(g.cats.map((c) => c.name));
            const unit = single ? unitOf(g.products) : null;
            const count = unit ? t.group.flavors(g.products.length, t.unit[unit]) : t.group.desserts(g.products.length);
            const isLast = gi === groups.length - 1;
            const showPromo = isLast && g.products.length % COLUMNS !== 0;
            return (
              <section key={g.key} aria-labelledby={`group-${g.key}`} className="flex w-full flex-col gap-7">
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 pb-5 shadow-[inset_0_-1px_0_var(--border-subtle)]">
                  <h2
                    id={`group-${g.key}`}
                    className="font-display text-[26px] leading-[30px] font-bold text-foreground lg:text-[32px] lg:leading-[35px]"
                  >
                    {title}
                  </h2>
                  <p className="font-mono text-[13px] leading-[20px] font-semibold text-muted-foreground">{count}</p>
                </div>
                <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-6">
                  {g.products.map((p) => (
                    <MenuItemCard key={p.id} product={p} />
                  ))}
                  {showPromo ? <PromoTile onSearch={searchFromPromo} /> : null}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}

/** "Can't decide? Mix a box." tile at the end of the menu (uQ4f5 Promo Tile). */
function PromoTile({ onSearch }: { onSearch: () => void }) {
  const t = useMessages(menuMessages).promo;
  return (
    <div className="relative col-span-2 flex min-h-[260px] flex-col justify-between gap-6 overflow-hidden rounded-m bg-primary [--focus-ring:var(--white)] p-6 lg:col-span-1 lg:min-h-0 lg:p-7">
      {/* Decorative cookie tucked into the corner, clipped by the tile. */}
      <Cutout name="red-velvet" width={150} className="-top-10 -right-10 rotate-[-18deg] sm:-right-8" />
      <Image
        src="/images/site/logo-badge.png"
        alt=""
        width={88}
        height={88}
        quality={100}
        className="size-[72px] rounded-full object-cover lg:size-[88px]"
      />
      <div className="relative flex w-full flex-col gap-3">
        <p className="font-display text-[26px] leading-[28px] font-bold text-white lg:text-[30px] lg:leading-[32px]">
          {t.title}
        </p>
        <p className="text-[15px] leading-[23px] text-mint">{t.body}</p>
      </div>
      <button
        type="button"
        onClick={onSearch}
        className={buttonClasses("secondary", "relative w-fit text-white! inset-ring-white! hover:bg-white/10!")}
      >
        {t.cta}
      </button>
    </div>
  );
}
