import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { z } from "zod";
import { productImageUrl } from "@/content/products";
import { db } from "./db";

/**
 * The cart lives in a cookie as [{ v: variantId, q: qty }]. Prices are never
 * stored there: they are always read from the database.
 */
export const CART_COOKIE = "db_cart";
export const MAX_QTY = 99;
/** Most distinct lines the cookie may hold. */
export const MAX_LINES = 50;
/** A variant id: digits that fit a BIGINT (no huge strings into BigInt()). */
export const VARIANT_ID_RE = /^\d{1,18}$/;

const cartSchema = z
  .array(z.object({ v: z.string().regex(VARIANT_ID_RE), q: z.number().int().min(1).max(MAX_QTY) }))
  .max(MAX_LINES);

export type CartEntry = z.infer<typeof cartSchema>[number];

export async function readCartEntries(): Promise<CartEntry[]> {
  const raw = (await cookies()).get(CART_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = cartSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function writeCartEntries(entries: CartEntry[]) {
  const jar = await cookies();
  if (entries.length === 0) {
    jar.delete(CART_COOKIE);
    return;
  }
  jar.set(CART_COOKIE, JSON.stringify(entries), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

/** Cart lines joined with product data, in the order they were added. */
export const getCart = cache(async () => {
  const entries = await readCartEntries();
  if (entries.length === 0) return { lines: [], count: 0, subtotal: 0 };

  const variants = await db.productVariant.findMany({
    where: { id: { in: entries.map((e) => BigInt(e.v)) }, product: { isAvailable: true } },
    include: { product: { include: { category: { select: { slug: true } } } } },
  });
  const byId = new Map(variants.map((v) => [v.id.toString(), v]));

  const lines = entries.flatMap((entry) => {
    const variant = byId.get(entry.v);
    if (!variant) return [];
    return [
      {
        variantId: entry.v,
        qty: entry.q,
        unitPrice: variant.price,
        lineTotal: variant.price * entry.q,
        variantName: variant.name,
        productName: variant.product.name,
        productSlug: variant.product.slug,
        categorySlug: variant.product.category.slug,
        imageUrl: productImageUrl(variant.product.slug, variant.product.imageUrl),
      },
    ];
  });

  return {
    lines,
    count: lines.reduce((sum, l) => sum + l.qty, 0),
    subtotal: lines.reduce((sum, l) => sum + l.lineTotal, 0),
  };
});

export type Cart = Awaited<ReturnType<typeof getCart>>;
export type CartLine = Cart["lines"][number];
