import type { Locale } from "@/i18n/config";

/**
 * Copy that the PDM does not store: badges, long descriptions, Indonesian
 * translations and serving notes. Keyed by product slug. Products created
 * later from the admin fall back to the database description.
 */
type Text = { en: string; id: string };

export type BadgeTone = "mustard" | "salmon" | "lime" | "lavender";

export type ProductContent = {
  badge?: { label: Text; tone: BadgeTone };
  short?: Text; // card description (EN equals products.description)
  long?: Text; // product detail paragraph
  ingredients?: Text;
  allergens?: Text;
  storage?: Text;
};

const COOKIE_STORAGE: Text = {
  en: "Best on the day. Keeps for 3 days in an airtight jar at room temperature; warm for 10 seconds to bring back the soft middle.",
  id: "Paling enak di hari yang sama. Tahan 3 hari di toples kedap udara pada suhu ruang; hangatkan 10 detik agar bagian tengahnya lembut lagi.",
};
/**
 * Placeholder until the kitchen lists the ingredients. The product page links its
 * "Contact us" and opens the first section with real content instead of this one.
 */
export const INGREDIENTS_ON_REQUEST: Text = {
  en: "Contact us to confirm the full ingredient list for this flavor.",
  id: "Hubungi kami untuk memastikan daftar lengkap bahan rasa ini.",
};
const COOKIE_ALLERGENS: Text = {
  en: "Contains wheat, egg, milk and soy. Made in a kitchen that also handles nuts.",
  id: "Mengandung gandum, telur, susu dan kedelai. Dibuat di dapur yang juga mengolah kacang.",
};

