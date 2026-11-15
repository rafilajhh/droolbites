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

/** 8400 → "8.4 km" (EN) / "8,4 km" (ID); one decimal rounded up (8401 → "8.5 km"), whole km from 100 km. */
export function formatDistance(metres: number, locale: Locale): string {
  // Rounded up, never to nearest: the fee is charged per started km (deliveryFeeFor), so 15,040 m
  // shows "15.1 km", not a "15.0 km" that looks shorter than the 16 km billed. The 1e-9 keeps float
  // noise from pushing an exact step (15,000 m) up a notch, as deliveryFeeFor does.
  const step = metres > 99_900 ? 1000 : 100;
  // max(0, …): ceil(-1e-9) is -0, which would print "-0.0 km" for a pin at the store.
  const km = (Math.max(0, Math.ceil(metres / step - 1e-9)) * step) / 1000;
  const digits = km >= 100 ? 0 : 1;
  return `${km.toLocaleString(locale === "id" ? "id-ID" : "en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits })} km`;
}

/** "6 items" / "1 item" (EN) or "6 item" (ID). */
export function formatItemCount(count: number, locale: Locale): string {
  if (locale === "id") return `${count} item`;
  return `${count} ${count === 1 ? "item" : "items"}`;
}
