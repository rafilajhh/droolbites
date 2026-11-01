import type { Locale } from "@/i18n/config";
import type { Cart } from "@/lib/cart";
import type { FullOrder } from "@/lib/orders";
import { variantLabel } from "@/content/products";
import { lineMeta, type SummaryLine } from "./order-summary";

export function cartSummaryLines(cart: Cart, locale: Locale): SummaryLine[] {
  return cart.lines.map((line) => ({
    key: line.variantId,
    name: line.productName,
    meta: lineMeta(line.qty, variantLabel(line.variantName, line.categorySlug, locale), true),
    lineTotal: line.lineTotal,
    imageUrl: line.imageUrl,
  }));
}

export function orderSummaryLines(order: FullOrder, locale: Locale): SummaryLine[] {
  return order.items.map((item) => ({
    key: item.id.toString(),
    name: item.variant.product.name,
    meta: lineMeta(item.qty, variantLabel(item.variant.name, item.variant.product.category.slug, locale), true),
    lineTotal: item.unitPrice * item.qty,
    imageUrl: item.variant.product.imageUrl,
  }));
}
