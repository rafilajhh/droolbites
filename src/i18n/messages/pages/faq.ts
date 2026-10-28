import { defineMessages } from "../../config";

/** Store facts the answers quote, read from the store settings. */
export type FaqFacts = {
  address: string;
  hours: string;
  deliveryFee: string;
  email: string;
  payments: string;
};

/** pen: FAQ (ouetk). Only the first answer is drawn; the rest follow how the shop works. */
export const faqMessages = defineMessages({
  en: {
    metaTitle: "FAQ",
    metaDescription:
      "Answers about Droolbites desserts, delivery and store pickup, payment, storage and allergens.",
    eyebrow: "FAQ",
    title: "Questions? We've got answers.",
    sub: "About our desserts, ordering, and visiting the store.",
    contactTitle: "Still hungry for answers?",
    payments: { va: "bank virtual account", qris: "QRIS", ewallet: "e-wallets", or: "or" },
    groups: [
      {
        label: "BEFORE YOU ORDER",
        items: [
          {
            q: "What does Droolbites sell?",
            a: () => "We offer four soft cookie flavors, fudgy brownies in four sizes, and two types of tiramisu.",
          },
          {
            q: "Which cookie flavors can I choose?",
            a: () =>
              "Chocolate Chunk, Double Chocolate, Red Velvet and White Chocolate Almond. Every cookie is thick, soft in the middle and sold by the piece, so you can mix flavors in one order.",
          },
          {
            q: "What brownie sizes are available?",
            a: () =>
              "The same fudgy brownie comes in four tray sizes: 10 × 10 cm (serves 2–4), 15 × 15 cm (serves 6–9), 20 × 20 cm (serves 10–16) and 20 × 30 cm for a crowd.",
          },
          {
            q: "Which tiramisu options are available?",
            a: () =>
              "Classic Coffee and Matcha. Both are single portions of soaked sponge layered with mascarpone cream and chilled overnight.",
          },
        ],
      },
      {
        label: "ORDERING & PICKUP",
        items: [
          {
            q: "Where is the store?",
            a: (f: FaqFacts) => `You'll find us at ${f.address}. Opening hours: ${f.hours}.`,
          },
          {
            q: "Can I choose delivery or store pickup?",
            a: (f: FaqFacts) =>
              `Yes. Choose delivery (a flat ${f.deliveryFee} fee) or free store pickup at checkout. You can check out as a guest or sign in to follow your orders in your account. Pay by ${f.payments}.`,
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
    sub: "Seputar dessert kami, cara pesan, dan berkunjung ke toko.",
    contactTitle: "Masih penasaran?",
    payments: { va: "virtual account bank", qris: "QRIS", ewallet: "e-wallet", or: "atau" },
    groups: [
      {
        label: "SEBELUM PESAN",
        items: [
          {
            q: "Droolbites jual apa saja?",
            a: () => "Kami punya empat rasa soft cookies, brownies fudgy dalam empat ukuran, dan dua jenis tiramisu.",
          },
          {
            q: "Rasa cookies apa saja yang bisa dipilih?",
            a: () =>
              "Chocolate Chunk, Double Chocolate, Red Velvet dan White Chocolate Almond. Semua cookies tebal, lembut di tengah dan dijual per buah, jadi kamu bisa campur rasa dalam satu pesanan.",
          },
          {
            q: "Brownies tersedia dalam ukuran apa saja?",
            a: () =>
              "Brownies fudgy yang sama tersedia dalam empat ukuran loyang: 10 × 10 cm (untuk 2–4 orang), 15 × 15 cm (untuk 6–9 orang), 20 × 20 cm (untuk 10–16 orang) dan 20 × 30 cm untuk rombongan.",
          },
          {
            q: "Ada pilihan tiramisu apa saja?",
            a: () =>
              "Classic Coffee dan Matcha. Keduanya satu porsi bolu yang direndam, berlapis krim mascarpone dan didinginkan semalaman.",
          },
        ],
      },
      {
        label: "PEMESANAN & AMBIL DI TOKO",
        items: [
          {
            q: "Di mana tokonya?",
            a: (f: FaqFacts) => `Kamu bisa menemukan kami di ${f.address}. Jam buka: ${f.hours}.`,
          },
          {
            q: "Bisa pilih dikirim atau ambil di toko?",
            a: (f: FaqFacts) =>
              `Bisa. Pilih pengiriman (ongkir tetap ${f.deliveryFee}) atau ambil di toko gratis saat checkout. Kamu bisa checkout sebagai tamu atau masuk ke akun untuk memantau pesanan. Bayar lewat ${f.payments}.`,
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
