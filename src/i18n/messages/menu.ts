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

/** "A, B or C" from the truthy parts. */
function joinOr(parts: (string | false | undefined)[], or = "or") {
  const items = parts.filter((p): p is string => !!p);
  return items.length > 1 ? `${items.slice(0, -1).join(", ")} ${or} ${items[items.length - 1]}` : (items[0] ?? "");
}

/** How orders reach the customer, from the store settings. `cutoff` is the last call for pickup. */
type Fulfilment = { fee: string; cutoff: string; delivery: boolean; pickup: boolean };

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
    sub: (n: number) =>
      `${word(EN_WORDS, n)} ${n === 1 ? "dessert" : "desserts"}, baked fresh every morning. Mix anything into one order — delivery or pickup.`,
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
      flavors: (n: number, unit: string) => `${n} ${n === 1 ? "flavor" : "flavors"} · ${unit}`,
      desserts: (n: number) => `${n} ${n === 1 ? "dessert" : "desserts"}`,
    },
    results: (n: number) => `${n} ${n === 1 ? "dessert" : "desserts"} shown`,
    unit: { piece: "per piece", portion: "per portion", tray: "per tray" },
    promo: {
      title: "Can't decide? Mix a box.",
      body: "Add any cookies, brownies and tiramisu to one order.",
      cta: "BROWSE EVERYTHING",
    },
    /** Closing strip on the menu and product pages. */
    steps: {
      title: "Ordering is easy.",
      /** `days` is null when the shop opens every day. */
      sub: (opensAt: string, days: string | null) =>
        `First trays come out of the oven at 06:00. Orders go out from ${opensAt}, ${days ? `on ${days}` : "every day"}.`,
      items: [
        { title: "Pick your desserts", body: "Mix cookies, brownies and tiramisu in one cart." },
        {
          title: (f: Fulfilment) =>
            f.delivery && !f.pickup ? "Delivered to you" : f.pickup && !f.delivery ? "Pick up at our counter" : "Delivery or pickup",
          body: (f: Fulfilment) =>
            f.delivery && f.pickup
              ? `A flat ${f.fee} anywhere in Surabaya, or free pickup at our counter until ${f.cutoff}.`
              : f.delivery
                ? `A flat ${f.fee} anywhere in Surabaya, whatever the size of your order.`
                : f.pickup
                  ? `Free pickup at our counter. Pickup orders close at ${f.cutoff}.`
                  : "Delivery and pickup are paused for now. Call us and we'll help with your order.",
        },
        {
          title: "Pay your way",
          /** Built from the payment groups the store and gateway offer right now. */
          body: (groups: { ewallet?: string; qris?: boolean; va?: boolean; retail?: boolean }) =>
            (joinOr([
              groups.qris && "QRIS",
              groups.va && "a bank virtual account",
              groups.ewallet && `e-wallet (${groups.ewallet})`,
              groups.retail && "cash at Indomaret or Alfamart",
            ]) || "Online payment is paused; ask us at the counter") + ".",
        },
      ],
      help: "Questions about an order? Call or message us at",
      helpAfter: ". We reply within the hour while the shop is open.",
    },
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
    sub: (n: number) =>
      `${word(ID_WORDS, n)} pilihan dessert, dipanggang segar setiap pagi. Campur apa saja dalam satu pesanan — diantar atau ambil sendiri.`,
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
      flavors: (n: number, unit: string) => `${n} rasa · ${unit}`,
      desserts: (n: number) => `${n} dessert`,
    },
    results: (n: number) => `${n} dessert ditampilkan`,
    unit: { piece: "per buah", portion: "per porsi", tray: "per loyang" },
    promo: {
      title: "Bingung pilih? Campur saja.",
      body: "Masukkan cookies, brownies dan tiramisu ke satu pesanan.",
      cta: "LIHAT SEMUA",
    },
    steps: {
      title: "Pesannya gampang.",
      sub: (opensAt: string, days: string | null) =>
        `Loyang pertama keluar dari oven pukul 06:00. Pesanan dikirim mulai pukul ${opensAt}, ${days ? `setiap ${days}` : "setiap hari"}.`,
      items: [
        { title: "Pilih dessert-mu", body: "Campur cookies, brownies dan tiramisu dalam satu keranjang." },
        {
          title: (f: Fulfilment) =>
            f.delivery && !f.pickup ? "Diantar ke tempatmu" : f.pickup && !f.delivery ? "Ambil di toko" : "Diantar atau ambil sendiri",
          body: (f: Fulfilment) =>
            f.delivery && f.pickup
              ? `Ongkir flat ${f.fee} ke seluruh Surabaya, atau ambil gratis di toko sampai pukul ${f.cutoff}.`
              : f.delivery
                ? `Ongkir flat ${f.fee} ke seluruh Surabaya, berapa pun jumlah pesananmu.`
                : f.pickup
                  ? `Ambil gratis di toko. Pesanan ambil di toko ditutup pukul ${f.cutoff}.`
                  : "Pengiriman dan ambil di toko sedang libur dulu. Hubungi kami, nanti kami bantu pesananmu.",
        },
        {
          title: "Bayar sesukamu",
          body: (groups: { ewallet?: string; qris?: boolean; va?: boolean; retail?: boolean }) =>
            (joinOr(
              [
                groups.qris && "QRIS",
                groups.va && "virtual account bank",
                groups.ewallet && `e-wallet (${groups.ewallet})`,
                groups.retail && "tunai di Indomaret atau Alfamart",
              ],
              "atau",
            ) || "Pembayaran online sedang libur; tanya kami di toko") + ".",
        },
      ],
      help: "Ada pertanyaan soal pesanan? Telepon atau chat kami di",
      helpAfter: ". Kami balas dalam satu jam selama toko buka.",
    },
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
