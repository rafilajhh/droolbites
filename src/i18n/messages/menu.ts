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
      close: "Close search",
      browse: "BROWSE BY CATEGORY",
      seeAll: (q: string) => `See all results for “${q}”`,
      none: (q: string) => `No desserts match “${q}”.`,
    },
    filter: {
      all: "All products",
      heading: "FILTER BY CATEGORY",
      open: "Filter by category",
    },
    results: (n: number) => `${n} ${n === 1 ? "dessert" : "desserts"} shown`,
    unit: { piece: "per piece", portion: "per portion", tray: "per tray" },
    empty: {
      title: (q: string) => `No desserts match “${q}”.`,
      body: "Try another flavor, or browse the whole menu.",
      reset: "SHOW ALL DESSERTS",
      /** A search inside one category that only matches in others. */
      inCategory: (category: string, q: string) => `Nothing in ${category} matches “${q}”.`,
      elsewhere: (n: number) => `${n} ${n === 1 ? "dessert matches" : "desserts match"} in other categories.`,
      showResults: (n: number) => `SHOW ${n === 1 ? "THE RESULT" : `ALL ${n} RESULTS`}`,
    },
    card: {
      add: (name: string) => `Add ${name} to cart`,
      chooseSize: (name: string) => `Choose a size for ${name}`,
      from: (price: string) => `From ${price}`,
      sizes: (n: number) => `${n} sizes`,
      /** Brownie trays: "Four tray sizes, from 10 × 10 to 20 × 30 cm." */
      trayRange: (n: number, from: string, to: string) => `${word(EN_WORDS, n)} tray sizes, from ${from} to ${to}.`,
      sizeRange: (n: number, from: string, to: string) => `${word(EN_WORDS, n)} sizes, from ${from} to ${to}.`,
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
    /** Stock notes on cards, the size picker and the product page (shown only for 0 to 5 left). */
    stock: {
      left: (n: number) => `Only ${n} left`,
      soldOut: "Sold out",
      soldOutLabel: (name: string) => `${name} is sold out`,
      /** Why an add was refused: sold out meanwhile, or the cart already holds all that's left. */
      soldOutNow: "Sorry, that just sold out.",
      allInCart: (n: number) => (n === 1 ? "The last one is already in your cart." : `All ${n} left are already in your cart.`),
      allInCartShort: (n: number) => (n === 1 ? "Last one's in your cart" : `All ${n} are in your cart`),
      /** The line already holds the most one order takes. */
      atMax: (n: number) => `Your cart already has ${n} of these, the most per order.`,
      atMaxShort: (n: number) => `${n} in cart, the max`,
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
      close: "Tutup pencarian",
      browse: "LIHAT PER KATEGORI",
      seeAll: (q: string) => `Lihat semua hasil untuk “${q}”`,
      none: (q: string) => `Tidak ada dessert yang cocok dengan “${q}”.`,
    },
    filter: {
      all: "Semua produk",
      heading: "FILTER KATEGORI",
      open: "Filter kategori",
    },
    results: (n: number) => `${n} dessert ditampilkan`,
    unit: { piece: "per buah", portion: "per porsi", tray: "per loyang" },
    empty: {
      title: (q: string) => `Tidak ada dessert yang cocok dengan “${q}”.`,
      body: "Coba rasa lain, atau lihat seluruh menu.",
      reset: "LIHAT SEMUA DESSERT",
      inCategory: (category: string, q: string) => `Tidak ada yang cocok dengan “${q}” di ${category}.`,
      elsewhere: (n: number) => `Ada ${n} dessert yang cocok di kategori lain.`,
      showResults: (n: number) => (n === 1 ? "LIHAT HASILNYA" : `LIHAT ${n} HASIL`),
    },
    card: {
      add: (name: string) => `Tambahkan ${name} ke keranjang`,
      chooseSize: (name: string) => `Pilih ukuran ${name}`,
      from: (price: string) => `Mulai ${price}`,
      sizes: (n: number) => `${n} ukuran`,
      trayRange: (n: number, from: string, to: string) =>
        `${word(ID_WORDS, n)} ukuran loyang, dari ${from} sampai ${to}.`,
      sizeRange: (n: number, from: string, to: string) => `${word(ID_WORDS, n)} ukuran, dari ${from} sampai ${to}.`,
      error: "Gagal menambahkan ke keranjang. Coba lagi, ya.",
      errorShort: "Gagal ditambahkan — coba lagi, ya",
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
    stock: {
      left: (n: number) => `Sisa ${n}`,
      soldOut: "Habis",
      soldOutLabel: (name: string) => `${name} lagi habis`,
      soldOutNow: "Yah, barusan habis.",
      allInCart: (n: number) => (n === 1 ? "Yang terakhir sudah ada di keranjangmu." : `Semua sisa ${n} sudah ada di keranjangmu.`),
      allInCartShort: (n: number) => (n === 1 ? "Yang terakhir sudah di keranjang" : `Sisa ${n} sudah di keranjang semua`),
      atMax: (n: number) => `Keranjangmu sudah berisi ${n}, jumlah maksimal per pesanan.`,
      atMaxShort: (n: number) => `Sudah ${n}, maksimal`,
    },
  },
});
