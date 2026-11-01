import { cache } from "react";
import { ArrowLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";

/** One query per request, however many times the summary is rendered. */
const getPaidOrderItems = cache((userId: bigint) =>
  db.order.findMany({
    where: { userId, paymentStatus: "paid", fulfilmentStatus: { not: "cancelled" } },
    select: {
      items: {
        select: {
          qty: true,
          variant: {
            select: { product: { select: { id: true, name: true, slug: true, isAvailable: true } } },
          },
        },
      },
    },
  }),
);

const line = "flex flex-wrap items-center gap-x-2 gap-y-1 text-[15px] leading-[23px] text-muted-foreground";

/**
 * One summary line under the account greeting: paid orders, desserts in them and
 * the most ordered product, all from the customer's own orders. Cancelled orders don't count.
 */
export async function SweetStats({ userId, className }: { userId: bigint; className?: string }) {
  const [orders, t] = await Promise.all([getPaidOrderItems(userId), getMessages(accountMessages)]);
  const s = t.stats;

  const byProduct = new Map<bigint, { name: string; slug: string; isAvailable: boolean; qty: number }>();
  for (const item of orders.flatMap((o) => o.items)) {
    const p = item.variant.product;
    const entry = byProduct.get(p.id) ?? { name: p.name, slug: p.slug, isAvailable: p.isAvailable, qty: 0 };
    entry.qty += item.qty;
    byProduct.set(p.id, entry);
  }
  const desserts = [...byProduct.values()].reduce((sum, p) => sum + p.qty, 0);
  const favorite = [...byProduct.values()].sort((a, b) => b.qty - a.qty)[0];

  if (!favorite) {
    return (
      <p className={cn(line, className)}>
        <span>{s.empty}</span>
        <ArrowLink href="/menu">{s.emptyCta}</ArrowLink>
      </p>
    );
  }

  return (
    <p className={cn(line, className)}>
      <span className="tabular-nums">{s.summary(orders.length, desserts)}</span>
      <span aria-hidden>·</span>
      <span>
        {s.favorite}: <span className="font-semibold text-foreground">{favorite.name}</span>
      </span>
      {/* An unavailable product's page 404s, so only link to one still on the menu. */}
      {favorite.isAvailable ? (
        // One unit, so the line never wraps between the dot and the link.
        <span className="inline-flex basis-full items-center gap-[inherit] whitespace-nowrap sm:basis-auto">
          <span aria-hidden className="max-sm:hidden">·</span>
          <ArrowLink href={`/menu/${favorite.slug}`}>{s.again}</ArrowLink>
        </span>
      ) : null}
    </p>
  );
}
