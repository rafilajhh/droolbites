import type { Locale } from "@/i18n/config";
import type { StoreSettings } from "@/lib/settings";

const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const DAY_NAMES: Record<Locale, Record<(typeof DAY_ORDER)[number], string>> = {
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  id: { mon: "Sen", tue: "Sel", wed: "Rab", thu: "Kam", fri: "Jum", sat: "Sab", sun: "Min" },
};

/** "Every day, 10:00–21:00" from the store settings, in the active language. */
export function formatOpeningHours(
  settings: Pick<StoreSettings, "opensAt" | "closesAt" | "openDays">,
  locale: Locale,
): string {
  const open = new Set(settings.openDays.split(",").map((d) => d.trim()));
  const days = DAY_ORDER.filter((d) => open.has(d));
  const label =
    days.length === 7
      ? locale === "id"
        ? "Setiap hari"
        : "Every day"
      : days.map((d) => DAY_NAMES[locale][d]).join(", ");
  return `${label}, ${settings.opensAt}–${settings.closesAt}`;
}

/** Google Maps directions to the store, built from the address in the settings. */
export function directionsUrl(settings: Pick<StoreSettings, "storeName" | "address">): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    `${settings.storeName}, ${settings.address}`,
  )}`;
}
