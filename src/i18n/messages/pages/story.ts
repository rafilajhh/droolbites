import { defineMessages } from "../../config";

/**
 * pen: Our story (wyZ4j). `body` is also read by the home story band;
 * everything from `intro` down belongs to the our-story page alone.
 */
export const storyMessages = defineMessages({
  en: {
    metaTitle: "Our story",
    metaDescription:
      "How Olivia went from one oven in a Sememi home kitchen to a dessert counter on Jl. Palem Sememi, Surabaya.",
    eyebrow: "OUR STORY",
    title: "A little dessert shop with a big sweet tooth.",
    body: "Droolbites is a dessert shop in Surabaya, with a menu of soft cookies, fudgy brownies, and creamy tiramisu. We bring these familiar favorites together so you can find something for a quick treat, dessert after dinner, or a table to share.",

    intro:
      "It started with one oven, Olivia and a tray of chocolate chunk cookies baked at home for the school canteen. Two years on the orders come from all over Surabaya, and the first tray still comes out at 06:00.",

    timelineTitle: "From a home kitchen to your table.",
    timelineSub: "One street, and a lot of cookie dough.",
    timeline: [
      {
        year: "2024",
        title: "From the kitchen to the school canteen",
        body: "The first trays left a home kitchen in Sememi for the school canteen. Chocolate chunk, one tray at a time.",
      },
      {
        year: "2024",
        title: "Orders go online",
        body: "Orders started coming in through Shopee and WhatsApp, packed in the same kitchen and sent across Surabaya.",
      },
      {
        year: "2025",
        title: "Finding us on social",
        body: "We started sharing every bake on Instagram, Threads and more, and that's where a lot of new regulars found us.",
      },
      {
        year: "Today",
        title: "Bigger crew, same recipes",
        body: "Now you can order right here on the site. Olivia still tastes every batch of dough, and still answers your messages in person.",
      },
    ],

    foundersTitle: "Meet Olivia.",
    foundersBody:
      "Olivia spent years tweaking one chocolate chunk recipe until the middle stayed soft all day, then turned it into a shop: the orders, the counter, and a brownie recipe that still isn't for sharing.",
    firstCookie: "Olivia's cookie",
    firstBrownie: "Olivia's brownie",
    quote:
      "I never wanted a long menu. I wanted the cookie you think about on the way home, and the brownie that makes you order one more tray.",
    quoteName: "Olivia",
    quoteRole: "Founder, Droolbites",

    numbersTitle: "Droolbites, in numbers.",
    numbersSub: "Still small on purpose. Just a little busier.",
    /** `desserts` is the live count of products on the menu. */
    numbers: (desserts: number) => [
      { value: "12", label: "bakers and counter crew" },
      { value: String(desserts), label: desserts === 1 ? "dessert on the menu" : "desserts on the menu" },
      { value: "~400", label: "cookies a day, give or take" },
      { value: "100%", label: "baked fresh, never frozen" },
    ],

    visitTitle: "Come find us at the counter.",
    visitBody:
      "Grab a box at the counter and say hi to whoever's on shift, or order online for delivery anywhere in Surabaya.",
    findStore: "FIND OUR STORE",
    viewMenu: "VIEW OUR MENU",
  },
  id: {
    metaTitle: "Cerita kami",
    metaDescription:
      "Cerita Olivia, dari satu oven di dapur rumah di Sememi sampai punya counter dessert di Jl. Palem Sememi, Surabaya.",
    eyebrow: "CERITA KAMI",
    title: "Toko dessert kecil buat kamu yang doyan manis.",
    body: "Droolbites adalah toko dessert di Surabaya dengan menu soft cookies, brownies fudgy dan tiramisu yang creamy. Semua favorit yang sudah akrab ini kami kumpulkan di satu tempat, jadi selalu ada pilihan buat ngemil sebentar, pencuci mulut habis makan malam, atau suguhan untuk ramai-ramai.",

    intro:
      "Awalnya cuma satu oven, Olivia, dan seloyang cookies chocolate chunk yang dipanggang di rumah untuk kantin sekolah. Dua tahun kemudian pesanan datang dari seluruh Surabaya, dan loyang pertama tetap keluar oven jam 06:00.",

    timelineTitle: "Dari dapur rumah sampai ke mejamu.",
    timelineSub: "Satu jalan yang sama, dan adonan cookies yang nggak ada habisnya.",
    timeline: [
      {
        year: "2024",
        title: "Dari dapur ke kantin sekolah",
        body: "Loyang-loyang pertama berangkat dari dapur rumah di Sememi ke kantin sekolah. Chocolate chunk, seloyang demi seloyang.",
      },
      {
        year: "2024",
        title: "Mulai jualan online",
        body: "Pesanan mulai masuk lewat Shopee dan WhatsApp, dikemas di dapur yang sama lalu dikirim ke seluruh Surabaya.",
      },
      {
        year: "2025",
        title: "Ketemu kamu di sosmed",
        body: "Kami mulai berbagi tiap adonan di Instagram, Threads dan lainnya, dan dari situlah banyak pelanggan baru kenal kami.",
      },
      {
        year: "Sekarang",
        title: "Tim makin ramai, resep tetap sama",
        body: "Sekarang kamu bisa pesan langsung di website ini. Olivia masih mencicipi tiap adonan, dan masih membalas sendiri pesan-pesan kamu.",
      },
    ],

    foundersTitle: "Kenalan sama Olivia.",
    foundersBody:
      "Bertahun-tahun Olivia mengutak-atik satu resep chocolate chunk sampai bagian tengahnya tetap lembut seharian, lalu menjadikannya toko: urusan pesanan, counter, dan resep brownies yang sampai sekarang nggak dibagi ke siapa pun.",
    firstCookie: "Cookie Olivia",
    firstBrownie: "Brownies Olivia",
    quote:
      "Dari awal aku nggak pernah pengin menu yang panjang. Aku cuma pengin bikin cookie yang kepikiran terus di jalan pulang, dan brownies yang bikin kamu pesan satu loyang lagi.",
    quoteName: "Olivia",
    quoteRole: "Pendiri Droolbites",

    numbersTitle: "Droolbites dalam angka.",
    numbersSub: "Masih kecil, dan memang sengaja. Cuma sekarang lebih sibuk.",
    numbers: (desserts: number) => [
      { value: "12", label: "baker dan kru toko" },
      { value: String(desserts), label: "dessert di menu" },
      { value: "~400", label: "cookies sehari, kurang lebih" },
      { value: "100%", label: "dibuat segar, tanpa stok beku" },
    ],

    visitTitle: "Temukan kami di counter.",
    visitBody:
      "Mampir ambil sekotak di counter sambil sapa siapa pun yang lagi jaga, atau pesan online dan kami antar ke mana pun di Surabaya.",
    findStore: "LIHAT LOKASI TOKO",
    viewMenu: "LIHAT MENU",
  },
});
