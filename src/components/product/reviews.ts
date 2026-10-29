import type { Locale } from "@/i18n/config";

/**
 * Illustrative product ratings and reviews (owner-approved dummy content, 29 Oct 2026).
 * Counts add up to 276, under the site-wide 300+ on Google Maps, and average out at 4.8.
 * Reviewer names are reserved for product pages only (see the facts sheet).
 */
type Text = { en: string; id: string };

type ProductReview = { name: string; area: string; stars: number; quote: Text };

export const productRatings: Record<string, { value: number; count: number }> = {
  "chocolate-chunk": { value: 4.9, count: 58 },
  "double-chocolate": { value: 4.8, count: 41 },
  "red-velvet": { value: 4.7, count: 36 },
  "white-chocolate-almond": { value: 4.8, count: 29 },
  "fudgy-brownies": { value: 4.9, count: 52 },
  "classic-coffee-tiramisu": { value: 4.8, count: 33 },
  "matcha-tiramisu": { value: 4.7, count: 27 },
};

export const productReviews: Record<string, ProductReview[]> = {
  "chocolate-chunk": [
    {
      name: "Fitri",
      area: "Kendung",
      stars: 5,
      quote: {
        en: "Still warm when the courier got here. Soft in the middle, and the chunks are proper dark chocolate.",
        id: "Masih hangat waktu kurirnya sampai. Tengahnya lembut, cokelatnya beneran dark chocolate.",
      },
    },
    {
      name: "Yoga",
      area: "Bringin",
      stars: 5,
      quote: {
        en: "I order six every Friday for the office. They're gone before lunch.",
        id: "Tiap Jumat pesan enam buat kantor. Belum jam makan siang sudah habis.",
      },
    },
  ],
  "double-chocolate": [
    {
      name: "Mbak Tari",
      area: "Lontar",
      stars: 5,
      quote: {
        en: "Rich without being too sweet. My kids fight over the last one.",
        id: "Cokelatnya pekat tapi nggak kemanisan. Anak-anak rebutan yang terakhir.",
      },
    },
    {
      name: "Arif",
      area: "Babatan",
      stars: 4,
      quote: {
        en: "Really fudgy in the middle. Ten seconds in the microwave the next day and it's like new.",
        id: "Tengahnya fudgy banget. Besoknya dihangatkan 10 detik, rasanya kayak baru.",
      },
    },
  ],
  "red-velvet": [
    {
      name: "Sinta",
      area: "Karangpilang",
      stars: 5,
      quote: {
        en: "The white chocolate goes so well with the cocoa. Pretty enough to give as a gift.",
        id: "Cokelat putihnya pas banget sama rasa kakaonya. Cantik juga buat hadiah.",
      },
    },
    {
      name: "Dimas",
      area: "Gunung Anyar",
      stars: 4,
      quote: {
        en: "Softer than I expected, in a good way. I add one to every order now.",
        id: "Lebih lembut dari yang kukira, dan itu bagus. Sekarang tiap pesan pasti tambah satu.",
      },
    },
  ],
  "white-chocolate-almond": [
    {
      name: "Wulan",
      area: "Rungkut",
      stars: 5,
      quote: {
        en: "Crunchy almonds on top, chewy underneath. My favourite with afternoon tea.",
        id: "Almond di atasnya renyah, bawahnya chewy. Favoritku buat teman teh sore.",
      },
    },
    {
      name: "Tegar",
      area: "Tenggilis",
      stars: 5,
      quote: {
        en: "Not too sweet, which is rare for white chocolate. Ordered a second batch the same week.",
        id: "Nggak terlalu manis, jarang lho untuk white chocolate. Seminggu langsung pesan lagi.",
      },
    },
  ],
  "fudgy-brownies": [
    {
      name: "Ayu",
      area: "Mulyorejo",
      stars: 5,
      quote: {
        en: "Got the 20 × 30 tray for my mum's birthday. Twenty people, no leftovers.",
        id: "Pesan loyang 20 × 30 buat ulang tahun ibu. Dua puluh orang, nggak ada sisa.",
      },
    },
    {
      name: "Rizky",
      area: "Kenjeran",
      stars: 5,
      quote: {
        en: "Crackly top, dense middle. Exactly how brownies should be.",
        id: "Atasnya kering mengilap, tengahnya padat. Brownies ya memang harusnya begini.",
      },
    },
  ],
  "classic-coffee-tiramisu": [
    {
      name: "Nisa",
      area: "Kendung",
      stars: 5,
      quote: {
        en: "Strong coffee, light cream, not soggy at all. Tastes like a café dessert.",
        id: "Kopinya kuat, krimnya ringan, sama sekali nggak lembek. Rasanya kayak dessert kafe.",
      },
    },
    {
      name: "Fajar",
      area: "Babatan",
      stars: 4,
      quote: {
        en: "Picked it up on my way home at eight. Worth the detour to Sememi.",
        id: "Ambil sendiri sepulang kerja jam delapan malam. Nggak rugi mampir ke Sememi.",
      },
    },
  ],
  "matcha-tiramisu": [
    {
      name: "Melati",
      area: "Rungkut",
      stars: 5,
      quote: {
        en: "The matcha actually tastes like matcha, a little bitter, not just green and sugary.",
        id: "Matcha-nya berasa, ada pahit yang enak, bukan sekadar hijau dan manis.",
      },
    },
    {
      name: "Bagas",
      area: "Tenggilis",
      stars: 5,
      quote: {
        en: "Ordered one to try and came back for four the next day.",
        id: "Pesan satu buat coba, besoknya balik lagi beli empat.",
      },
    },
  ],
};

/** 4.8 → "4.8" (EN) / "4,8" (ID). */
export function formatRating(value: number, locale: Locale) {
  return value.toLocaleString(locale === "id" ? "id-ID" : "en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
