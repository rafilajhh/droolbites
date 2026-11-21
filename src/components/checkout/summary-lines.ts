import type { ShortItem } from "@/app/actions/checkout";
import type { Locale } from "@/i18n/config";
import type { Cart } from "@/lib/cart";
import type { FullOrder } from "@/lib/orders";
import { productImageUrl, variantLabel } from "@/content/products";
import { lineMeta, type SummaryLine } from "./order-summary";

export function cartSummaryLines(cart: Cart, locale: Locale): SummaryLine[] {
  return cart.lines.map((line) => ({
    key: line.variantId,
    name: line.productName,
    meta: lineMeta(line.qty, variantLabel(line.variantName, line.categorySlug, locale)),
    lineTotal: line.lineTotal,
    imageUrl: line.imageUrl,
  }));
}

/**
 * Cart lines asking for more than is left, named like the stock error PAY returns ("Fudgy Brownies · 15 × 15 cm",
 * a one-size product alone): both checkout steps warn about them before anything is placed.
 */
export function cartShortItems(cart: Cart): ShortItem[] {
  return cart.lines.flatMap((line) =>
    line.stock !== null && line.qty > line.stock
      ? [
          {
            name: /^1 (piece|portion)$/.test(line.variantName) ? line.productName : `${line.productName} · ${line.variantName}`,
            left: Math.max(line.stock, 0),
          },
        ]
      : [],
  );
}

export function orderSummaryLines(order: FullOrder, locale: Locale): SummaryLine[] {
  return order.items.map((item) => ({
    key: item.id.toString(),
    name: item.variant.product.name,
    meta: lineMeta(item.qty, variantLabel(item.variant.name, item.variant.product.category.slug, locale)),
    lineTotal: item.unitPrice * item.qty,
    // Products added without a photo show the shared placeholder.
    imageUrl: productImageUrl(item.variant.product.slug, item.variant.product.imageUrl),
  }));
}
