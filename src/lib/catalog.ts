import "server-only";
import { cache } from "react";
import { db } from "./db";

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  variants: { orderBy: { price: "asc" as const }, select: { id: true, name: true, price: true } },
};

/**
 * Categories (in seed order) with their available products and variants.
 * Categories with nothing on the menu (new, or every product hidden) are left
 * out, so they never show as an empty chip or group on the storefront.
 */
export const getMenu = cache(async () => {
  return db.category.findMany({
    where: { products: { some: { isAvailable: true } } },
    orderBy: { id: "asc" },
    include: {
      products: {
        where: { isAvailable: true },
        orderBy: { id: "asc" },
        include: productInclude,
      },
    },
  });
});

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findUnique({ where: { slug }, include: productInclude });
});

export type MenuCategory = Awaited<ReturnType<typeof getMenu>>[number];
export type MenuProduct = MenuCategory["products"][number];

/** Lowest variant price, e.g. for "from Rp15.000". */
export function fromPrice(product: Pick<MenuProduct, "variants">): number {
  return product.variants.reduce((min, v) => Math.min(min, v.price), Number.POSITIVE_INFINITY);
}
