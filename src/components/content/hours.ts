import type { Locale } from "@/i18n/config";
import type { StoreSettings } from "@/lib/settings";

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_NAMES: Record<Locale, Record<(typeof DAY_ORDER)[number], string>> = {
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  id: { mon: "Sen", tue: "Sel", wed: "Rab", thu: "Kam", fri: "Jum", sat: "Sab", sun: "Min" },
};

/** "Mon, Tue, Wed" from the store settings in the active language, or null when the shop opens every day. */
export function formatOpenDays(settings: Pick<StoreSettings, "openDays">, locale: Locale): string | null {
  const open = new Set(settings.openDays.split(",").map((d) => d.trim()));
  const days = DAY_ORDER.filter((d) => open.has(d));
  return days.length === 7 ? null : days.map((d) => DAY_NAMES[locale][d]).join(", ");
}

/** "Every day, 10:00–21:00" from the store settings, in the active language. */
export function formatOpeningHours(
  settings: Pick<StoreSettings, "opensAt" | "closesAt" | "openDays">,
  locale: Locale,
): string {
  const label = formatOpenDays(settings, locale) ?? (locale === "id" ? "Setiap hari" : "Every day");
  return `${label}, ${settings.opensAt}–${settings.closesAt}`;
}

/**
 * "21:00" → "20:30": pickup orders close half an hour before the shop does, but never
 * before it opens. Falls back to the closing time when either time can't be read.
 */
export function halfHourBefore(settings: Pick<StoreSettings, "opensAt" | "closesAt">): string {
  const minutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  const opens = minutes(settings.opensAt);
  const closes = minutes(settings.closesAt);
  if (Number.isNaN(opens) || Number.isNaN(closes)) return settings.closesAt;
  const total = Math.max(opens, closes - 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Google Maps directions to the store, built from the address in the settings. */
export function directionsUrl(settings: Pick<StoreSettings, "storeName" | "address">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${settings.storeName}, ${settings.address}`,
  )}`;
}
