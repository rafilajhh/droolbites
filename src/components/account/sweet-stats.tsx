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
            select: { product: { select: { id: true, name: true } } },
          },
        },
      },
    },
  }),
);

const value = "font-display text-[24px] leading-[28px] font-bold tracking-[-0.5px] text-foreground sm:text-[28px] sm:leading-8";
const label = "text-sm leading-[21px] text-muted-foreground";

/**
 * The customer's orders so far, beside the greeting: paid orders, desserts in them and the most
 * ordered product, as three figures split by hairlines (two side by
 * side and the favorite under them on phones). Cancelled orders don't count.
 */
export async function SweetStats({ userId, className }: { userId: bigint; className?: string }) {
  const [orders, t] = await Promise.all([getPaidOrderItems(userId), getMessages(accountMessages)]);
  const s = t.stats;

  const byProduct = new Map<bigint, { name: string; qty: number }>();
  for (const item of orders.flatMap((o) => o.items)) {
    const p = item.variant.product;
    const entry = byProduct.get(p.id) ?? { name: p.name, qty: 0 };
    entry.qty += item.qty;
    byProduct.set(p.id, entry);
  }
  const desserts = [...byProduct.values()].reduce((sum, p) => sum + p.qty, 0);
  const favorite = [...byProduct.values()].sort((a, b) => b.qty - a.qty)[0];

  if (!favorite) {
    return (
      <p className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] leading-[23px] text-muted-foreground", className)}>
        <span>{s.empty}</span>
        <ArrowLink href="/menu">{s.emptyCta}</ArrowLink>
      </p>
    );
  }

  // Each figure: the value on top, its label under it (the label comes first for screen readers).
  const cell = "flex min-w-0 flex-col-reverse justify-end gap-1";
  return (
    <dl aria-label={s.label} className={cn("grid grid-cols-2 gap-y-4 sm:flex sm:items-stretch", className)}>
      <div className={cn(cell, "pr-5 sm:px-6 sm:pl-0")}>
        <dt className={label}>{s.orders(orders.length)}</dt>
        <dd className={cn(value, "tabular-nums")}>{orders.length}</dd>
      </div>
      <div className={cn(cell, "pl-5 shadow-[inset_1px_0_0_var(--border-subtle)] sm:px-6")}>
        <dt className={label}>{s.desserts(desserts)}</dt>
        <dd className={cn(value, "tabular-nums")}>{desserts}</dd>
      </div>
      <div
        className={cn(
          cell,
          "col-span-2 pt-4 shadow-[inset_0_1px_0_var(--border-subtle)] sm:pt-0 sm:pl-6 sm:shadow-[inset_1px_0_0_var(--border-subtle)]",
        )}
      >
        <dt className={label}>{s.favorite}</dt>
        <dd className={value}>{favorite.name}</dd>
      </div>
    </dl>
  );
}
