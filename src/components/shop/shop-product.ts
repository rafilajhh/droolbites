import type { MenuCategory, MenuProduct } from "@/lib/catalog";
import {
  brownieServings,
  categoryName,
  productContent,
  productImageUrl,
  productShort,
  type BadgeTone,
} from "@/content/products";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { menuMessages } from "@/i18n/messages/menu";

/** Plain, serializable product used by the client-side shop components. */
export type ShopVariant = { id: string; name: string; price: number; serves?: string };

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
  const t = pickMessages(menuMessages, locale).card;
  const content = productContent[product.slug];
  const variants: ShopVariant[] = product.variants.map((v) => ({
    id: v.id.toString(),
    name: v.name,
    price: v.price,
    serves: brownieServings[v.name]?.[locale],
  }));
  const multi = variants.length > 1;
  const first = variants[0]?.name ?? "";
  const last = variants[variants.length - 1]?.name ?? "";

  const badge = content?.badge
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
    // Multi-size products describe their size range, e.g. "Four tray sizes, from 10 × 10 to 20 × 30 cm."
    description: multi
      ? t.sizeRange(variants.length, first.replace(/\s*cm$/, ""), last)
      : productShort(product.slug, product.description, locale),
    searchText: productShort(product.slug, product.description, locale),
    badge,
    variants,
    fromPrice: variants.reduce((min, v) => Math.min(min, v.price), Number.POSITIVE_INFINITY),
  };
}

export function toShopCategories(menu: MenuCategory[], locale: Locale): ShopCategory[] {
  return menu.map((c) => ({
    slug: c.slug,
    name: categoryName(c.slug, c.name, locale),
    products: c.products.map((p) => toShopProduct(p, locale)),
  }));
}
