"use client";

import { useState } from "react";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { Badge, type BadgeSize, type BadgeTone } from "@/components/ui/badges";
import { stockLevel, type StockLevel } from "@/lib/stock";
import type { ShopProduct } from "./shop-product";

const toneOf: Record<StockLevel["tone"], BadgeTone> = {
  plenty: "success",
  low: "warning",
  soldOut: "danger",
};

/**
 * Stock badge: mint "20 in stock" / "In stock", mustard "Only 3 left" / "Almost gone", salmon "Sold out".
 * `sm` on cards, size tiles and cart lines; `md` beside the product page price.
 */
export function StockNote({ level, size = "sm", className }: { level: StockLevel; size?: BadgeSize; className?: string }) {
  const t = useMessages(menuMessages).stock;
  const label =
    level.tone === "soldOut"
      ? t.soldOut
      : level.tone === "low"
        ? level.count === null
          ? t.few
          : t.left(level.count)
        : level.count === null
          ? t.inStock
          : t.count(level.count);
  return (
    <Badge tone={toneOf[level.tone]} size={size} className={className}>
      {label}
    </Badge>
  );
}

/** Stock badge for a size with 0 to 5 left: "Only 3 left" on mustard, "Sold out" on salmon. */
export function StockBadge({ left, className }: { left: number; className?: string }) {
  return <StockNote level={stockLevel(left)} className={className} />;
}

/**
 * A size tile's second line: the serving note and the stock badge. The badge is taller than the 13px
 * line, so it hangs 2px over it on each side instead of making that one tile taller than the others.
 */
export function SizeSub({ serves, left }: { serves?: string; left?: number }) {
  if (left === undefined) return serves ?? null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {serves ? <span>{serves}</span> : null}
      <StockBadge left={left} className="-my-0.5" />
    </span>
  );
}

/** The most one cart line takes (MAX_QTY in src/lib/cart.ts, which is server-only). */
const MAX_QTY = 99;

/**
 * Size and quantity for the size pickers (size modal, product page, home brownies). Starts on the
 * first size that isn't sold out, and the quantity never goes past what's in stock of the chosen size.
 */
export function useSizeChoice(product: ShopProduct) {
  const first = product.variants.find((v) => v.left !== 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(first.id);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? first;
  const max = variant.stock ? Math.min(variant.stock, MAX_QTY) : MAX_QTY;
  return { variant, setVariantId, qty: Math.min(qty, max), setQty, max, soldOut: variant.left === 0 };
}

/** Why an add was refused (from useAddToCart's `left` and `max`), or the generic error. */
export function useAddError(left: number | null, generic: string, max: number | null = null) {
  const t = useMessages(menuMessages).stock;
  if (max !== null) return t.atMax(max);
  if (left === null) return generic;
  return left === 0 ? t.soldOutNow : t.allInCart(left);
}
