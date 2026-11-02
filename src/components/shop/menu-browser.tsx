"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClasses } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";
import { CategoryFilter, type FilterOption } from "./category-filter";
import { MenuItemCard } from "./menu-item-card";
import { MenuSearch } from "./menu-search";
import { rankProducts, setMenuParams } from "./menu-url";
import type { ShopCategory } from "./shop-product";

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

export function MenuBrowser({ categories }: { categories: ShopCategory[] }) {
  const t = useMessages(menuMessages);
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const requested = params.get("category");
  const active = categories.some((c) => c.slug === requested) ? requested : null;

  const [filterOpen, setFilterOpen] = useState(false);
  // The result count is announced only after the shopper filters or searches.
  const [filtered, setFiltered] = useState(false);

  const allProducts = categories.flatMap((c) => c.products);
  const matching = new Set((query ? rankProducts(allProducts, query) : allProducts).map((p) => p.id));

  const closeFilter = useCallback(() => setFilterOpen(false), [setFilterOpen]);
  // The toolbar field commits here as you type (debounced), filtering the grid in place.
  const commitSearch = useCallback(
    (q: string) => {
      setFiltered(true);
      setMenuParams({ q: q || null }, "replace");
    },
    [setFiltered],
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
  const filteredView = Boolean(query || active);

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {filtered ? t.results(shown) : ""}
      </p>
      <div className="flex w-full flex-col gap-3 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-6 lg:px-16">
        <MenuSearch query={query} onCommit={commitSearch} />
        <CategoryFilter
          options={options}
          active={active}
          open={filterOpen}
          onToggle={() => setFilterOpen((o) => !o)}
          onClose={closeFilter}
          onSelect={selectCategory}
        />
      </div>

      <div className="flex w-full flex-col gap-14 px-4 pt-10 pb-12 sm:px-8 lg:gap-[72px] lg:px-16 lg:pt-12 lg:pb-20">
        {groups.length === 0 ? (
          <div className="flex w-full flex-col items-start gap-4 rounded-m bg-card p-8 lg:p-12" role="status">
            <p className="font-display text-[28px] leading-[31px] font-semibold">{t.empty.title(query)}</p>
            <p className="text-base leading-[24px] text-muted-foreground">{t.empty.body}</p>
            <Link href="/menu" className={buttonClasses("primary", "mt-2")}>
              {t.empty.reset}
            </Link>
          </div>
        ) : (
          groups.map((g) => {
            const single = g.cats.length === 1;
            const title = single ? g.cats[0].name : t.group.join(g.cats.map((c) => c.name));
            // Full menu: a group of three gets three equal columns at lg. Below lg its tray-size product
            // (at an even index, so it never splits a pair) takes a landscape row and the other two pair up
            // like the cookies. Filtered and search results keep the 2 / 4 widths and start at the left,
            // reading on from the search field; the full menu centres its last row.
            const thirds = !filteredView && g.products.length === 3;
            const bannerId = thirds
              ? g.products.find((p, i) => i % 2 === 0 && p.variants.length > 1)?.id
              : undefined;
            return (
              <section key={g.key} aria-labelledby={`group-${g.key}`} className="flex w-full flex-col gap-7">
                <div className="flex w-full pb-5 shadow-[inset_0_-1px_0_var(--border-subtle)]">
                  <h2
                    id={`group-${g.key}`}
                    className="font-display text-[28px] leading-[30px] font-bold tracking-[-0.5px] text-foreground lg:text-[32px] lg:leading-[34px]"
                  >
                    {title}
                  </h2>
                </div>
                {/* Same widths as a 2 / 4 column grid; on the full menu, centring leaves no hole in the last row. */}
                <div
                  className={cn(
                    "flex w-full flex-wrap gap-x-4 gap-y-8 lg:gap-6",
                    filteredView ? "justify-start" : "justify-center",
                  )}
                >
                  {g.products.map((p) => {
                    const banner = p.id === bannerId;
                    return (
                      <MenuItemCard
                        key={p.id}
                        product={p}
                        layout={banner ? "banner" : thirds ? "third" : undefined}
                        className={cn(
                          banner ? "w-full" : "w-[calc(50%-8px)]",
                          thirds ? "lg:w-[calc((100%-48px)/3)]" : "lg:w-[calc(25%-18px)]",
                        )}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </>
  );
}
