import { defineMessages } from "../../config";

/**
 * pen: Our story (wyZ4j). `body` is also read by the home story band;
 * everything from `intro` down belongs to the our-story page alone.
 */
export const storyMessages = defineMessages({
  en: {
    metaTitle: "Our story",
    metaDescription:
      "How two sisters went from one oven in a Sememi home kitchen to a dessert counter on Jl. Palem Sememi, Surabaya.",
    eyebrow: "OUR STORY",
    title: "A little dessert shop with a big sweet tooth.",
    body: "Droolbites is a dessert shop in Surabaya, with a menu of soft cookies, fudgy brownies, and creamy tiramisu. We bring these familiar favorites together so you can find something for a quick treat, dessert after dinner, or a table to share.",

    intro:
      "It started with one oven, two sisters and a tray of chocolate chunk cookies sold to the neighbors in Sememi. Five years on there's a counter on Jl. Palem Sememi, and the first tray still comes out at 06:00.",
    since: "Since 2021",

    timelineTitle: "From a home kitchen to your table.",
    timelineSub: "One street, and a lot of cookie dough.",
    timeline: [
      {
        year: "2021",
        title: "A home kitchen in Sememi",
        body: "Rani baked, Dewi took the orders over WhatsApp. One oven, one tray of chocolate chunk at a time, sold to neighbors and their friends.",
      },
      {
        year: "2023",
        title: "A counter on Jl. Palem Sememi",
        body: "The waiting list outgrew the kitchen, so we rented a small shopfront down the road. Brownies and tiramisu joined the cookies.",
      },
      {
        year: "2025",
        title: "Orders go online",
        body: "Order on the site, pay with QRIS, a virtual account or an e-wallet, then get it delivered anywhere in Surabaya or pick it up at the counter.",
      },
      {
        year: "Today",
        title: "Bigger crew, same recipes",
        body: "Rani still tastes every batch of dough, and Dewi still answers your messages herself.",
      },
    ],

    foundersTitle: "Two sisters, one oven.",
    foundersBody:
      "Rani runs the kitchen: she spent years tweaking one chocolate chunk recipe until the middle stayed soft all day. Dewi turned it into a shop: the orders, the counter, and a brownie recipe she still won't share.",
    firstCookie: "Rani's first cookie",
    firstBrownie: "Dewi's secret recipe",
    quote:
      "We never wanted a long menu. We wanted the cookie you think about on the way home, and the brownie that makes you order one more tray.",
    quoteName: "Rani & Dewi",
    quoteRole: "Founders, Droolbites",

    numbersTitle: "Droolbites, in numbers.",
    numbersSub: "Still small on purpose. Just a little busier.",
    /** `desserts` is the live count of products on the menu. */
    numbers: (desserts: number) => [
      { value: "12", label: "bakers and counter crew" },
      { value: String(desserts), label: desserts === 1 ? "dessert on the menu" : "desserts on the menu" },
      { value: "~400", label: "cookies a day, give or take" },
      { value: "2021", label: "the year it all started" },
    ],

    visitTitle: "Come find us on Jl. Palem Sememi.",
    visitBody:
      "Grab a box at the counter and say hi to whoever's on shift, or order online for delivery anywhere in Surabaya.",
    findStore: "FIND OUR STORE",
    viewMenu: "VIEW OUR MENU",
  },
  id: {
    metaTitle: "Cerita kami",
    metaDescription:
      "Cerita dua kakak-adik, dari satu oven di dapur rumah di Sememi sampai punya counter dessert di Jl. Palem Sememi, Surabaya.",
    eyebrow: "CERITA KAMI",
    title: "Toko dessert kecil buat kamu yang doyan manis.",
    body: "Droolbites adalah toko dessert di Surabaya dengan menu soft cookies, brownies fudgy dan tiramisu yang creamy. Semua favorit yang sudah akrab ini kami kumpulkan di satu tempat, jadi selalu ada pilihan buat ngemil sebentar, pencuci mulut habis makan malam, atau suguhan untuk ramai-ramai.",

    intro:
      "Awalnya cuma satu oven, dua kakak-adik, dan seloyang cookies chocolate chunk yang dijual ke tetangga di Sememi. Lima tahun kemudian sudah ada counter di Jl. Palem Sememi, dan loyang pertama tetap keluar oven jam 06:00.",
    since: "Sejak 2021",

    timelineTitle: "Dari dapur rumah sampai ke mejamu.",
    timelineSub: "Satu jalan yang sama, dan adonan cookies yang nggak ada habisnya.",
    timeline: [
      {
        year: "2021",
        title: "Dapur rumah di Sememi",
        body: "Rani yang memanggang, Dewi yang mencatat pesanan lewat WhatsApp. Satu oven, satu loyang chocolate chunk sekali jalan, dijual ke tetangga dan teman-teman mereka.",
      },
      {
        year: "2023",
        title: "Counter di Jl. Palem Sememi",
        body: "Daftar pesanan sudah nggak muat di dapur rumah, jadi kami sewa toko kecil nggak jauh dari situ. Brownies dan tiramisu ikut masuk menu.",
      },
      {
        year: "2025",
        title: "Bisa pesan online",
        body: "Pesan lewat website, bayar pakai QRIS, virtual account atau e-wallet, lalu dikirim ke mana pun di Surabaya atau ambil sendiri di toko.",
      },
      {
        year: "Sekarang",
        title: "Tim makin ramai, resep tetap sama",
        body: "Rani masih mencicipi tiap adonan, dan Dewi masih membalas sendiri pesan-pesan kamu.",
      },
    ],

    foundersTitle: "Kakak-adik, satu oven.",
    foundersBody:
      "Rani pegang dapur: bertahun-tahun ia mengutak-atik satu resep chocolate chunk sampai bagian tengahnya tetap lembut seharian. Dewi yang menjadikannya toko: urusan pesanan, counter, dan resep brownies yang sampai sekarang nggak mau ia bagi.",
    firstCookie: "Cookie pertama Rani",
    firstBrownie: "Resep rahasia Dewi",
    quote:
      "Dari awal kami nggak pernah pengin menu yang panjang. Kami cuma pengin bikin cookie yang kepikiran terus di jalan pulang, dan brownies yang bikin kamu pesan satu loyang lagi.",
    quoteName: "Rani & Dewi",
    quoteRole: "Pendiri Droolbites",

    numbersTitle: "Droolbites dalam angka.",
    numbersSub: "Masih kecil, dan memang sengaja. Cuma sekarang lebih sibuk.",
    numbers: (desserts: number) => [
      { value: "12", label: "baker dan kru toko" },
      { value: String(desserts), label: "dessert di menu" },
      { value: "~400", label: "cookies sehari, kurang lebih" },
      { value: "2021", label: "tahun semuanya dimulai" },
    ],

    visitTitle: "Temukan kami di Jl. Palem Sememi.",
    visitBody:
      "Mampir ambil sekotak di counter sambil sapa siapa pun yang lagi jaga, atau pesan online dan kami antar ke mana pun di Surabaya.",
    findStore: "LIHAT LOKASI TOKO",
    viewMenu: "LIHAT MENU",
  },
});
