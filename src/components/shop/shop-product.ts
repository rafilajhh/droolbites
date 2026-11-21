import type { MenuCategory, MenuProduct } from "@/lib/catalog";
import {
  brownieServings,
  categoryName,
  isTrayCategory,
  productContent,
  productImageUrl,
  productShort,
  type BadgeTone,
} from "@/content/products";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { menuMessages } from "@/i18n/messages/menu";
import { stockLeft } from "@/lib/stock";

/** Plain, serializable product used by the client-side shop components. */
export type ShopVariant = {
  id: string;
  name: string;
  price: number;
  serves?: string;
  /** Units left when 0 to LOW_STOCK (0 = sold out); absent when not tracked or plenty are left. */
  left?: number;
  /** Units in stock (0 or more); null when the size isn't tracked. */
  stock: number | null;
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  imageUrl: string;
  description: string;
  /** Extra text the menu search looks at (the short copy), e.g. "fudgy chocolate brownie". */
  searchText: string;
  badge?: { label: string; className: string };
  variants: ShopVariant[];
  fromPrice: number;
  /** Every size is sold out: the card says so and nothing can be added. */
  soldOut: boolean;
};

export type ShopCategory = { slug: string; name: string; products: ShopProduct[] };

/** Badge fills, marked important so they override the Chip's default --card fill. */
const badgeFill: Record<BadgeTone, string> = {
  mustard: "bg-tint-mustard!",
  salmon: "bg-tint-salmon!",
  lime: "bg-tint-lime!",
  lavender: "bg-tint-lavender!",
};

type ProductInput = Pick<MenuProduct, "id" | "slug" | "name" | "description" | "imageUrl" | "variants"> & {
  category: { slug: string; name: string };
};

export function toShopProduct(product: ProductInput, locale: Locale): ShopProduct {
  const m = pickMessages(menuMessages, locale);
  const t = m.card;
  const content = productContent[product.slug];
  const variants: ShopVariant[] = product.variants.map((v) => ({
    id: v.id.toString(),
    name: v.name,
    price: v.price,
    serves: brownieServings[v.name]?.[locale],
    left: stockLeft(v.stock),
    stock: v.stock === null ? null : Math.max(v.stock, 0),
  }));
  const soldOut = variants.length > 0 && variants.every((v) => v.left === 0);
  const multi = variants.length > 1;
  const tray = isTrayCategory(product.category.slug);
  const last = variants[variants.length - 1]?.name ?? "";
  // "from 10 × 10 to 20 × 30 cm": the unit is said once, and only when both ends are in cm.
  const cm = /\s*cm$/;
  const firstName = variants[0]?.name ?? "";
  const first = cm.test(firstName) && cm.test(last) ? firstName.replace(cm, "") : firstName;

  // Sold out says so instead of Bestseller/New or the size count.
  const badge = soldOut
    ? { label: m.stock.soldOut, className: "bg-oat!" }
    : content?.badge
    ? { label: content.badge.label[locale], className: badgeFill[content.badge.tone] }
    : multi
      ? { label: t.sizes(variants.length), className: badgeFill.lavender }
      : undefined;

  return {
    id: product.id.toString(),
    slug: product.slug,
    name: product.name,
    categorySlug: product.category.slug,
    categoryName: categoryName(product.category.slug, product.category.name, locale),
    imageUrl: productImageUrl(product.slug, product.imageUrl),
    // Multi-size products describe their size range: brownies "Four tray sizes, from 10 × 10 to 20 × 30 cm.",
    // anything else "Two sizes, from Small to Large."
    description: multi
      ? (tray ? t.trayRange : t.sizeRange)(variants.length, first, last)
      : productShort(product.slug, product.description, locale),
    searchText: productShort(product.slug, product.description, locale),
    badge,
    variants,
    fromPrice: variants.reduce((min, v) => Math.min(min, v.price), Number.POSITIVE_INFINITY),
    soldOut,
  };
}

export function toShopCategories(menu: MenuCategory[], locale: Locale): ShopCategory[] {
  return menu.map((c) => ({
    slug: c.slug,
    name: categoryName(c.slug, c.name, locale),
    products: c.products.map((p) => toShopProduct(p, locale)),
  }));
}
