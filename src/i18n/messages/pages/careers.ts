import { defineMessages } from "../../config";

/** Applications go to this inbox (Join our team only; not part of the store settings). */
export const CAREERS_EMAIL = "careers@droolbites.biz.id";

/** pen: Join our team (ScPex). */
export const careersMessages = defineMessages({
  en: {
    metaTitle: "Join our team",
    metaDescription:
      "Bake, pack or serve with Droolbites in Surabaya. Email our team to tell us about yourself.",
    eyebrow: "CAREERS",
    title: "Join our team.",
    body: "Our store brings together soft cookies, brownies and tiramisu in Surabaya. If you'd like to bake, pack or serve with us, we'd love to hear from you.",
    imageAlt: "Two Droolbites bakers scooping cookie dough in the kitchen",
    cta: "EMAIL OUR TEAM",
    mailSubject: "Working at Droolbites",
    rolesTitle: "Roles we hire for",
    rolesSub: "Three kinds of shift keep the shop running, from the first tray at six to closing at nine.",
    shiftLabel: "Shift",
    fitLabel: "Good fit",
    roles: [
      {
        title: "Morning baker",
        type: "Full-time",
        shift: "06:00–14:00",
        body: "Mix and scoop the day’s cookie dough, bake the brownie trays and layer the tiramisu before the doors open at ten.",
        fit: "You’re happy up early. Kitchen experience helps; we teach the recipes.",
      },
      {
        title: "Counter crew",
        type: "Part-time",
        shift: "10:00–15:30 or 15:30–21:00",
        body: "Welcome walk-ins, hand over pickup orders and help people choose between Red Velvet and Double Chocolate.",
        fit: "You like chatting with people and stay calm in the evening rush.",
      },
      {
        title: "Packing & delivery crew",
        type: "Full-time",
        shift: "10:00–15:30 or 15:30–21:00",
        body: "Box and label every online order, check it against its DB number, then ride it across Surabaya.",
        fit: "You ride your own motorbike and have a valid SIM C.",
      },
    ],
    rolesSticker: "Students welcome",
    rolesNote:
      "These are the roles we usually hire for, not a list of live openings. Write to us anyway: we keep every note for the next round.",
    perksTitle: "Why bake with us",
    perksSub: "We’re a small kitchen, so the perks are the kind you actually notice.",
    perks: [
      { title: "A cookie every shift", body: "Pick one from the cooling rack when you clock in. Every shift, any flavor." },
      { title: "30% off the menu", body: "For you and your family." },
      {
        title: "Shifts that fit",
        body: "Morning, afternoon or evening blocks. Swap with a teammate when your class schedule changes.",
      },
      {
        title: "Learn to bake from scratch",
        body: "No pastry school needed. You’ll learn the doughs, the bake times and the tiramisu layers on the job.",
      },
    ],
    teamTitle: "Who you’d bake with",
    teamBody:
      "We’re a team of twelve, most of us from around Benowo and Sememi. Some fit shifts between classes, some have baked for years, and everyone started on the same chocolate chunk dough.",
    quote:
      "I started on weekend counter shifts while I was at uni. A year later I’m the one opening the oven at six, and I still take my cookie every morning.",
    quoteName: "Putri",
    quoteRole: "Morning baker",
    ctaTitle: "Sounds like your kind of kitchen?",
    ctaBody: "Send a short hello and the role you’re after. We read every email and reply within a week.",
    howTitle: "How to get in touch",
    steps: [
      {
        title: "Write to us",
        body: (email: string) => `Email ${email} with the subject “Working at Droolbites”.`,
      },
      {
        title: "Tell us about you",
        body: () => "Share which type of role interests you and how we can reach you.",
      },
      {
        title: "Attach the extras",
        body: () =>
          "Add a short intro, plus your CV, experience or availability if you have them.",
      },
    ],
  },
  id: {
    metaTitle: "Gabung tim kami",
    metaDescription:
      "Memanggang, mengemas atau melayani bersama Droolbites di Surabaya. Kirim email ke tim kami dan ceritakan tentang dirimu.",
    eyebrow: "KARIER",
    title: "Gabung tim kami.",
    body: "Toko kami menghadirkan soft cookies, brownies dan tiramisu di Surabaya. Kalau kamu ingin memanggang, mengemas atau melayani bersama kami, kami senang mendengar kabar darimu.",
    imageAlt: "Dua baker Droolbites menyendok adonan cookies di dapur",
    cta: "EMAIL TIM KAMI",
    mailSubject: "Kerja di Droolbites",
    rolesTitle: "Posisi yang biasa kami cari",
    rolesSub: "Tiga jenis shift yang bikin toko tetap jalan, dari loyang pertama jam enam pagi sampai toko tutup jam sembilan malam.",
    shiftLabel: "Shift",
    fitLabel: "Cocok kalau",
    roles: [
      {
        title: "Baker pagi",
        type: "Full-time",
        shift: "06:00–14:00",
        body: "Mengaduk dan menyendok adonan cookies hari itu, memanggang brownies dan menyusun tiramisu sebelum toko buka jam sepuluh.",
        fit: "Kamu biasa bangun pagi. Pengalaman dapur membantu, resepnya kami ajari.",
      },
      {
        title: "Kru counter",
        type: "Part-time",
        shift: "10:00–15:30 atau 15:30–21:00",
        body: "Menyambut pembeli yang datang, menyerahkan pesanan ambil di toko, dan membantu memilih antara Red Velvet dan Double Chocolate.",
        fit: "Kamu senang ngobrol dengan orang dan tetap tenang saat ramai malam.",
      },
      {
        title: "Kru packing & antar",
        type: "Full-time",
        shift: "10:00–15:30 atau 15:30–21:00",
        body: "Mengemas dan memberi label tiap pesanan online, mencocokkannya dengan nomor DB, lalu mengantarnya keliling Surabaya.",
        fit: "Kamu punya motor sendiri dan SIM C yang masih berlaku.",
      },
    ],
    rolesSticker: "Mahasiswa boleh",
    rolesNote:
      "Ini posisi yang biasa kami cari, bukan daftar lowongan yang sedang buka. Tetap kirim email saja: setiap pesan kami simpan untuk rekrutmen berikutnya.",
    perksTitle: "Kenapa kerja bareng kami",
    perksSub: "Dapur kami kecil, jadi fasilitasnya yang benar-benar terasa.",
    perks: [
      {
        title: "Satu cookie tiap shift",
        body: "Ambil satu dari rak pendingin saat kamu mulai kerja. Tiap shift, rasa apa saja.",
      },
      { title: "Diskon 30% semua menu", body: "Untukmu dan keluarga." },
      {
        title: "Shift yang fleksibel",
        body: "Pilih blok pagi, siang atau malam. Bisa tukar dengan teman satu tim kalau jadwal kuliah berubah.",
      },
      {
        title: "Belajar baking dari nol",
        body: "Tidak perlu sekolah pastry. Adonan, waktu panggang dan lapisan tiramisu kamu pelajari langsung di dapur.",
      },
    ],
    teamTitle: "Teman satu dapurmu nanti",
    teamBody:
      "Kami tim berisi dua belas orang, kebanyakan tinggal di sekitar Benowo dan Sememi. Ada yang menyelipkan shift di sela kuliah, ada yang sudah bertahun-tahun baking, dan semuanya mulai dari adonan chocolate chunk yang sama.",
    quote:
      "Aku mulai dari shift counter akhir pekan waktu masih kuliah. Setahun kemudian, aku yang buka oven jam enam pagi, dan tetap ambil jatah cookie tiap pagi.",
    quoteName: "Putri",
    quoteRole: "Baker pagi",
    ctaTitle: "Kedengarannya cocok buatmu?",
    ctaBody: "Kirim sapaan singkat dan posisi yang kamu minati. Setiap email kami baca dan balas dalam seminggu.",
    howTitle: "Cara menghubungi kami",
    steps: [
      {
        title: "Kirim email",
        body: (email: string) => `Kirim email ke ${email} dengan subjek “Kerja di Droolbites”.`,
      },
      {
        title: "Ceritakan dirimu",
        body: () => "Sebutkan jenis pekerjaan yang kamu minati dan cara kami menghubungimu.",
      },
      {
        title: "Lampirkan pelengkapnya",
        body: () =>
          "Tambahkan perkenalan singkat, plus CV, pengalaman atau ketersediaan waktumu jika ada.",
      },
    ],
  },
});
