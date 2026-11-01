"use client";

import Image from "next/image";
import Link from "next/link";
import { Sticker } from "@/components/ui/badges";
import { photoFrame } from "@/components/ui/snapshot";
import { useMessages } from "@/i18n/client";
import { menuMessages } from "@/i18n/messages/menu";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ShopProduct } from "./shop-product";
import { AddButton } from "./add-to-cart";

type CardSize = "md" | "lg" | "sm";

const styles: Record<CardSize, { media: string; name: string; desc: string; price: string; sizes: string }> = {
  // Card/Menu Item (gYvmU) as used on the menu and the landing cookie row.
  md: {
    media: "h-[180px] sm:h-[240px] lg:h-[300px]",
    name: "text-[17px] leading-[20px] sm:text-[22px] sm:leading-[25px]",
    desc: "text-[13px] leading-[19px] sm:text-sm sm:leading-[20px]",
    price: "text-[17px] leading-[21px] sm:text-xl sm:leading-[24px]",
    sizes: "(min-width: 1024px) 316px, 50vw",
  },
  // Landing tiramisu row: 440px media, 28px name. Two-up below sm, so the media matches md there.
  lg: {
    media: "h-[180px] sm:h-[340px] lg:h-[440px]",
    name: "text-[22px] leading-[25px] lg:text-[28px] lg:leading-[32px]",
    desc: "text-sm leading-[20px] lg:text-base lg:leading-[23px]",
    price: "text-xl leading-[24px] lg:text-2xl lg:leading-[29px]",
    sizes: "(min-width: 1024px) 644px, (min-width: 640px) 100vw, 50vw",
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
  wide = false,
  className,
}: {
  product: ShopProduct;
  size?: CardSize;
  /** "You may also like" cards in w7mQL carry no badge. */
  showBadge?: boolean;
  /** One of three equal columns from sm, a full row below sm: the photo gets a taller mobile height. */
  wide?: boolean;
  /** Width in the parent layout, e.g. the menu's wrapping rows. */
  className?: string;
}) {
  const t = useMessages(menuMessages).card;
  const s = styles[size];
  const href = `/menu/${product.slug}`;
  const multi = product.variants.length > 1;
  const price = formatRupiah(product.fromPrice);
  const badge = showBadge ? product.badge : undefined;

  return (
    <article className={cn("group/card flex min-w-0 flex-col gap-3 sm:gap-4", className)}>
      {/* The sticker sits outside the clipped photo so it can overlap the card corner. */}
      <div className="relative w-full">
        <Link
          href={href}
          tabIndex={-1}
          aria-hidden
          className={cn(
            photoFrame,
            "flex w-full flex-col bg-oat transition-transform duration-300 ease-out group-hover/card:-translate-y-1 motion-reduce:transition-none motion-reduce:group-hover/card:translate-y-0",
            wide ? "h-[220px] sm:h-[240px] lg:h-[300px]" : s.media,
          )}
        >
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes={wide ? "(min-width: 1024px) 421px, (min-width: 640px) 33vw, 100vw" : s.sizes}
            quality={100}
            className="object-cover transition-transform duration-500 ease-out group-hover/card:scale-[1.06] motion-reduce:transition-none motion-reduce:group-hover/card:scale-100"
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
      <div className="flex w-full flex-col gap-1.5">
        <h3 className={cn("font-display font-semibold text-foreground", s.name)}>
          <Link href={href} className="hover:underline hover:decoration-1 hover:underline-offset-4">
            {product.name}
            {/* The visual sticker is aria-hidden, so screen readers get the badge here. */}
            {badge ? <span className="sr-only">, {badge.label}</span> : null}
          </Link>
        </h3>
        <p className={cn("text-muted-foreground", s.desc)}>{product.description}</p>
      </div>
      <div className="mt-auto flex w-full items-center justify-between gap-2">
        <p className={cn("font-display font-semibold text-foreground", s.price)}>{multi ? t.from(price) : price}</p>
        <AddButton product={product} />
      </div>
    </article>
  );
}
