import type { Locale } from "@/i18n/config";

/**
 * Copy that the PDM does not store: badges, long descriptions, Indonesian
 * translations and serving notes. Keyed by product slug. Products created
 * later from the admin fall back to the database description.
 */
type Text = { en: string; id: string };

export type StickerTone = "mustard" | "salmon" | "lime" | "lavender";

/** Brownies are sold by tray size; everything else by flavor or piece. */
export function isTrayCategory(slug: string | undefined) {
  return slug === "brownies";
}

export type ProductContent = {
  badge?: { label: Text; tone: StickerTone };
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
 * Ingredient lists run from the largest share to the smallest, as on a label. The chocolate we buy in
 * lists its own ingredients in brackets.
 */
const DARK_CHOCOLATE: Text = {
  en: "(cocoa mass, sugar, cocoa butter, soy lecithin)",
  id: "(massa kakao, gula, lemak kakao, lesitin kedelai)",
};
const WHITE_CHOCOLATE: Text = {
  en: "(sugar, cocoa butter, whole milk powder, soy lecithin)",
  id: "(gula, lemak kakao, susu bubuk, lesitin kedelai)",
};
/** Shared by every product: we bake nuts in the same kitchen. */
const NUT_KITCHEN: Text = {
  en: "Made in a kitchen that also handles nuts.",
  id: "Dibuat di dapur yang juga mengolah kacang.",
};
/** Cookies and brownies. */
const BAKE_ALLERGENS: Text = {
  en: `Contains wheat (gluten), egg, milk and soy. ${NUT_KITCHEN.en}`,
  id: `Mengandung gandum (gluten), telur, susu dan kedelai. ${NUT_KITCHEN.id}`,
};
const TIRAMISU_ALLERGENS = (caffeine: Text): Text => ({
  en: `Contains wheat (gluten), egg and milk. ${caffeine.en} ${NUT_KITCHEN.en}`,
  id: `Mengandung gandum (gluten), telur dan susu. ${caffeine.id} ${NUT_KITCHEN.id}`,
});

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
    ingredients: {
      en: `Wheat flour, butter, brown sugar, dark chocolate chunks ${DARK_CHOCOLATE.en}, cane sugar, eggs, vanilla extract, baking soda, sea salt.`,
      id: `Tepung terigu, butter, brown sugar, potongan cokelat hitam ${DARK_CHOCOLATE.id}, gula pasir, telur, ekstrak vanila, soda kue, garam laut.`,
    },
    allergens: BAKE_ALLERGENS,
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
    ingredients: {
      en: `Wheat flour, butter, brown sugar, dark chocolate chunks ${DARK_CHOCOLATE.en}, cane sugar, eggs, Dutch-process cocoa powder, vanilla extract, baking soda, sea salt.`,
      id: `Tepung terigu, butter, brown sugar, potongan cokelat hitam ${DARK_CHOCOLATE.id}, gula pasir, telur, bubuk kakao (dutch process), ekstrak vanila, soda kue, garam laut.`,
    },
    allergens: BAKE_ALLERGENS,
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
    ingredients: {
      en: `Wheat flour, butter, brown sugar, white chocolate pieces ${WHITE_CHOCOLATE.en}, cane sugar, eggs, buttermilk, cocoa powder, red food colouring, vanilla extract, baking soda, salt.`,
      id: `Tepung terigu, butter, brown sugar, potongan cokelat putih ${WHITE_CHOCOLATE.id}, gula pasir, telur, buttermilk, bubuk kakao, pewarna makanan merah, ekstrak vanila, soda kue, garam.`,
    },
    allergens: BAKE_ALLERGENS,
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
    ingredients: {
      en: `Wheat flour, butter, brown sugar, white chocolate pieces ${WHITE_CHOCOLATE.en}, roasted almonds, cane sugar, eggs, vanilla extract, baking soda, sea salt.`,
      id: `Tepung terigu, butter, brown sugar, potongan cokelat putih ${WHITE_CHOCOLATE.id}, almon panggang, gula pasir, telur, ekstrak vanila, soda kue, garam laut.`,
    },
    allergens: {
      en: "Contains wheat (gluten), egg, milk, soy and almonds (tree nuts).",
      id: "Mengandung gandum (gluten), telur, susu, kedelai dan almon (kacang pohon).",
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
    ingredients: {
      en: `Dark chocolate ${DARK_CHOCOLATE.en}, butter, cane sugar, eggs, wheat flour, cocoa powder, vanilla extract, salt.`,
      id: `Cokelat hitam ${DARK_CHOCOLATE.id}, butter, gula pasir, telur, tepung terigu, bubuk kakao, ekstrak vanila, garam.`,
    },
    allergens: BAKE_ALLERGENS,
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
    ingredients: {
      en: "Mascarpone, fresh cream, ladyfinger sponge (wheat flour, eggs, sugar), espresso, egg yolks, sugar, cocoa powder. No alcohol.",
      id: "Mascarpone, krim segar, bolu ladyfinger (tepung terigu, telur, gula), espresso, kuning telur, gula, bubuk kakao. Tanpa alkohol.",
    },
    allergens: TIRAMISU_ALLERGENS({ en: "Espresso contains caffeine.", id: "Espresso mengandung kafein." }),
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
    ingredients: {
      en: "Mascarpone, fresh cream, ladyfinger sponge (wheat flour, eggs, sugar), milk, egg yolks, sugar, Japanese matcha powder. No alcohol.",
      id: "Mascarpone, krim segar, bolu ladyfinger (tepung terigu, telur, gula), susu, kuning telur, gula, bubuk matcha Jepang. Tanpa alkohol.",
    },
    allergens: TIRAMISU_ALLERGENS({ en: "Matcha contains caffeine.", id: "Matcha mengandung kafein." }),
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

/** Seeded products whose photo ships in public/images/products/<slug>.png. */
const BUNDLED_PHOTOS = new Set([
  "chocolate-chunk",
  "double-chocolate",
  "red-velvet",
  "white-chocolate-almond",
  "fudgy-brownies",
  "classic-coffee-tiramisu",
  "matcha-tiramisu",
]);

/** The logo badge on the oat ground, for products added in the admin without a photo. */
export const PRODUCT_PLACEHOLDER_IMAGE = "/images/site/product-placeholder.png";

/**
 * Product photo: the database image, else the bundled photo for a seeded
 * product, else the placeholder (never a guessed path that would 404).
 */
export function productImageUrl(slug: string, imageUrl: string | null) {
  if (imageUrl) return imageUrl;
  return BUNDLED_PHOTOS.has(slug) ? `/images/products/${slug}.png` : PRODUCT_PLACEHOLDER_IMAGE;
}

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
  if (isTrayCategory(categorySlug)) return `${variantName} · ${id ? "1 loyang" : "1 tray"}`;
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