export const productContent: Record<string, ProductContent> = {
  "chocolate-chunk": {
    badge: { label: { en: "Bestseller", id: "Terlaris" }, tone: "mustard" },
    short: {
      en: "Buttery dough with dark chocolate chunks.",
      id: "Adonan butter dengan potongan cokelat hitam.",
    },
    long: {
      en: "Our classic: a thick, buttery dough loaded with dark chocolate chunks, baked until the edges turn golden and the middle stays soft and gooey.",
      id: "Andalan kami: adonan butter yang tebal, penuh potongan cokelat hitam, dipanggang sampai pinggirnya keemasan dan bagian tengahnya tetap lembut dan lumer.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: COOKIE_ALLERGENS,
    storage: COOKIE_STORAGE,
  },
  "double-chocolate": {
    short: {
      en: "Soft cocoa dough with chocolate chunks.",
      id: "Adonan kakao lembut dengan potongan cokelat.",
    },
    long: {
      en: "For serious chocolate people: a dark cocoa dough folded with chocolate chunks, baked just long enough to keep the center fudgy.",
      id: "Untuk pencinta cokelat sejati: adonan kakao pekat dengan potongan cokelat, dipanggang secukupnya agar bagian tengahnya tetap fudgy.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: COOKIE_ALLERGENS,
    storage: COOKIE_STORAGE,
  },
  "red-velvet": {
    badge: { label: { en: "Fan favorite", id: "Favorit pelanggan" }, tone: "salmon" },
    short: {
      en: "Red velvet dough with white chocolate pieces.",
      id: "Adonan red velvet dengan potongan cokelat putih.",
    },
    long: {
      en: "A soft red velvet dough with a hint of cocoa, studded with white chocolate pieces that melt into the warm middle.",
      id: "Adonan red velvet yang lembut dengan sentuhan kakao, bertabur potongan cokelat putih yang meleleh di bagian tengahnya.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: COOKIE_ALLERGENS,
    storage: COOKIE_STORAGE,
  },
  "white-chocolate-almond": {
    short: {
      en: "White chocolate and roasted almonds.",
      id: "Cokelat putih dan almon panggang.",
    },
    long: {
      en: "Golden vanilla dough with sweet white chocolate and roasted almonds for a little crunch in every bite.",
      id: "Adonan vanila keemasan dengan cokelat putih yang manis dan almon panggang untuk sensasi renyah di setiap gigitan.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: {
      en: "Contains wheat, egg, milk, soy and almonds (tree nuts).",
      id: "Mengandung gandum, telur, susu, kedelai dan almon (kacang pohon).",
    },
    storage: COOKIE_STORAGE,
  },
  "fudgy-brownies": {
    short: {
      en: "The same fudgy chocolate brownie in four tray sizes.",
      id: "Brownies cokelat fudgy yang sama dalam empat ukuran loyang.",
    },
    long: {
      en: "The same crackly-top, fudgy chocolate brownie in four tray sizes. Pick the one that fits your table.",
      id: "Brownies cokelat fudgy dengan permukaan renyah yang sama dalam empat ukuran loyang. Pilih yang pas untuk mejamu.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: {
      en: "Contains wheat, egg, milk and soy.",
      id: "Mengandung gandum, telur, susu dan kedelai.",
    },
    storage: {
      en: "Keeps for 4 days in an airtight container at room temperature, or a week in the fridge.",
      id: "Tahan 4 hari di wadah kedap udara pada suhu ruang, atau seminggu di kulkas.",
    },
  },
  "classic-coffee-tiramisu": {
    short: {
      en: "Coffee, mascarpone cream and cocoa.",
      id: "Kopi, krim mascarpone dan kakao.",
    },
    long: {
      en: "Coffee-soaked sponge layered with mascarpone cream, chilled overnight and finished with a thick dusting of cocoa.",
      id: "Bolu yang direndam kopi, berlapis krim mascarpone, didinginkan semalaman lalu ditaburi kakao yang tebal.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: {
      en: "Contains wheat, egg and milk. Contains caffeine.",
      id: "Mengandung gandum, telur dan susu. Mengandung kafein.",
    },
    storage: {
      en: "Keep refrigerated and enjoy within 2 days.",
      id: "Simpan di kulkas dan nikmati dalam 2 hari.",
    },
  },
  "matcha-tiramisu": {
    badge: { label: { en: "New", id: "Baru" }, tone: "lime" },
    short: {
      en: "Matcha sponge and mascarpone cream.",
      id: "Bolu matcha dan krim mascarpone.",
    },
    long: {
      en: "Matcha-soaked sponge layered with mascarpone cream, chilled overnight and finished with a bright layer of matcha.",
      id: "Bolu yang direndam matcha, berlapis krim mascarpone, didinginkan semalaman lalu ditutup lapisan matcha.",
    },
    ingredients: INGREDIENTS_ON_REQUEST,
    allergens: {
      en: "Contains wheat, egg and milk. Matcha contains caffeine.",
      id: "Mengandung gandum, telur dan susu. Matcha mengandung kafein.",
    },
    storage: {
      en: "Keep refrigerated and enjoy within 2 days.",
      id: "Simpan di kulkas dan nikmati dalam 2 hari.",
    },
  },
};

/** Serving notes for brownie tray sizes, keyed by variant name. */
export const brownieServings: Record<string, Text> = {
  "10 × 10 cm": { en: "Serves 2–4", id: "Untuk 2–4 orang" },
  "15 × 15 cm": { en: "Serves 6–9", id: "Untuk 6–9 orang" },
  "20 × 20 cm": { en: "Serves 10–16", id: "Untuk 10–16 orang" },
  "20 × 30 cm": { en: "For a crowd", id: "Untuk rombongan" },
};

/** Product photo, falling back to the bundled /images/products/<slug>.png when the database has none. */
export function productImageUrl(slug: string, imageUrl: string | null) {
  return imageUrl ?? `/images/products/${slug}.png`;
}

export const badgeToneClass: Record<BadgeTone, string> = {
  mustard: "bg-tint-mustard",
  salmon: "bg-tint-salmon",
  lime: "bg-tint-lime",
  lavender: "bg-tint-lavender",
};

export function localized(text: Text | undefined, locale: Locale): string | undefined {
  return text ? text[locale] : undefined;
}

/** Card description in the active language, falling back to the DB value. */
export function productShort(slug: string, dbDescription: string | null, locale: Locale): string {
  return productContent[slug]?.short?.[locale] ?? dbDescription ?? "";
}

/** Detail paragraph in the active language, falling back to the DB value. */
export function productLong(slug: string, dbDescription: string | null, locale: Locale): string {
  return productContent[slug]?.long?.[locale] ?? productShort(slug, dbDescription, locale);
}

/** Variant label shown in carts and orders, e.g. "1 piece" / "10 × 10 cm · 1 tray". */
export function variantLabel(variantName: string, categorySlug: string, locale: Locale): string {
  const id = locale === "id";
  if (variantName === "1 piece") return id ? "1 buah" : "1 piece";
  if (variantName === "1 portion") return id ? "1 porsi" : "1 portion";
  if (categorySlug === "brownies") return `${variantName} · ${id ? "1 loyang" : "1 tray"}`;
  return variantName;
}

/** Category names in the active language. Slugs come from the database. */
export const categoryNames: Record<string, Text> = {
  "soft-cookies": { en: "Soft cookies", id: "Soft cookies" },
  brownies: { en: "Brownies", id: "Brownies" },
  tiramisu: { en: "Tiramisu", id: "Tiramisu" },
};

/** The built-in translation while the admin keeps the original name; a renamed category shows its new name. */
export function categoryName(slug: string, dbName: string, locale: Locale): string {
  const known = categoryNames[slug];
  return known && known.en === dbName ? known[locale] : dbName;
}
