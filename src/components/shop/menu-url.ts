"use client";

import type { ShopProduct } from "./shop-product";

/**
 * Updates /menu's query string without a server round trip. Next.js keeps
 * useSearchParams in sync with history.pushState/replaceState, so filtering is
 * instant and the back button walks through earlier filters.
 */
export function setMenuParams(next: Record<string, string | null>, mode: "push" | "replace" = "push") {
  const params = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(next)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  if (mode === "push") window.history.pushState(null, "", url);
  else window.history.replaceState(null, "", url);
}

/**
 * Search relevance: name matches first (menu order), then description matches
 * (short copy, then card text; earliest match first), then category matches. Returns null for no match.
 */
export function searchRank(product: ShopProduct, query: string, order: number): [number, number] | null {
  const q = query.toLowerCase();
  if (product.name.toLowerCase().includes(q)) return [0, order];
  const inText = product.searchText.toLowerCase().indexOf(q);
  if (inText >= 0) return [1, inText];
  const inDescription = product.description.toLowerCase().indexOf(q);
  if (inDescription >= 0) return [1, inDescription];
  if (product.categoryName.toLowerCase().includes(q)) return [2, order];
  return null;
}

export function rankProducts(products: ShopProduct[], query: string): ShopProduct[] {
  return products
    .map((p, i) => ({ p, rank: searchRank(p, query, i) }))
    .filter((r): r is { p: ShopProduct; rank: [number, number] } => r.rank !== null)
    .sort((a, b) => a.rank[0] - b.rank[0] || a.rank[1] - b.rank[1])
    .map((r) => r.p);
}

/** Dot colors used by the category dropdown (nIoP5). */
export const categoryDot: Record<string, string> = {
  "soft-cookies": "bg-accent-magenta",
  brownies: "bg-accent-lavender",
  tiramisu: "bg-accent-salmon",
};
