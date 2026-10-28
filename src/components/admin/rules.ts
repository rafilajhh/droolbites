import type { FulfilmentMethod, FulfilmentStatus, PaymentMethod, PaymentStatus } from "@/generated/prisma/enums";
import { paymentMethodInfo } from "@/lib/order-status";

/**
 * Which fulfilment statuses an order may move to (the current one first).
 * Orders only move forward; pickup orders use "Ready for pickup", delivery
 * orders use "Out for delivery". Unpaid orders can only be cancelled.
 */
export function fulfilmentOptions(order: {
  fulfilmentMethod: FulfilmentMethod;
  fulfilmentStatus: FulfilmentStatus;
  paymentStatus: PaymentStatus;
}): FulfilmentStatus[] {
  const current = order.fulfilmentStatus;
  if (current === "completed" || current === "cancelled") return [current];
  if (order.paymentStatus !== "paid") return current === "pending" ? ["pending", "cancelled"] : [current];
  const handOff: FulfilmentStatus = order.fulfilmentMethod === "pickup" ? "ready_for_pickup" : "out_for_delivery";
  switch (current) {
    case "pending":
      return ["pending", "baking", "cancelled"];
    case "baking":
      return ["baking", handOff, "completed"];
    default:
      return [current, "completed"];
  }
}

/** "BCA VA", "QRIS", "DANA" — the short label in the admin payment card. */
export function paymentMethodShort(method: PaymentMethod): string {
  const info = paymentMethodInfo[method];
  return info.kind === "va" ? info.name.replace(" Virtual Account", " VA") : info.name;
}

/** Category colors from the admin frames (filter dots, table pills, "Your menu"). */
const categoryStyles: Record<string, { dot: string; tint: string }> = {
  "soft-cookies": { dot: "bg-accent-magenta", tint: "bg-tint-mustard" },
  brownies: { dot: "bg-accent-lavender", tint: "bg-tint-lavender" },
  tiramisu: { dot: "bg-accent-salmon", tint: "bg-tint-salmon" },
};

export function categoryStyle(slug: string) {
  return categoryStyles[slug] ?? { dot: "bg-accent-teal", tint: "bg-mint" };
}

/** Brownies are sold by tray size; everything else by flavor. */
export function isTrayCategory(slug: string | undefined) {
  return slug === "brownies";
}

export const ORDER_PAGE_SIZE = 20;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/**
 * The real image type from the file signature: PNG (89 50 4E 47 0D 0A 1A 0A),
 * JPEG (FF D8 FF) or WebP ("RIFF" ···· "WEBP"). Returns the extension or null.
 */
export function sniffImageType(bytes: Uint8Array): string | null {
  const starts = (sig: number[], at = 0) => sig.every((b, i) => bytes[at + i] === b);
  if (starts([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (starts([0xff, 0xd8, 0xff])) return "jpg";
  if (starts([0x52, 0x49, 0x46, 0x46]) && starts([0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  return null;
}

export const WEEK_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];
