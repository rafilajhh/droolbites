import { cache } from "react";
import Image from "next/image";
import { ArrowLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";

/** The account page renders the card twice (sidebar and mobile); both share one query per request. */
const getPaidOrderItems = cache((userId: bigint) =>
  db.order.findMany({
    where: { userId, paymentStatus: "paid", fulfilmentStatus: { not: "cancelled" } },
    select: {
      items: {
        select: {
          qty: true,
          variant: {
            select: { product: { select: { id: true, name: true, slug: true, imageUrl: true, isAvailable: true } } },
          },
        },
      },
    },
  }),
);

/**
 * Sidebar card under the account nav: paid orders, desserts in them and the most
 * ordered product, all from the customer's own orders. Cancelled orders don't count.
 */
export async function SweetStats({ userId, id, className }: { userId: bigint; id: string; className?: string }) {
  const [orders, t] = await Promise.all([getPaidOrderItems(userId), getMessages(accountMessages)]);
  const s = t.stats;

  const byProduct = new Map<
    bigint,
    { name: string; slug: string; imageUrl: string | null; isAvailable: boolean; qty: number }
  >();
  for (const item of orders.flatMap((o) => o.items)) {
    const p = item.variant.product;
    const entry = byProduct.get(p.id) ?? {
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      isAvailable: p.isAvailable,
      qty: 0,
    };
    entry.qty += item.qty;
    byProduct.set(p.id, entry);
  }
  const desserts = [...byProduct.values()].reduce((sum, p) => sum + p.qty, 0);
  const favorite = [...byProduct.values()].sort((a, b) => b.qty - a.qty)[0];

  if (!favorite) {
    return (
      <section aria-labelledby={id} className={cn("flex w-full flex-col items-start gap-3 rounded-m bg-tint-mustard p-6", className)}>
        <h2 id={id} className="font-display text-[22px] leading-[26px] font-bold text-foreground">
          {s.emptyTitle}
        </h2>
        <p className="text-[15px] leading-[23px] text-muted-foreground">{s.emptyBody}</p>
        <ArrowLink href="/menu">{s.emptyCta}</ArrowLink>
      </section>
    );
  }

  return (
    <section aria-labelledby={id} className={cn("flex w-full flex-col gap-4 rounded-m bg-tint-mustard p-6", className)}>
      <div className="flex flex-col gap-1">
        <h2 id={id} className="font-display text-[20px] leading-[24px] font-bold text-foreground">
          {s.title}
        </h2>
        <p className="text-[15px] leading-[23px] text-muted-foreground tabular-nums">{s.summary(orders.length, desserts)}</p>
      </div>
      <div className="flex items-center gap-3.5 rounded-sm bg-background/70 p-3">
        {favorite.imageUrl ? (
          <span className="relative size-14 shrink-0 -rotate-3 overflow-hidden rounded-pill bg-oat">
            <Image src={favorite.imageUrl} alt="" fill sizes="56px" className="object-cover" />
          </span>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-xs leading-4 text-muted-foreground">{s.favorite}</p>
          <p className="font-display text-[17px] leading-[21px] font-semibold text-foreground">{favorite.name}</p>
          {/* An unavailable product's page 404s, so only link to one still on the menu. */}
          {favorite.isAvailable ? (
            <ArrowLink href={`/menu/${favorite.slug}`} className="w-fit text-[13px]">
              {s.again}
            </ArrowLink>
          ) : null}
        </div>
      </div>
    </section>
  );
}
