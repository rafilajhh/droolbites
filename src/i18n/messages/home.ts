import { defineMessages } from "../config";

const EN_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
const ID_WORDS = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh"];

/** Landing page (syGdV). */
export const homeMessages = defineMessages({
  en: {
    hero: {
      chip: (name: string) => `New: ${name}!`,
      title: "One bite, endless drool.",
      sub: "Thick, soft-centered cookies, fudgy brownies and creamy tiramisu — made in small batches for delivery or pickup.",
      order: "ORDER NOW",
      visit: "VISIT THE SHOP",
      proof: (n: number, price: string) => `${n} ${n === 1 ? "dessert" : "desserts"} · cookies from ${price}`,
    },
    usp: {
      label: "Why Droolbites",
      pause: "Pause scrolling",
      delivery: "Delivery across Surabaya",
      pickup: "Pickup at Jl. Palem Sememi",
      pay: "Pay by QRIS, e-wallet or transfer",
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
      title: "One oven in Sememi, since 2021.",
      link: "More about us",
      alt: "A stack of five assorted Droolbites cookies: chocolate chunk, double chocolate, red velvet and white chocolate almond",
    },
    occasions: {
      eyebrow: "FOR EVERY MOMENT",
      title: "A box for every occasion.",
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
    reviews: {
      title: "One try, and they're back for more.",
      rating: "4.8 on Google Maps · 300+ reviews",
      more: "More reviews",
      try: (name: string) => `Try the ${name}`,
      // Illustrative quotes, in the order of the band: featured first.
      items: [
        {
          quote:
            "My niece wanted Red Velvet cookies instead of a birthday cake. I ordered thirty, they arrived still warm, and now I'm her favorite uncle.",
          name: "Om Hendra",
          area: "Sambikerep",
        },
        {
          quote: "Double Chocolate is my overtime fuel. Two of those with a coffee and the night shift goes by faster.",
          name: "Bayu",
          area: "Tandes",
        },
        {
          quote: "The almonds actually crunch and the middle stays gooey. I always tuck one in my bag for the ride home.",
          name: "Laras",
          area: "Manukan",
        },
      ],
    },
    visit: {
      eyebrow: "VISIT US",
      title: "Come say hi in Surabaya.",
      alt: "The Droolbites storefront on Jl. Palem Sememi",
      directions: "GET DIRECTIONS",
    },
    heroAlt: "Cookies, brownies and tiramisu on a green table",
    browniesAlt: "A stack of three fudgy brownies",
  },
  id: {
    hero: {
      chip: (name: string) => `Baru: ${name}!`,
      title: "Sekali gigit, bikin ketagihan.",
      sub: "Cookies tebal yang lembut di tengah, brownies fudgy dan tiramisu yang creamy — dibuat dalam batch kecil untuk diantar atau diambil.",
      order: "PESAN SEKARANG",
      visit: "KUNJUNGI TOKO",
      proof: (n: number, price: string) => `${n} dessert · cookies mulai ${price}`,
    },
    usp: {
      label: "Kenapa Droolbites",
      pause: "Jeda teks berjalan",
      delivery: "Antar ke seluruh Surabaya",
      pickup: "Ambil di Jl. Palem Sememi",
      pay: "Bayar pakai QRIS, e-wallet atau transfer",
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
      title: "Satu oven di Sememi, sejak 2021.",
      link: "Kenalan lebih dekat",
      alt: "Tumpukan lima cookies Droolbites aneka rasa: chocolate chunk, double chocolate, red velvet dan white chocolate almond",
    },
    occasions: {
      eyebrow: "UNTUK SETIAP MOMEN",
      title: "Satu kotak untuk setiap acara.",
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
    reviews: {
      title: "Sekali coba, pasti balik lagi.",
      rating: "4,8 di Google Maps · 300+ ulasan",
      more: "Ulasan lainnya",
      try: (name: string) => `Coba ${name}`,
      items: [
        {
          quote:
            "Keponakan saya minta cookies Red Velvet buat ganti kue ultah. Saya pesan tiga puluh, datangnya masih hangat, sekarang saya jadi om kesayangan.",
          name: "Om Hendra",
          area: "Sambikerep",
        },
        {
          quote: "Double Chocolate itu bensin lemburku. Dua biji plus kopi, shift malam berasa lebih cepat.",
          name: "Bayu",
          area: "Tandes",
        },
        {
          quote: "Almondnya beneran renyah, tengahnya tetap lumer. Selalu kuselipin satu di tas buat camilan di jalan pulang.",
          name: "Laras",
          area: "Manukan",
        },
      ],
    },
    visit: {
      eyebrow: "KUNJUNGI KAMI",
      title: "Mampir ke toko kami di Surabaya.",
      alt: "Toko Droolbites di Jl. Palem Sememi",
      directions: "PETUNJUK ARAH",
    },
    heroAlt: "Cookies, brownies dan tiramisu di atas meja hijau",
    browniesAlt: "Tumpukan tiga potong brownies fudgy",
  },
});
