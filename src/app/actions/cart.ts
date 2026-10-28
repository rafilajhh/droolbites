"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { MAX_LINES, MAX_QTY, readCartEntries, VARIANT_ID_RE, writeCartEntries } from "@/lib/cart";

function clampQty(qty: number) {
  return Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
}

export async function addToCart(variantId: string, qty = 1) {
  if (!VARIANT_ID_RE.test(variantId) || !Number.isFinite(qty) || qty < 1) return { ok: false as const };
  const variant = await db.productVariant.findFirst({
    where: { id: BigInt(variantId), product: { isAvailable: true } },
    select: { id: true },
  });
  if (!variant) return { ok: false as const };

  const entries = await readCartEntries();
  const existing = entries.find((e) => e.v === variantId);
  if (existing) existing.q = clampQty(existing.q + qty) || 1;
  // A new line past the cookie's limit would make the whole cart fail validation.
  else if (entries.length >= MAX_LINES) return { ok: false as const };
  else entries.push({ v: variantId, q: clampQty(qty) || 1 });
  await writeCartEntries(entries);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function setCartQty(variantId: string, qty: number) {
  if (!VARIANT_ID_RE.test(variantId) || !Number.isFinite(qty)) return { ok: false as const };
  const entries = await readCartEntries();
  const next = clampQty(qty);
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
