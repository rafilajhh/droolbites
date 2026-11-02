import { defineMessages } from "../../config";

/** Store facts the answers quote, read from the store settings and the catalog. */
export type FaqFacts = {
  address: string;
  hours: string;
  opensAt: string;
  /** Base delivery fee, e.g. "Rp10.000". */
  deliveryFee: string;
  /** How far the store delivers, in km. */
  deliveryMaxKm: number;
  email: string;
  payments: string;
  /** Every enabled payment method with its brands, e.g. "e-wallets (DANA, OVO or ShopeePay), QRIS or …". */
  paymentsDetail: string;
  counts: { cookies: number; brownieSizes: number; tiramisu: number };
};

const EN_WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const ID_WORDS = ["tanpa", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];
const enWord = (n: number) => EN_WORDS[n] ?? String(n);
const idWord = (n: number) => ID_WORDS[n] ?? String(n);

/** pen: FAQ (ouetk). Only the first answer is drawn; the rest follow how the shop works. */
export const faqMessages = defineMessages({
  en: {
    metaTitle: "FAQ",
    metaDescription:
      "Answers about Droolbites desserts, delivery and store pickup, payment, storage and allergens.",
    eyebrow: "FAQ",
    title: "Questions? We've got answers.",
    contactTitle: "Still hungry for answers?",
    whatsapp: "Chat on WhatsApp",
    picks: {
      title: "Not sure where to start?",
      sub: "Three cookies our regulars keep coming back for, in their own words.",
      link: "See the full menu",
      from: (price: string) => `From ${price}`,
      reviews: {
        "red-velvet": {
          quote: "I bought one to try on my way home and turned the car around for four more. Those little pockets of white chocolate get me every time.",
          name: "Dinda",
          area: "Citraland",
        },
        "double-chocolate": {
          quote: "Dark cocoa dough with big melty chunks. My son now asks for it instead of martabak on Saturday nights.",
          name: "Bu Ratna",
          area: "Darmo",
        },
        "white-chocolate-almond": {
          quote: "Roasted almonds on the edge, soft in the middle. Ten seconds in the microwave and it tastes fresh out of the tray.",
          name: "Kevin",
          area: "Pakuwon",
        },
      },
    },
    payments: { va: "bank virtual account", qris: "QRIS", ewallet: "e-wallets", or: "or" },
    paymentsDetail: {
      ewallet: (brands: string) => `e-wallets (${brands})`,
      va: (banks: string, more: boolean) => `bank virtual accounts (${banks}${more ? " and more" : ""})`,
      retail: (stores: string) => `cash at ${stores}`,
    },
    groups: [
      {
        label: "BEFORE YOU ORDER",
        items: [
          {
            q: "What does Droolbites sell?",
            a: ({ counts: c }: FaqFacts) =>
              `We offer ${enWord(c.cookies)} soft cookie ${c.cookies === 1 ? "flavor" : "flavors"} (Chocolate Chunk, Double Chocolate, Red Velvet and White Chocolate Almond), fudgy brownies in ${enWord(c.brownieSizes)} ${c.brownieSizes === 1 ? "size" : "sizes"}, and ${enWord(c.tiramisu)} ${c.tiramisu === 1 ? "type" : "types"} of tiramisu (Classic Coffee and Matcha). Every cookie is thick, soft in the middle and sold by the piece, so you can mix flavors in one order. Tiramisu comes as single portions of soaked sponge layered with mascarpone cream and chilled overnight.`,
          },
          {
            q: "What brownie sizes are available?",
            a: () =>
              "The same fudgy brownie comes in four tray sizes: 10 × 10 cm (serves 2–4), 15 × 15 cm (serves 6–9), 20 × 20 cm (serves 10–16) and 20 × 30 cm for a crowd.",
          },
        ],
      },
      {
        label: "ORDERING & PICKUP",
        items: [
          {
            q: "Where is the store?",
            a: (f: FaqFacts) => `You'll find us at ${f.address}.`,
          },
          {
            q: "Can I choose delivery or store pickup?",
            a: (f: FaqFacts) =>
              `Yes. Choose delivery (from ${f.deliveryFee} by distance, up to ${f.deliveryMaxKm} km from the store) or free store pickup at checkout. You can check out as a guest or sign in to follow your orders in your account. Pay by ${f.payments}.`,
          },
          {
            q: "How can I pay?",
            a: (f: FaqFacts) =>
              `Pay online at checkout with ${f.paymentsDetail}. The payment instructions appear right after you place your order.`,
          },
          {
            q: "When are you open?",
            a: (f: FaqFacts) =>
              `${f.hours} WIB. The first trays come out of the oven at 06:00, and orders are collected or delivered from ${f.opensAt}. Store pickup orders can be collected during opening hours.`,
          },
          {
            q: "How do I ask about an order?",
            a: (f: FaqFacts) =>
              `Message us on WhatsApp, call the shop or email ${f.email} with your order number. We answer within the hour while the shop is open.`,
          },
        ],
      },
      {
        label: "STORAGE & ALLERGENS",
        items: [
          {
            q: "How should I store my desserts?",
            a: () =>
              "Cookies keep for 3 days in an airtight jar at room temperature — warm one for 10 seconds to bring back the soft middle. Brownies keep for 4 days at room temperature or a week in the fridge. Tiramisu must stay refrigerated; enjoy it within 2 days.",
          },
          {
            q: "Where can I find ingredient and allergen details?",
            a: (f: FaqFacts) =>
              `Each product page lists its allergens and storage notes. Our kitchen also handles wheat, egg, milk, soy and nuts. For the full ingredient list or a severe allergy, email ${f.email} before you order.`,
          },
        ],
      },
    ],
  },
  id: {
    metaTitle: "FAQ",
    metaDescription:
      "Jawaban seputar dessert Droolbites, pengiriman dan ambil di toko, pembayaran, penyimpanan dan alergen.",
    eyebrow: "FAQ",
    title: "Ada pertanyaan? Kami punya jawabannya.",
    contactTitle: "Masih penasaran?",
    whatsapp: "Chat lewat WhatsApp",
    picks: {
      title: "Bingung mulai dari mana?",
      sub: "Tiga cookies yang bikin pelanggan setia kami balik lagi, kata mereka sendiri.",
      link: "Lihat semua menu",
      from: (price: string) => `Mulai ${price}`,
      reviews: {
        "red-velvet": {
          quote: "Beli satu buat dicoba di jalan pulang, eh putar balik lagi buat beli empat. Potongan cokelat putihnya juara.",
          name: "Dinda",
          area: "Citraland",
        },
        "double-chocolate": {
          quote: "Adonan cokelatnya pekat, potongan cokelatnya lumer. Anakku sekarang minta ini, bukan martabak lagi tiap malam Minggu.",
          name: "Bu Ratna",
          area: "Darmo",
        },
        "white-chocolate-almond": {
          quote: "Pinggirnya renyah kena almond panggang, tengahnya lembut. Hangatkan sepuluh detik, rasanya kayak baru keluar dari loyang.",
          name: "Kevin",
          area: "Pakuwon",
        },
      },
    },
    payments: { va: "virtual account bank", qris: "QRIS", ewallet: "e-wallet", or: "atau" },
    paymentsDetail: {
      ewallet: (brands: string) => `e-wallet (${brands})`,
      va: (banks: string, more: boolean) => `virtual account bank (${banks}${more ? " dan lainnya" : ""})`,
      retail: (stores: string) => `tunai di ${stores}`,
    },
    groups: [
      {
        label: "SEBELUM PESAN",
        items: [
          {
            q: "Droolbites jual apa saja?",
            a: ({ counts: c }: FaqFacts) =>
              `Kami punya ${idWord(c.cookies)} rasa soft cookies (Chocolate Chunk, Double Chocolate, Red Velvet dan White Chocolate Almond), brownies fudgy dalam ${idWord(c.brownieSizes)} ukuran, dan ${idWord(c.tiramisu)} jenis tiramisu (Classic Coffee dan Matcha). Semua cookies tebal, lembut di tengah dan dijual per buah, jadi kamu bisa campur rasa dalam satu pesanan. Tiramisu dijual satu porsi: bolu yang direndam, berlapis krim mascarpone dan didinginkan semalaman.`,
          },
          {
            q: "Brownies tersedia dalam ukuran apa saja?",
            a: () =>
              "Brownies fudgy yang sama tersedia dalam empat ukuran loyang: 10 × 10 cm (untuk 2–4 orang), 15 × 15 cm (untuk 6–9 orang), 20 × 20 cm (untuk 10–16 orang) dan 20 × 30 cm untuk rombongan.",
          },
        ],
      },
      {
        label: "PEMESANAN & AMBIL DI TOKO",
        items: [
          {
            q: "Di mana tokonya?",
            a: (f: FaqFacts) => `Kamu bisa menemukan kami di ${f.address}.`,
          },
          {
            q: "Bisa pilih dikirim atau ambil di toko?",
            a: (f: FaqFacts) =>
              `Bisa. Pilih pengiriman (ongkir mulai ${f.deliveryFee} sesuai jarak, maksimal ${f.deliveryMaxKm} km dari toko) atau ambil di toko gratis saat checkout. Kamu bisa checkout sebagai tamu atau masuk ke akun untuk memantau pesanan. Bayar lewat ${f.payments}.`,
          },
          {
            q: "Bisa bayar pakai apa?",
            a: (f: FaqFacts) =>
              `Bayar online saat checkout lewat ${f.paymentsDetail}. Petunjuk pembayarannya langsung muncul setelah kamu membuat pesanan.`,
          },
          {
            q: "Jam berapa tokonya buka?",
            a: (f: FaqFacts) =>
              `${f.hours} WIB. Loyang pertama keluar oven jam 06:00, dan pesanan bisa diambil atau diantar mulai ${f.opensAt}. Pesanan ambil di toko bisa diambil selama jam buka.`,
          },
          {
            q: "Bagaimana kalau mau tanya soal pesanan?",
            a: (f: FaqFacts) =>
              `Kirim pesan lewat WhatsApp, telepon toko atau email ${f.email} dengan menyebutkan nomor pesananmu. Kami balas dalam satu jam selama toko buka.`,
          },
        ],
      },
      {
        label: "PENYIMPANAN & ALERGEN",
        items: [
          {
            q: "Bagaimana cara menyimpan dessert-nya?",
            a: () =>
              "Cookies tahan 3 hari di toples kedap udara pada suhu ruang — hangatkan 10 detik agar bagian tengahnya lembut lagi. Brownies tahan 4 hari di suhu ruang atau seminggu di kulkas. Tiramisu harus disimpan di kulkas; nikmati dalam 2 hari.",
          },
          {
            q: "Di mana info bahan dan alergen?",
            a: (f: FaqFacts) =>
              `Setiap halaman produk mencantumkan alergen dan cara penyimpanannya. Dapur kami juga mengolah gandum, telur, susu, kedelai dan kacang. Untuk daftar bahan lengkap atau alergi berat, email ${f.email} sebelum memesan.`,
          },
        ],
      },
    ],
  },
});
