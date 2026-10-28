import type { Locale } from "@/i18n/config";

/** 5000 → "Rp5.000" (the format used everywhere in the design). */
export function formatRupiah(amount: number): string {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
}

const TIME_ZONE = "Asia/Jakarta";

/** "18 Oct 2026" / "18 Okt 2026" */
export function formatDate(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  })
    .format(date)
    .replace(/\./g, "");
}

/** "14:00" in Surabaya time (WIB). */
export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date);
}

/** "18 Oct 2026, 14:00" */
export function formatDateTime(date: Date, locale: Locale): string {
  return `${formatDate(date, locale)}, ${formatTime(date)}`;
}

/** "6 items" / "1 item" (EN) or "6 item" (ID). */
export function formatItemCount(count: number, locale: Locale): string {
  if (locale === "id") return `${count} item`;
  return `${count} ${count === 1 ? "item" : "items"}`;
}
