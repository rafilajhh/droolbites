import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * Stock per size (product_variants.stock; null = not tracked). Stock goes down when an order is paid
 * and back up when the store declines or cancels it; checkout only checks it (a guard, not a
 * reservation). Type imports only, so client components can use the constants and helpers and
 * scripts/stock.test.ts can run the database part with its own client.
 */

/** A tracked size with this many or fewer left shows "Only N left" (storefront) and "Low stock" (admin). */
export const LOW_STOCK = 5;
/** Highest stock the product form accepts. */
export const MAX_STOCK = 9999;

type Tx = Prisma.TransactionClient;

/**
 * "soldOut" when every size is tracked and at 0, "low" when any tracked size has LOW_STOCK or fewer left
 * (a size at 0 beside an untracked one is "low": the untracked size can still be ordered).
 */
export function stockStatus(stocks: (number | null)[]): "low" | "soldOut" | null {
  const tracked = stocks.filter((s): s is number => s !== null);
  if (tracked.length === 0) return null;
  if (tracked.length === stocks.length && tracked.every((s) => s <= 0)) return "soldOut";
  return tracked.some((s) => s <= LOW_STOCK) ? "low" : null;
}

/** What the storefront may say about a size: its count when 0 to LOW_STOCK are left, else nothing. */
export function stockLeft(stock: number | null): number | undefined {
  return stock !== null && stock <= LOW_STOCK ? Math.max(stock, 0) : undefined;
}

function byId(a: bigint, b: bigint) {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Take a paid order's items out of stock, exactly once. Call it inside the transaction that marks the
 * order paid: stock_deducted flips in that same transaction, so a repeated or concurrent "paid" (status
 * poll, webhook, simulate) changes nothing. The tracked sizes are locked (FOR UPDATE, in id order, so two
 * payments queue instead of deadlocking) and lose at most what they have: a size that runs out stops at
 * 0 and the order is marked short. It stays paid (the money arrived); the admin is warned.
 */
export async function deductOrderStock(tx: Tx, orderId: bigint): Promise<{ deducted: boolean; short: boolean }> {
  const { count } = await tx.order.updateMany({ where: { id: orderId, stockDeducted: false }, data: { stockDeducted: true } });
  if (count === 0) return { deducted: false, short: false };

  const items = await tx.orderItem.findMany({
    where: { orderId },
    orderBy: { id: "asc" },
    select: { id: true, variantId: true, qty: true },
  });
  if (items.length === 0) return { deducted: true, short: false };

  const ids = [...new Set(items.map((i) => i.variantId))].sort(byId);
  const rows = await tx.$queryRawUnsafe<{ id: bigint | number; stock: number | bigint | null }[]>(
    `SELECT id, stock FROM product_variants WHERE id IN (${ids.map(() => "?").join(", ")}) ORDER BY id FOR UPDATE`,
    ...ids,
  );
  const left = new Map(rows.map((r) => [String(r.id), r.stock === null ? null : Number(r.stock)]));

  let short = false;
  const taken = new Map<bigint, number>();
  for (const item of items) {
    const stock = left.get(item.variantId.toString());
    if (stock === null || stock === undefined) continue;
    const take = Math.max(0, Math.min(stock, item.qty));
    if (take < item.qty) short = true;
    left.set(item.variantId.toString(), stock - take);
    taken.set(item.variantId, (taken.get(item.variantId) ?? 0) + take);
    await tx.orderItem.update({ where: { id: item.id }, data: { stockTaken: take } });
  }
  for (const id of [...taken.keys()].sort(byId)) {
    const n = taken.get(id)!;
    // Atomic `stock = stock - n`; never more than the locked row had, so it stops at 0.
    if (n > 0) await tx.productVariant.updateMany({ where: { id, stock: { gte: n } }, data: { stock: { decrement: n } } });
  }
  if (short) await tx.order.update({ where: { id: orderId }, data: { stockShort: true } });
  return { deducted: true, short };
}

/**
 * Give back what deductOrderStock took, exactly once (stock_deducted flips back in the same
 * transaction). Sizes no longer tracked are left alone. Returns false when nothing was taken.
 */
export async function restoreOrderStock(tx: Tx, orderId: bigint): Promise<boolean> {
  const { count } = await tx.order.updateMany({ where: { id: orderId, stockDeducted: true }, data: { stockDeducted: false } });
  if (count === 0) return false;

  const items = await tx.orderItem.findMany({ where: { orderId, stockTaken: { gt: 0 } }, select: { variantId: true, stockTaken: true } });
  const back = new Map<bigint, number>();
  for (const item of items) back.set(item.variantId, (back.get(item.variantId) ?? 0) + (item.stockTaken ?? 0));
  for (const id of [...back.keys()].sort(byId)) {
    await tx.productVariant.updateMany({ where: { id, stock: { not: null } }, data: { stock: { increment: back.get(id)! } } });
  }
  await tx.orderItem.updateMany({ where: { orderId }, data: { stockTaken: null } });
  return true;
}

export type ShortLine = { variantId: string; productName: string; variantName: string; wanted: number; left: number };

/**
 * Lines asking for more than a tracked size has left (0 = sold out). A check at checkout and before
 * each charge; nothing is held, so a later payment can still find less (see deductOrderStock).
 */
export async function findShortLines(
  client: Pick<PrismaClient, "productVariant"> | Tx,
  lines: { variantId: bigint; qty: number }[],
): Promise<ShortLine[]> {
  const wanted = new Map<string, number>();
  for (const l of lines) wanted.set(l.variantId.toString(), (wanted.get(l.variantId.toString()) ?? 0) + l.qty);
  if (wanted.size === 0) return [];
  const variants = await client.productVariant.findMany({
    where: { id: { in: [...wanted.keys()].map(BigInt) }, stock: { not: null } },
    select: { id: true, name: true, stock: true, product: { select: { name: true } } },
  });
  return variants.flatMap((v) => {
    const qty = wanted.get(v.id.toString()) ?? 0;
    const left = Math.max(v.stock ?? 0, 0);
    if (qty <= left) return [];
    return [
      {
        variantId: v.id.toString(),
        productName: v.product.name,
        variantName: v.name,
        wanted: qty,
        left,
      },
    ];
  });
}
