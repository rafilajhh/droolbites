import { defineMessages } from "../../config";

/**
 * pen: Location (QwcUD). The sections after the storefront (hours, getting here, regulars,
 * order ahead) are owner-approved additions; routes, rating and reviews are illustrative.
 */
export const locationMessages = defineMessages({
  en: {
    metaTitle: "Location",
    metaDescription:
      "Visit the Droolbites store in Surabaya for soft cookies, fudgy brownies and tiramisu, or choose store pickup at checkout.",
    eyebrow: "OUR LOCATION",
    title: (city: string) => `Visit us in ${city}.`,
    imageAlt: "The green Droolbites storefront with a display of cookies, brownies and tiramisu",
    openMap: "OPEN MAP",
    openMapLabel: "Open directions in Google Maps (opens in a new tab)",
    openNow: "Open now",
    closedNow: "Closed now",
    callPrefix: "Call ",
    emailMiddle: " or email ",

    visitTitle: "Easy to find, easy to park.",
    visitSub:
      "We're on the west side of the city, a few minutes off Jl. Raya Sememi. Look for the green shopfront and the smell of brown butter.",
    hoursTitle: "Opening hours",
    hoursNote:
      "Public holidays keep the same hours unless we say otherwise on Instagram.",
    routesLabel: "Ways to get here",
    routes: [
      {
        title: "By motorbike or car",
        body: "Turn into Jl. Palem Sememi Raya from Jl. Raya Sememi; we're at F16. There's room out front for about eight motorbikes and two cars.",
        tags: ["Free parking", "Shaded spots"],
      },
      {
        title: "By Gojek or Grab",
        body: "Search for us in the app and the pin lands right at the door. Drivers can wait at the counter while we pack.",
        tags: ["Search “Droolbites Sememi”"],
      },
      {
        title: "Coming from nearby",
        body: "Rough driving times on a normal afternoon. Add ten minutes when it rains.",
        tags: ["Gelora Bung Tomo · 15 min", "Pakuwon Mall · 20 min", "Citraland · 20 min"],
      },
    ],

    reviewsTitle: "What the regulars pick up.",
    reviewsSub: "A few words from people who stop by the counter most weeks.",
    rating: "4.8 on Google Maps · 300+ reviews",
    reviews: [
      {
        quote:
          "I swing by after work for two Chocolate Chunk cookies and somehow always leave with a box. Still soft the next morning.",
        name: "Nadia",
        area: "Lakarsantri",
      },
      {
        quote:
          "Got the 20×20 Fudgy Brownies for my mum’s birthday. Twelve of us, not a crumb left, and pickup took two minutes.",
        name: "Raka",
        area: "Benowo",
      },
      {
        quote: "The Matcha Tiramisu is my weekend treat. Not too sweet, and the team knows my order by now.",
        name: "Sekar",
        area: "Wiyung",
      },
    ],
    tryProduct: (name: string) => `Try the ${name}`,

    ctaTitle: "Order ahead, pick up warm.",
    ctaBody: (fee: string) =>
      `Choose store pickup at checkout and your order is boxed and waiting when you walk in. Pickup is free; delivery anywhere in Surabaya is a flat ${fee}.`,
    pickupCutoff: (time: string) => `Pickup orders close at ${time}, 30 minutes before we do.`,
    ctaOrder: "ORDER FOR PICKUP",
    ctaCall: "CALL THE SHOP",
  },
  id: {
    metaTitle: "Lokasi",
    metaDescription:
      "Kunjungi toko Droolbites di Surabaya untuk soft cookies, brownies fudgy dan tiramisu, atau pilih ambil di toko saat checkout.",
    eyebrow: "LOKASI KAMI",
    title: (city: string) => `Kunjungi kami di ${city}.`,
    imageAlt: "Tampak depan toko Droolbites yang hijau dengan etalase cookies, brownies dan tiramisu",
    openMap: "BUKA PETA",
    openMapLabel: "Buka petunjuk arah di Google Maps (tab baru)",
    openNow: "Sedang buka",
    closedNow: "Sedang tutup",
    callPrefix: "Telepon ",
    emailMiddle: " atau email ",

    visitTitle: "Gampang dicari, gampang parkir.",
    visitSub:
      "Kami ada di Surabaya barat, beberapa menit dari Jl. Raya Sememi. Cari saja toko yang hijau dan wangi brown butter.",
    hoursTitle: "Jam buka",
    hoursNote:
      "Hari libur nasional tetap buka seperti biasa, kecuali ada info lain di Instagram.",
    routesLabel: "Cara ke sini",
    routes: [
      {
        title: "Naik motor atau mobil",
        body: "Masuk ke Jl. Palem Sememi Raya dari Jl. Raya Sememi, kami di nomor F16. Di depan toko muat sekitar delapan motor dan dua mobil.",
        tags: ["Parkir gratis", "Ada yang teduh"],
      },
      {
        title: "Naik Gojek atau Grab",
        body: "Cari nama kami di aplikasi, pin-nya pas di depan pintu. Driver bisa tunggu di kasir selama pesanan dikemas.",
        tags: ["Cari “Droolbites Sememi”"],
      },
      {
        title: "Dari sekitar sini",
        body: "Perkiraan waktu berkendara di sore hari biasa. Tambah sepuluh menit kalau hujan.",
        tags: ["Gelora Bung Tomo · 15 mnt", "Pakuwon Mall · 20 mnt", "Citraland · 20 mnt"],
      },
    ],

    reviewsTitle: "Andalan para langganan.",
    reviewsSub: "Sedikit cerita dari mereka yang hampir tiap minggu mampir ke kasir kami.",
    rating: "4,8 di Google Maps · 300+ ulasan",
    reviews: [
      {
        quote:
          "Pulang kerja mampir beli dua Chocolate Chunk, ujung-ujungnya bawa pulang satu kotak. Besok paginya masih lembut.",
        name: "Nadia",
        area: "Lakarsantri",
      },
      {
        quote:
          "Pesan Fudgy Brownies 20×20 buat ultah Mama. Dua belas orang, habis tanpa sisa, ambilnya cuma dua menit.",
        name: "Raka",
        area: "Benowo",
      },
      {
        quote: "Matcha Tiramisu jadi camilan wajib tiap akhir pekan. Manisnya pas, dan timnya sudah hafal pesananku.",
        name: "Sekar",
        area: "Wiyung",
      },
    ],
    tryProduct: (name: string) => `Coba ${name}`,

    ctaTitle: "Pesan dulu, ambil masih hangat.",
    ctaBody: (fee: string) =>
      `Pilih ambil di toko saat checkout, pesananmu sudah dikemas dan siap begitu kamu datang. Ambil di toko gratis; antar ke seluruh Surabaya cukup ${fee}.`,
    pickupCutoff: (time: string) => `Pesanan ambil di toko ditutup pukul ${time}, 30 menit sebelum toko tutup.`,
    ctaOrder: "PESAN UNTUK DIAMBIL",
    ctaCall: "TELEPON TOKO",
  },
});
