import { cn } from "@/lib/cn";

/**
 * Pills come in three kinds (DESIGN.md, Chips, Stickers, Badges):
 * - Badge: a fact (order status, stock, availability, a count). Manrope 600, fixed height, flat tint.
 * - Chip: a label in the brand's voice (hero line, job type). Plex Mono, oat.
 * - Sticker: a label slapped on a photo or beside a heading. Plex Mono, paper with a moss ring, tilted.
 */

/** pen: Chip (Ymuhg) — mono label on a pill. Default fill is --card. */
export function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-pill bg-card px-3.5 py-2 font-mono text-[13px] leading-[17px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

const stickerSize = {
  // Product photos (cards), careers roles.
  sm: "h-7 px-3 text-[12px] leading-4 sm:h-8 sm:px-3.5 sm:text-[13px] sm:leading-[17px]",
  // The product page photo, the hero, rating stickers.
  md: "h-[38px] px-4 text-sm leading-[18px]",
} as const;

/**
 * pen: Sticker (GbSuE) — outlined mono pill. Every tilted sticker leans the same -8deg; rating stickers
 * (`tilt={false}`) stand straight so the numbers read at a glance. A sticker on a photo corner takes
 * `stickerCorner` so it overlaps every photo by the same amount.
 */
export function Sticker({
  size = "md",
  tilt = true,
  className,
  children,
}: {
  size?: keyof typeof stickerSize;
  tilt?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-2 rounded-pill bg-background font-mono font-semibold whitespace-nowrap text-ink inset-ring-[1.25px] inset-ring-border",
        stickerSize[size],
        tilt && "-rotate-8",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Where a sticker sits on a photo's top-left corner (cards and the product page photo). */
export const stickerCorner = "absolute -top-3 -left-2 sm:-top-3.5 sm:-left-3";

/**
 * Badge tones. One meaning each, everywhere (storefront, account, admin):
 * success = done / available / in stock, warning = waiting / running low, danger = closed with a
 * problem (expired, cancelled, sold out), neutral = settled, nothing to do (not paid, refunded, hidden),
 * info = in progress in the kitchen (baking), highlight = a count that wants attention.
 */
export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "info" | "highlight";

const badgeTone: Record<BadgeTone, string> = {
  success: "bg-mint",
  warning: "bg-tint-mustard",
  danger: "bg-tint-salmon",
  neutral: "bg-oat",
  info: "bg-tint-lavender",
  highlight: "bg-highlight",
};

const badgeSize = {
  // Cards, size tiles, cart lines, table cells: sits inside a line of 13-15px text.
  sm: "h-[22px] px-2.5 text-[12px] leading-4",
  // Beside a page title or a price, and in a card's heading row.
  md: "h-7 px-3 text-[13px] leading-4",
} as const;

export type BadgeSize = keyof typeof badgeSize;

/**
 * pen: Badge/Status (KJayI) — a fact on a tinted pill, one line, fixed height so it centres in any row.
 * No status dot and no icon (owner rule: the site shows no status dots).
 */
export function Badge({
  tone = "neutral",
  size = "md",
  className,
  children,
  ...rest
}: {
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "className" | "children">) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center rounded-pill font-body font-semibold whitespace-nowrap text-ink tabular-nums",
        badgeSize[size],
        badgeTone[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** A count on an icon (cart in the header, the admin menu button): 18px mustard bubble, 11px bold. */
export function CountBubble({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "flex h-[18px] min-w-[18px] items-center justify-center rounded-pill bg-highlight px-1 font-body text-[11px] leading-none font-bold text-ink tabular-nums",
        className,
      )}
    >
      {children}
    </span>
  );
}
