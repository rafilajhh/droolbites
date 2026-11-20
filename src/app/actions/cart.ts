"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { MAX_LINES, MAX_QTY, readCartEntries, VARIANT_ID_RE, writeCartEntries } from "@/lib/cart";

function clampQty(qty: number) {
  return Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
}

/**
 * `left` tells the shopper about stock: on a refusal, 0 means sold out and a number means the cart
 * already holds all that's left; on success, the add was cut down to that many. `max` on a refusal:
 * the line already holds the most one order takes (MAX_QTY).
 */
export type AddToCartResult = { ok: true; left?: number } | { ok: false; left?: number; max?: number };

export async function addToCart(variantId: string, qty = 1): Promise<AddToCartResult> {
  if (!VARIANT_ID_RE.test(variantId) || !Number.isFinite(qty) || qty < 1) return { ok: false };
  const variant = await db.productVariant.findFirst({
    where: { id: BigInt(variantId), product: { isAvailable: true } },
    select: { id: true, stock: true },
  });
  if (!variant) return { ok: false };
  const stock = variant.stock === null ? null : Math.max(variant.stock, 0);
  if (stock === 0) return { ok: false, left: 0 };

  const entries = await readCartEntries();
  const existing = entries.find((e) => e.v === variantId);
  const want = clampQty((existing?.q ?? 0) + qty) || 1;
  // A tracked size never goes into the cart beyond what's left.
  if (stock !== null && existing && existing.q >= stock) return { ok: false, left: stock };
  // Already at the cap: say so instead of opening the drawer as if something was added.
  if (existing && existing.q >= MAX_QTY) return { ok: false, max: MAX_QTY };
  const q = stock === null ? want : Math.min(want, stock);
  if (existing) existing.q = q;
  // A new line past the cookie's limit would make the whole cart fail validation.
  else if (entries.length >= MAX_LINES) return { ok: false };
  else entries.push({ v: variantId, q });
  await writeCartEntries(entries);
  revalidatePath("/", "layout");
  return stock !== null && want > stock ? { ok: true, left: stock } : { ok: true };
}

export async function setCartQty(variantId: string, qty: number) {
  if (!VARIANT_ID_RE.test(variantId) || !Number.isFinite(qty)) return { ok: false as const };
  const entries = await readCartEntries();
  let next = clampQty(qty);
  const current = entries.find((e) => e.v === variantId)?.q ?? 0;
  if (next > current) {
    // Going up stops at what's left of a tracked size; going down is always allowed.
    const variant = await db.productVariant.findUnique({ where: { id: BigInt(variantId) }, select: { stock: true } });
    if (variant?.stock !== null && variant?.stock !== undefined) next = Math.max(current, Math.min(next, variant.stock));
  }
  const updated =
    next === 0
      ? entries.filter((e) => e.v !== variantId)
      : entries.map((e) => (e.v === variantId ? { ...e, q: next } : e));
  await writeCartEntries(updated);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function removeFromCart(variantId: string) {
  return setCartQty(variantId, 0);
}
