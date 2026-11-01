import { defineMessages } from "../config";

const EN_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
];
const ID_WORDS = [
  "Nol",
  "Satu",
  "Dua",
  "Tiga",
  "Empat",
  "Lima",
  "Enam",
  "Tujuh",
  "Delapan",
  "Sembilan",
  "Sepuluh",
  "Sebelas",
  "Dua belas",
];

/** 7 → "Seven" / "Tujuh"; larger numbers stay digits. */
const word = (words: string[], n: number) => words[n] ?? String(n);

/** "Brownies", "Tiramisu" → "Brownies & tiramisu". */
const joinNames = (names: string[], and: string) => {
  const [first, ...rest] = names;
  const tail = rest.map((n) => n.toLowerCase());
  if (tail.length === 0) return first;
  return `${[first, ...tail.slice(0, -1)].join(", ")} ${and} ${tail[tail.length - 1]}`;
};

/**
 * Our Menu page (uQ4f5) with its overlays: category filter (nIoP5), search
 * suggestions (MPMQk) and the size picker (kfcyP). Also the strings of the
 * shared shop cards, which appear on the landing page and product pages too.
 */
export const menuMessages = defineMessages({
  en: {
    metaTitle: "Our menu",
    metaDescription: "Soft cookies, fudgy brownies and tiramisu, baked fresh every morning in Surabaya.",
    eyebrow: "OUR MENU",
    title: "Choose your dessert.",
    sub: "Mix anything into one order.",
    search: {
      placeholder: "Search cookies, brownies, tiramisu…",
      open: "Search the menu",
      label: "Search desserts",
      clear: "Clear search",
      suggestions: "SUGGESTIONS",
      seeAll: (q: string) => `See all results for “${q}”`,
      none: (q: string) => `No desserts match “${q}”.`,
    },
    filter: {
      all: "All products",
      heading: "FILTER BY CATEGORY",
      open: "Filter by category",
    },
    group: {
      join: (names: string[]) => joinNames(names, "&"),
    },
    results: (n: number) => `${n} ${n === 1 ? "dessert" : "desserts"} shown`,
    unit: { piece: "per piece", portion: "per portion", tray: "per tray" },
    empty: {
      title: (q: string) => `No desserts match “${q}”.`,
      body: "Try another flavor, or browse the whole menu.",
      reset: "SHOW ALL DESSERTS",
    },
    card: {
      add: (name: string) => `Add ${name} to cart`,
      chooseSize: (name: string) => `Choose a size for ${name}`,
      from: (price: string) => `From ${price}`,
      sizes: (n: number) => `${n} sizes`,
      sizeRange: (n: number, from: string, to: string) => `${word(EN_WORDS, n)} tray sizes, from ${from} to ${to}.`,
      error: "Couldn't add to cart. Please try again.",
      errorShort: "Couldn't add — try again",
    },
    sizeModal: {
      titleTray: "Choose a tray size",
      title: "Choose a size",
      close: "Close",
      /** Split label: below sm only the verb shows; the rest stays for screen readers. */
      addVerb: "ADD",
      addRest: " TO CART",
      decrease: "Decrease quantity",
      increase: "Increase quantity",
    },
  },
  id: {
    metaTitle: "Menu kami",
    metaDescription: "Soft cookies, brownies fudgy dan tiramisu, dipanggang segar setiap pagi di Surabaya.",
    eyebrow: "MENU KAMI",
    title: "Pilih dessert-mu.",
    sub: "Campur apa saja dalam satu pesanan.",
    search: {
      placeholder: "Cari cookies, brownies, tiramisu…",
      open: "Cari di menu",
      label: "Cari dessert",
      clear: "Hapus pencarian",
      suggestions: "SARAN",
      seeAll: (q: string) => `Lihat semua hasil untuk “${q}”`,
      none: (q: string) => `Tidak ada dessert yang cocok dengan “${q}”.`,
    },
    filter: {
      all: "Semua produk",
      heading: "FILTER KATEGORI",
      open: "Filter kategori",
    },
    group: {
      join: (names: string[]) => joinNames(names, "&"),
    },
    results: (n: number) => `${n} dessert ditampilkan`,
    unit: { piece: "per buah", portion: "per porsi", tray: "per loyang" },
    empty: {
      title: (q: string) => `Tidak ada dessert yang cocok dengan “${q}”.`,
      body: "Coba rasa lain, atau lihat seluruh menu.",
      reset: "LIHAT SEMUA DESSERT",
    },
    card: {
      add: (name: string) => `Tambahkan ${name} ke keranjang`,
      chooseSize: (name: string) => `Pilih ukuran ${name}`,
      from: (price: string) => `Mulai ${price}`,
      sizes: (n: number) => `${n} ukuran`,
      sizeRange: (n: number, from: string, to: string) =>
        `${word(ID_WORDS, n)} ukuran loyang, dari ${from} sampai ${to}.`,
      error: "Gagal menambahkan ke keranjang. Coba lagi ya.",
      errorShort: "Gagal ditambahkan — coba lagi ya",
    },
    sizeModal: {
      titleTray: "Pilih ukuran loyang",
      title: "Pilih ukuran",
      close: "Tutup",
      addVerb: "TAMBAH",
      addRest: " KE KERANJANG",
      decrease: "Kurangi jumlah",
      increase: "Tambah jumlah",
    },
  },
});
