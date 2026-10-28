import { defineMessages } from "../config";

const EN_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const ID_WORDS = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh"];

/** Landing page (syGdV). */
export const homeMessages = defineMessages({
  en: {
    hero: {
      chip: "Baked fresh daily in Surabaya",
      title: "One bite, endless drool.",
      sub: "Thick, soft-centered cookies, fudgy brownies and creamy tiramisu — made in small batches for delivery or pickup.",
      order: "ORDER NOW",
      menu: "SEE THE MENU",
      proof: (n: number, price: string) => `${n} ${n === 1 ? "dessert" : "desserts"} · cookies from ${price}`,
      sticker: (name: string) => `New: ${name}!`,
    },
    usp: {
      label: "Why Droolbites",
      pause: "Pause scrolling",
      fresh: "Baked fresh daily",
      delivery: "Delivery across Surabaya",
      pickup: "Pickup at Jl. Palem Sememi",
      pay: "Pay with QRIS or transfer",
    },
    cookies: {
      eyebrow: "SOFT COOKIES",
      title: "Start with a cookie.",
      sub: (n: number) =>
        `${EN_WORDS[n] ?? n} ${n === 1 ? "flavor" : "flavors"}, each one thick, golden at the edges and gooey in the middle.`,
      link: "Shop all cookies",
    },
    brownies: {
      eyebrow: "FUDGY BROWNIES",
      title: "Brownies for sharing. Or not.",
      sizes: "Tray sizes and prices",
      cta: "CHOOSE A SIZE",
    },
    tiramisu: {
      eyebrow: "TIRAMISU",
      title: "Keep a spoon ready.",
      sub: "Coffee or matcha, layered with mascarpone cream and chilled overnight.",
    },
    story: {
      label: "About Droolbites",
      link: "More about us",
      alt: "A stack of five assorted Droolbites cookies: chocolate chunk, double chocolate, red velvet and white chocolate almond",
    },
    occasions: {
      eyebrow: "FOR EVERY MOMENT",
      title: "A box for every occasion.",
      link: "Shop the menu",
      gifting: {
        title: "Gifting",
        body: "Mix cookies, brownies and tiramisu into one box — a sweeter way to say thank you.",
        link: "Order a gift",
        alt: "Hands packing cookies, brownies and tiramisu into a gift box",
      },
      gatherings: {
        title: "Gatherings",
        body: "Trays of brownies and plates of cookies sized for birthdays, arisan and office breaks.",
        link: "Order for a crowd",
        alt: "A party table with brownie trays, cookies and tiramisu",
      },
      kitchen: {
        title: "Fresh from our kitchen",
        body: "Every batch is scooped, baked and packed by hand in our Surabaya kitchen each morning.",
        link: "Read our story",
        alt: "Two bakers scooping cookie dough in the Droolbites kitchen",
      },
    },
    steps: {
      eyebrow: "ORDERING & DELIVERY",
      title: "Three steps to your first bite.",
      items: (fee: string) => [
        { title: "Pick your desserts", body: "Mix any cookies, brownie trays and tiramisu in one cart." },
        { title: "Delivery or pickup", body: `Delivery ${fee} anywhere in Surabaya · pickup is free.` },
        {
          title: "Pay your way",
          body: "Pay securely with QRIS or bank transfer, then track your order from your account.",
        },
      ],
    },
    visit: {
      eyebrow: "VISIT US",
      title: "Come say hi in Surabaya.",
      body: (address: string) =>
        `Pick up your order or grab something warm from the counter. We're right on ${address}.`,
      alt: "The Droolbites storefront on Jl. Palem Sememi",
      hours: (hours: string) => `${hours} WIB`,
      directions: "GET DIRECTIONS",
      story: "Our story",
    },
    heroAlt: "Cookies, brownies and tiramisu on a green table",
    browniesAlt: "A stack of three fudgy brownies",
  },
  id: {
    hero: {
      chip: "Dipanggang segar setiap hari di Surabaya",
      title: "Sekali gigit, bikin ketagihan.",
      sub: "Cookies tebal yang lembut di tengah, brownies fudgy dan tiramisu yang creamy — dibuat dalam batch kecil untuk diantar atau diambil.",
      order: "PESAN SEKARANG",
      menu: "LIHAT MENU",
      proof: (n: number, price: string) => `${n} dessert · cookies mulai ${price}`,
      sticker: (name: string) => `Baru: ${name}!`,
    },
    usp: {
      label: "Kenapa Droolbites",
      pause: "Jeda teks berjalan",
      fresh: "Dipanggang segar tiap hari",
      delivery: "Antar ke seluruh Surabaya",
      pickup: "Ambil di Jl. Palem Sememi",
      pay: "Bayar pakai QRIS atau transfer",
    },
    cookies: {
      eyebrow: "SOFT COOKIES",
      title: "Mulai dari cookie.",
      sub: (n: number) => `${ID_WORDS[n] ?? n} rasa, semuanya tebal, keemasan di pinggir dan lumer di tengah.`,
      link: "Lihat semua cookies",
    },
    brownies: {
      eyebrow: "FUDGY BROWNIES",
      title: "Brownies buat berbagi. Atau tidak.",
      sizes: "Ukuran loyang dan harga",
      cta: "PILIH UKURAN",
    },
    tiramisu: {
      eyebrow: "TIRAMISU",
      title: "Siapkan sendokmu.",
      sub: "Kopi atau matcha, berlapis krim mascarpone dan didinginkan semalaman.",
    },
    story: {
      label: "Tentang Droolbites",
      link: "Kenalan lebih dekat",
      alt: "Tumpukan lima cookies Droolbites aneka rasa: chocolate chunk, double chocolate, red velvet dan white chocolate almond",
    },
    occasions: {
      eyebrow: "UNTUK SETIAP MOMEN",
      title: "Satu kotak untuk setiap acara.",
      link: "Lihat menu",
      gifting: {
        title: "Hadiah",
        body: "Campur cookies, brownies dan tiramisu dalam satu kotak — cara manis untuk bilang terima kasih.",
        link: "Pesan hadiah",
        alt: "Tangan mengemas cookies, brownies dan tiramisu ke kotak hadiah",
      },
      gatherings: {
        title: "Kumpul-kumpul",
        body: "Loyang brownies dan sepiring cookies untuk ulang tahun, arisan dan rehat kantor.",
        link: "Pesan untuk rombongan",
        alt: "Meja pesta dengan loyang brownies, cookies dan tiramisu",
      },
      kitchen: {
        title: "Segar dari dapur kami",
        body: "Setiap batch disendok, dipanggang dan dikemas dengan tangan di dapur kami di Surabaya setiap pagi.",
        link: "Baca cerita kami",
        alt: "Dua baker menyendok adonan cookies di dapur Droolbites",
      },
    },
    steps: {
      eyebrow: "PEMESANAN & PENGIRIMAN",
      title: "Tiga langkah ke gigitan pertama.",
      items: (fee: string) => [
        { title: "Pilih dessert-mu", body: "Campur cookies, loyang brownies dan tiramisu dalam satu keranjang." },
        { title: "Diantar atau ambil", body: `Ongkir ${fee} se-Surabaya · pickup gratis.` },
        {
          title: "Bayar sesukamu",
          body: "Bayar dengan aman lewat QRIS atau transfer bank, lalu pantau pesananmu dari akunmu.",
        },
      ],
    },
    visit: {
      eyebrow: "KUNJUNGI KAMI",
      title: "Mampir ke toko kami di Surabaya.",
      body: (address: string) =>
        `Ambil pesananmu atau beli yang masih hangat langsung di etalase. Kami ada di ${address}.`,
      alt: "Toko Droolbites di Jl. Palem Sememi",
      hours: (hours: string) => `${hours} WIB`,
      directions: "PETUNJUK ARAH",
      story: "Cerita kami",
    },
    heroAlt: "Cookies, brownies dan tiramisu di atas meja hijau",
    browniesAlt: "Tumpukan tiga potong brownies fudgy",
  },
});
