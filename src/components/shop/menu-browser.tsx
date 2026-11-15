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

/** Static class names for Tailwind: a group's columns at lg in the shared four-column grid. */
const LG_SPAN = ["lg:col-span-1", "lg:col-span-1", "lg:col-span-2", "lg:col-span-3", "lg:col-span-4"] as const;
const COLUMNS = 4;

/**
 * Lays the groups into rows of the four-column (lg) grid. A group takes as many columns as it has
 * products, up to four; a one-product group shows its card as a two-column landscape banner, so it
 * takes two. Each group goes into the first row it still fits (first fit), which keeps the filter's
 * order except where a later, smaller group can fill a gap ("Brownies" beside "Tiramisu" rather than
 * alone above a full row of cookies). The last group in a row stretches over any columns left, so its
 * heading rule runs to the edge; its cards keep their one-column width.
 */
function packRows<G extends { products: unknown[] }>(groups: G[]) {
  const rows: { used: number; groups: { group: G; span: number }[] }[] = [];
  for (const group of groups) {
    const span = group.products.length === 1 ? 2 : Math.min(group.products.length, COLUMNS);
    const row = rows.find((r) => r.used + span <= COLUMNS);
    if (row) {
      row.groups.push({ group, span });
      row.used += span;
    } else rows.push({ used: span, groups: [{ group, span }] });
  }
  return rows.flatMap((row) =>
    row.groups.map((g, i) => (i === row.groups.length - 1 ? { ...g, span: g.span + COLUMNS - row.used } : g)),
  );
}

export function MenuBrowser({ categories }: { categories: ShopCategory[] }) {
  const t = useMessages(menuMessages);
  const params = useSearchParams();
  const query = (params.get("q") ?? "").trim();
  const requested = params.get("category");
  const active = categories.some((c) => c.slug === requested) ? requested : null;

  // The result count is announced only after the shopper filters or searches.
  const [filtered, setFiltered] = useState(false);

  const allProducts = categories.flatMap((c) => c.products);
  const matching = new Set((query ? rankProducts(allProducts, query) : allProducts).map((p) => p.id));

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
      setFiltered(true);
      setMenuParams({ category: slug });
    },
    [setFiltered],
  );

  // Counts follow the search: how many matches each chip would show.
  const options: FilterOption[] = [
    { slug: null, name: t.filter.all, count: matching.size },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.products.filter((p) => matching.has(p.id)).length })),
  ];

  // One group per category, in the filter's order, with the products the search and category leave.
  const groups = categories
    .filter((c) => !active || c.slug === active)
    .map((c) => ({ key: c.slug, name: c.name, products: c.products.filter((p) => matching.has(p.id)) }))
    .filter((g) => g.products.length > 0);
  const shown = groups.reduce((n, g) => n + g.products.length, 0);

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {filtered ? t.results(shown) : ""}
      </p>
      {/* One row from lg: the search field fills the left, the category control sits beside it at the
          same height. Below lg there's no room for both, so the chips scroll sideways under the field. */}
      <div className="flex w-full flex-col items-start gap-4 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-3 lg:px-16">
        <MenuSearch query={query} onCommit={commitSearch} />
        <CategoryFilter options={options} active={active} onSelect={selectCategory} />
      </div>

      <div className="flex w-full flex-col px-4 pt-10 pb-12 sm:px-8 lg:px-16 lg:pt-12 lg:pb-20">
        {groups.length === 0 ? (
          <div className="flex w-full flex-col items-start gap-4 rounded-m bg-card p-8 lg:p-12" role="status">
            <p className="font-display text-[28px] leading-[31px] font-semibold">{t.empty.title(query)}</p>
            <p className="text-base leading-[24px] text-muted-foreground">{t.empty.body}</p>
            <Link href="/menu" className={buttonClasses("primary", "mt-2")}>
              {t.empty.reset}
            </Link>
          </div>
        ) : (
          // One grid for the whole menu: 2 columns, 4 from lg. Each category is a subgrid on those same
          // tracks, so every card is the same size in every group. Below lg a group takes the full row;
          // from lg groups are packed into full rows (see packRows), so short groups share a row instead
          // of leaving one card alone under a wide heading. Groups and results start at the left edge.
          <div className="grid w-full grid-cols-2 gap-x-4 gap-y-14 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-[72px]">
            {packRows(groups).map(({ group: g, span }) => (
              <section
                key={g.key}
                aria-labelledby={`group-${g.key}`}
                className={cn(
                  "col-span-2 grid grid-cols-subgrid gap-y-8",
                  // A banner fills its section's height, so it ends level with the portrait cards beside it.
                  g.products.length === 1 ? "grid-rows-[auto_1fr]" : "content-start",
                  LG_SPAN[span],
                )}
              >
                <h2
                  id={`group-${g.key}`}
                  className="col-span-full -mb-1 pb-5 font-display text-[28px] leading-[30px] font-bold tracking-[-0.5px] text-foreground shadow-[inset_0_-1px_0_var(--border-subtle)] lg:text-[32px] lg:leading-[34px]"
                >
                  {g.name}
                </h2>
                {g.products.length === 1 ? (
                  <MenuItemCard product={g.products[0]} layout="banner" className="col-span-2" />
                ) : (
                  g.products.map((p) => <MenuItemCard key={p.id} product={p} />)
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
