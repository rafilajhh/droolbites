import { cn } from "@/lib/cn";

/** pen: Chip (Ymuhg) — mono label on a pill. Default fill is --card. */
export function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-pill bg-card px-3.5 py-2 font-mono text-[13px] font-semibold leading-[1.3]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * pen: Sticker (GbSuE) — rotated outlined pill.
 * `size="sm"` is the badge stuck on product photos (Bestseller, New, …): same pill and ring,
 * smaller type, tilted a touch more so it reads as a label slapped on the card.
 */
export function Sticker({
  size = "md",
  className,
  children,
}: {
  size?: "md" | "sm";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit rotate-[-8deg] items-center rounded-pill bg-background px-4 py-2.5 font-mono text-sm font-semibold leading-[1.3] inset-ring-[1.25px] inset-ring-border",
        size === "sm" &&
          "rotate-[-10deg] px-3 py-1.5 text-[12px] leading-[16px] whitespace-nowrap text-ink sm:px-3.5 sm:py-2 sm:text-[13px] sm:leading-[17px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Colors measured from the pen badges (see src/lib/order-status.ts for the mapping). */
export type StatusTone = "mustard" | "success" | "lavender" | "teal" | "cobalt" | "crimson" | "muted";

const toneClasses: Record<StatusTone, string> = {
  mustard: "bg-tint-mustard", // Awaiting payment
  success: "bg-mint", // Paid, Completed, Available
  lavender: "bg-tint-lavender", // Baking
  teal: "bg-mint", // Ready for pickup
  cobalt: "bg-mint", // Out for delivery
  crimson: "bg-tint-salmon", // Payment failed / expired
  muted: "bg-oat", // New order, Cancelled, Hidden
};

/**
 * pen: Badge/Status (KJayI) — label on a tinted pill. The pen's status dot is
 * left out on purpose: the site shows no status dots.
 * Pages pick the tone that matches their frame in the design.
 */
export function StatusBadge({
  tone = "mustard",
  className,
  children,
}: {
  tone?: StatusTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-pill px-3 py-1.5 text-[13px] font-semibold leading-[16px] text-foreground",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
