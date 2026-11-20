"use client";

import { useState } from "react";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { cn } from "@/lib/cn";
import type { ShopProduct } from "./shop-product";

/**
 * Stock note for a size with 0 to 5 left: "Only 3 left" on a mustard tint, "Sold out" on oat.
 * Plex Mono like the other badges, small enough to sit inside a line of text.
 */
export function StockBadge({ left, className }: { left: number; className?: string }) {
  const t = useMessages(menuMessages).stock;
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center rounded-pill px-2 py-0.5 font-mono text-[11px] leading-4 font-semibold whitespace-nowrap text-foreground",
        left === 0 ? "bg-oat" : "bg-tint-mustard",
        className,
      )}
    >
      {left === 0 ? t.soldOut : t.left(left)}
    </span>
  );
}

/** A size tile's second line: the serving note and the stock badge. */
export function SizeSub({ serves, left }: { serves?: string; left?: number }) {
  if (left === undefined) return serves ?? null;
  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {serves ? <span>{serves}</span> : null}
      <StockBadge left={left} />
    </span>
  );
}

/**
 * Size and quantity for the size pickers (size modal, product page, home brownies). Starts on the
 * first size that isn't sold out, and the quantity never goes past what's left of the chosen size.
 */
export function useSizeChoice(product: ShopProduct) {
  const first = product.variants.find((v) => v.left !== 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(first.id);
  const [qty, setQty] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? first;
  const max = variant.left ? variant.left : 99;
  return { variant, setVariantId, qty: Math.min(qty, max), setQty, max, soldOut: variant.left === 0 };
}

/** Why an add was refused (from useAddToCart's `left` and `max`), or the generic error. */
export function useAddError(left: number | null, generic: string, max: number | null = null) {
  const t = useMessages(menuMessages).stock;
  if (max !== null) return t.atMax(max);
  if (left === null) return generic;
  return left === 0 ? t.soldOutNow : t.allInCart(left);
}
