"use client";

import Image from "next/image";
import Link from "next/link";
import { Sticker } from "@/components/ui/badges";
import { photoFrame } from "@/components/ui/snapshot";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import { productStockLevel } from "@/lib/stock";
import type { ShopProduct } from "./shop-product";
import { AddButton } from "./add-to-cart";
import { StockBadge, StockNote } from "./stock";

type CardSize = "md" | "sm";

const styles: Record<CardSize, { media: string; name: string; desc: string; price: string; sizes: string }> = {
  // Card/Menu Item (gYvmU) as used on the menu and the landing cookie and tiramisu rows.
  md: {
    media: "h-[180px] sm:h-[240px] xl:h-[300px]",
    name: "text-[17px] leading-[20px] sm:text-[22px] sm:leading-[25px]",
    desc: "text-[13px] leading-[19px] sm:text-sm sm:leading-[20px]",
    price: "text-[17px] leading-[21px] sm:text-xl sm:leading-[24px]",
    sizes: "(min-width: 1024px) 316px, 50vw",
  },
  // "You may also like" on product detail: 260px media.
  sm: {
    media: "h-[180px] sm:h-[220px] lg:h-[260px]",
    name: "text-[17px] leading-[20px] sm:text-[22px] sm:leading-[25px]",
    desc: "text-[13px] leading-[19px] sm:text-sm sm:leading-[20px]",
    price: "text-[17px] leading-[21px] sm:text-xl sm:leading-[24px]",
    sizes: "(min-width: 1024px) 316px, 50vw",
  },
};

/** pen: Card/Menu Item (gYvmU). */
export function MenuItemCard({
  product,
  size = "md",
  showBadge = true,
  layout,
  className,
}: {
  product: ShopProduct;
  size?: CardSize;
  /** "You may also like" cards in w7mQL carry no badge. */
  showBadge?: boolean;
  /**
   * "banner": a landscape card (photo left, text right) for a menu group with a single product; the
   * parent gives it two grid columns. From sm a multi-size product lists its sizes there.
   */
  layout?: "banner";
  /** Width in the parent layout, e.g. the menu's wrapping rows. */
  className?: string;
}) {
  const t = useMessages(menuMessages).card;
  const s = styles[size];
  const href = `/menu/${product.slug}`;
  const multi = product.variants.length > 1;
  const price = formatRupiah(product.fromPrice);
  const badge = showBadge ? product.badge : undefined;
  const banner = layout === "banner";
  // Every card says its stock: one size its count, several sizes "In stock" (see productStockLevel).
  // Sold out is the photo's sticker, so the line only says it on cards without one.
  const stock = productStockLevel(product.variants.map((v) => v.stock));
  const showStock = !(stock.tone === "soldOut" && badge);

  const text = (
    <>
      <div className="flex w-full flex-col gap-1.5">
        <h3 className={cn("font-display font-semibold text-foreground", s.name)}>
          <Link
            href={href}
            // Hit-slop toward 44px: above it is the photo (the same link), below it plain text.
            className="relative after:absolute after:-inset-x-1 after:-inset-y-2.5 after:content-[''] hover:underline hover:decoration-1 hover:underline-offset-4"
          >
            {product.name}
            {/* The visual sticker is aria-hidden, so screen readers get the badge here. */}
            {badge ? <span className="sr-only">, {badge.label}</span> : null}
          </Link>
        </h3>
        <p className={cn("text-muted-foreground", s.desc)}>{product.description}</p>
        {showStock ? <StockNote level={stock} className="mt-0.5" /> : null}
      </div>
      {/* A landscape card has the height of a portrait one beside it. Its sizes and the price row sit together
          at the bottom (level with the neighbours' prices), and any spare height goes under the description. */}
      {banner && multi ? (
        <ul className="mt-auto hidden w-full flex-col sm:flex">
          {product.variants.map((v) => (
            <li
              key={v.id}
              className="flex items-baseline justify-between gap-3 py-2.5 text-sm leading-5 xl:py-3 shadow-[inset_0_-1px_0_var(--border-subtle)] first:shadow-[inset_0_1px_0_var(--border-subtle),inset_0_-1px_0_var(--border-subtle)]"
            >
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-foreground">
                <span>
                  {v.name}
                  {/* The banner's text column is narrowest from lg to xl: the size alone keeps each row on one line. */}
                  {v.serves ? <span className="text-muted-foreground lg:max-xl:hidden"> · {v.serves}</span> : null}
                </span>
                {v.left !== undefined ? <StockBadge left={v.left} /> : null}
              </span>
              <span className="shrink-0 font-semibold text-foreground tabular-nums">{formatRupiah(v.price)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={cn("flex w-full items-center justify-between gap-2", banner && multi ? "max-sm:mt-auto" : "mt-auto")}>
        <p className={cn("font-display font-semibold text-foreground", s.price)}>{multi ? t.from(price) : price}</p>
        <AddButton product={product} />
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "group/card min-w-0",
        // Banner: two equal columns, the photo as tall as the row (a portrait card's height beside it at lg).
        banner ? "grid grid-cols-2 gap-x-4 sm:gap-x-6" : "flex flex-col gap-3 sm:gap-4",
        className,
      )}
    >
      {/* The sticker sits outside the clipped photo so it can overlap the card corner. */}
      <div className={cn("relative w-full", banner && "h-full")}>
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            photoFrame,
            "flex w-full flex-col bg-oat transition-transform duration-300 ease-out group-hover/card:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover/card:translate-y-0",
            banner ? "h-full min-h-[180px] sm:min-h-[240px] xl:min-h-[300px]" : s.media,
          )}
        >
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes={banner ? "(min-width: 1024px) 316px, 50vw" : s.sizes}
            quality={100}
            className="object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.05] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
          />
        </Link>
        {badge ? (
          <Sticker
            size="sm"
            className={cn(
              "pointer-events-none absolute -top-2 -left-1.5 transition-[rotate,scale] duration-300 ease-out group-hover/card:scale-105 group-hover/card:rotate-[-14deg] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100 motion-reduce:group-hover/card:rotate-[-10deg] sm:-top-3 sm:-left-2.5",
              badge.className,
            )}
          >
            <span aria-hidden>{badge.label}</span>
          </Sticker>
        ) : null}
      </div>
      {banner ? <div className="flex min-w-0 flex-col gap-3 pt-1 sm:gap-4">{text}</div> : text}
    </article>
  );
}
