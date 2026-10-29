import { defineMessages } from "../../config";

/** Store facts quoted in the policy text, read from the store settings. */
export type PolicyContact = {
  email: string;
  phone: string;
  address: string;
  hours: string;
  deliveryFee: string;
  /** Opening time, e.g. "10:00". */
  opensAt: string;
  /** Last call for pickup orders: 30 minutes before closing, e.g. "20:30". */
  pickupCutoff: string;
};

/** pen: Shipping policy (MInKs), Privacy policy (T4tsh), Returns & refunds (C9zhg6). */
export const policyMessages = defineMessages({
  en: {
    eyebrow: "POLICIES",
    contents: "ON THIS PAGE",
    updated: (date: string) => `Last updated ${date}`,
    glance: "At a glance",
    help: {
      title: "Still need help?",
      body: "Send us your order number and a quick note about what happened. While the shop is open we usually reply within the hour, and most fixes are sorted the same day.",
      whatsapp: "Chat on WhatsApp",
      email: "Email us",
      call: "Prefer a call?",
      hours: (hours: string) => `${hours} WIB`,
      more: "More help",
      faq: "Read the FAQ",
    },
    shipping: {
      title: "Shipping policy",
      sub: "Delivery, store pickup and help with your order.",
      metaDescription: "How Droolbites delivery and store pickup work, delivery fees, order changes and getting help.",
      glance: (c: PolicyContact) => [
        { title: `${c.deliveryFee} flat`, body: "Delivery anywhere in Surabaya, whatever the size of your order." },
        { title: "Free pickup", body: `Collect at our Sememi counter. Pickup orders close at ${c.pickupCutoff}\u00a0WIB.` },
        { title: "Reply within the hour", body: "On WhatsApp or email, while the shop is open." },
      ],
      sticker: "Sealed for the ride",
      sections: [
        {
          id: "delivery-availability",
          title: "Delivery availability",
          body: (c: PolicyContact) =>
            `We deliver anywhere in Surabaya for a flat ${c.deliveryFee} per order. Choose local delivery at checkout and enter an address in Surabaya; the fee is added to your order summary before you pay.`,
        },
        {
          id: "store-pickup",
          title: "Store pickup",
          body: (c: PolicyContact) =>
            `Store pickup is free. Choose it at checkout and collect your order at ${c.address}. Opening hours: ${c.hours}\u00a0WIB. Pickup orders close at ${c.pickupCutoff}\u00a0WIB, 30 minutes before closing, so the last boxes are still packed with care; anything ordered later is ready from ${c.opensAt} on the next opening day. Your order page shows when it is ready for pickup.`,
        },
        {
          id: "delivery-fees-and-timing",
          title: "Delivery fees and timing",
          body: (c: PolicyContact) =>
            `Local delivery costs ${c.deliveryFee} per order and store pickup costs nothing. We prepare orders during opening hours (${c.hours}\u00a0WIB), and your order page shows when yours is out for delivery. Contact us if you need an order by a particular date or time.`,
        },
        {
          id: "changes-to-your-order",
          title: "Changes to your order",
          body: () =>
            "If you need to change the delivery address or collection arrangements, contact us as soon as possible with your order number. Changes depend on whether the order has already been prepared or handed to the delivery service.",
        },
        {
          id: "if-something-goes-wrong",
          title: "If something goes wrong",
          body: () =>
            "Damaged, missing or late? How to report it, and how we replace or refund an order, is all on our returns & refunds page.",
          link: { href: "/returns-refunds", label: "Go to returns & refunds" },
        },
      ],
    },
    privacy: {
      title: "Privacy policy",
      sub: "How your account and order information is used.",
      metaDescription: "What information Droolbites collects, why we use it, who we share it with and your choices.",
      glance: () => [
        { title: "Only what an order needs", body: "Your name, contact details, address and what you ordered. That's it." },
        { title: "Never sold", body: "We don't sell or rent your details to anyone, ever." },
        { title: "Deleted on request", body: "Email us and we remove your account, keeping only the records the law requires." },
      ],
      sticker: "Your details stay here",
      sections: [
        {
          id: "information-we-collect",
          title: "Information we collect",
          body: () =>
            "The details you provide may include your name, email address, phone number, delivery and billing addresses, and the products in your order. Account details support your account and order history. If you subscribe to menu updates, you provide an email address for that purpose.",
        },
        {
          id: "why-we-use-it",
          title: "Why we use it",
          body: () =>
            "We use account and order details to manage your account, fulfil purchases, arrange delivery or pickup, and respond to your questions. Processing may also be necessary to meet legal record-keeping duties. Menu updates rely on your consent, which you can withdraw.",
        },
        {
          id: "sharing-and-payments",
          title: "Sharing and payments",
          body: () =>
            "Delivery services receive the recipient details needed to deliver an order. Payment services handle the details required by your selected payment method; their privacy notices explain their own processing. Contact us for information about the services used for your order.",
        },
        {
          id: "keeping-your-information",
          title: "Keeping your information",
          body: () =>
            "Retention depends on the record and its purpose, including maintaining your account, completing orders and resolving order queries. Some order and billing records may need to be kept to meet legal record-keeping duties. Contact us for the retention period that applies to a specific record.",
        },
        {
          id: "your-rights-and-choices",
          title: "Your rights and choices",
          body: (c: PolicyContact) =>
            `You can request access to, a copy of, or correction of your personal data. You can also request deletion or withdraw consent, subject to applicable legal requirements. To make a request or stop menu updates, email ${c.email}. Do not include your password or payment credentials.`,
        },
      ],
    },
    returns: {
      title: "Returns & refunds",
      sub: "How to request help with an order, a cancellation or a refund.",
      metaDescription: "How to report a problem with a Droolbites order, change or cancel it, and how refunds work.",
      history: "VIEW ORDER HISTORY",
      glance: () => [
        { title: "Report within 24 hours", body: "Send a photo and your order number within 24 hours of delivery or pickup." },
        { title: "Replaced or refunded", body: "If we got it wrong, we bake it again or give your money back." },
        { title: "Back to how you paid", body: "Refunds go back through the method you paid with." },
      ],
      sticker: "We'll make it right",
      steps: {
        title: "How to report a problem",
        items: [
          {
            title: "Snap a photo",
            body: "Photograph the item and its packaging, and find the order number on your confirmation (it looks like DB-0001).",
          },
          {
            title: "Message us",
            body: "WhatsApp or email us within 24 hours of delivery or pickup. While the shop is open, we reply within the hour.",
          },
          {
            title: "We make it right",
            body: "Once we've checked it, we bake a replacement or refund you through your original payment method.",
          },
        ],
      },
      sections: [
        {
          id: "problems-with-an-order",
          title: "Problems with an order",
          body: () =>
            "If an item is damaged, missing or different from what you ordered, contact us within 24 hours with your order number and a description of the problem. Include clear photos where relevant.",
        },
        {
          id: "ask-us-to-check-it",
          title: "Ask us to check it",
          body: (c: PolicyContact) =>
            `Email ${c.email} or call ${c.phone}. Keep the product and packaging while we review the issue so we can ask for further details if needed.`,
        },
        {
          id: "changes-and-cancellations",
          title: "Changes and cancellations",
          body: () =>
            "Contact us as soon as possible if you need to change or cancel an order. We will check its preparation and delivery status before confirming which changes are possible.",
        },
        {
          id: "refunds",
          title: "Refunds",
          body: () =>
            "If a refund is approved, it will be returned through the original payment method. The time it takes to reach your account depends on the payment provider.",
        },
        {
          id: "keep-your-order-details",
          title: "Keep your order details",
          body: () =>
            "Keep your order confirmation and payment receipt until the issue is resolved. You can view your order number and status in your account.",
        },
      ],
    },
  },
  id: {
    eyebrow: "KEBIJAKAN",
    contents: "DI HALAMAN INI",
    updated: (date: string) => `Terakhir diperbarui ${date}`,
    glance: "Sekilas",
    help: {
      title: "Masih butuh bantuan?",
      body: "Kirim nomor pesanan dan sedikit cerita soal masalahnya. Selama toko buka, biasanya kami balas dalam satu jam, dan kebanyakan masalah beres di hari yang sama.",
      whatsapp: "Chat lewat WhatsApp",
      email: "Kirim email",
      call: "Lebih suka telepon?",
      hours: (hours: string) => `${hours} WIB`,
      more: "Bantuan lain",
      faq: "Baca FAQ",
    },
    shipping: {
      title: "Kebijakan pengiriman",
      sub: "Pengiriman, ambil di toko dan bantuan untuk pesananmu.",
      metaDescription: "Cara kerja pengiriman dan ambil di toko Droolbites, ongkos kirim, perubahan pesanan dan bantuan.",
      glance: (c: PolicyContact) => [
        { title: `Ongkir ${c.deliveryFee}`, body: "Flat ke seluruh Surabaya, berapa pun jumlah pesananmu." },
        { title: "Ambil di toko gratis", body: `Ambil di toko kami di Sememi. Pesanan ambil di toko ditutup pukul ${c.pickupCutoff}\u00a0WIB.` },
        { title: "Dibalas dalam sejam", body: "Lewat WhatsApp atau email, selama toko buka." },
      ],
      sticker: "Aman sampai tujuan",
      sections: [
        {
          id: "delivery-availability",
          title: "Ketersediaan pengiriman",
          body: (c: PolicyContact) =>
            `Kami mengantar ke seluruh Surabaya dengan ongkir tetap ${c.deliveryFee} per pesanan. Pilih pengiriman lokal saat checkout dan isi alamat di Surabaya; ongkirnya masuk ke ringkasan pesanan sebelum kamu bayar.`,
        },
        {
          id: "store-pickup",
          title: "Ambil di toko",
          body: (c: PolicyContact) =>
            `Ambil di toko gratis. Pilih saat checkout lalu ambil pesananmu di ${c.address}. Jam buka: ${c.hours}\u00a0WIB. Pesanan ambil di toko ditutup pukul ${c.pickupCutoff}\u00a0WIB, 30 menit sebelum toko tutup, supaya kotak terakhir tetap dikemas dengan rapi; pesanan setelah itu siap diambil mulai pukul ${c.opensAt} di hari buka berikutnya. Halaman pesananmu akan menunjukkan kapan pesanan siap diambil.`,
        },
        {
          id: "delivery-fees-and-timing",
          title: "Ongkos kirim dan waktu",
          body: (c: PolicyContact) =>
            `Pengiriman lokal dikenai ${c.deliveryFee} per pesanan, sedangkan ambil di toko gratis. Kami menyiapkan pesanan selama jam buka (${c.hours}\u00a0WIB), dan halaman pesananmu akan menunjukkan kapan pesanan sedang diantar. Hubungi kami jika butuh pesanan tiba pada tanggal atau jam tertentu.`,
        },
        {
          id: "changes-to-your-order",
          title: "Perubahan pesanan",
          body: () =>
            "Jika perlu mengubah alamat pengiriman atau pengaturan pengambilan, hubungi kami secepatnya dengan menyertakan nomor pesanan. Perubahan bergantung pada apakah pesanan sudah disiapkan atau sudah diserahkan ke layanan pengiriman.",
        },
        {
          id: "if-something-goes-wrong",
          title: "Kalau ada yang tidak beres",
          body: () =>
            "Pesanan rusak, kurang atau telat? Cara melaporkannya, juga soal ganti baru dan refund, semuanya ada di halaman retur & refund.",
          link: { href: "/returns-refunds", label: "Buka retur & refund" },
        },
      ],
    },
    privacy: {
      title: "Kebijakan privasi",
      sub: "Bagaimana informasi akun dan pesananmu digunakan.",
      metaDescription:
        "Informasi apa yang dikumpulkan Droolbites, untuk apa kami menggunakannya, dengan siapa dibagikan dan pilihanmu.",
      glance: () => [
        { title: "Secukupnya untuk pesanan", body: "Nama, kontak, alamat dan apa yang kamu pesan. Itu saja." },
        { title: "Tidak pernah dijual", body: "Datamu tidak kami jual atau sewakan ke siapa pun." },
        { title: "Dihapus kalau diminta", body: "Email kami, akunmu kami hapus, kecuali catatan yang wajib disimpan menurut hukum." },
      ],
      sticker: "Datamu aman di sini",
      sections: [
        {
          id: "information-we-collect",
          title: "Informasi yang kami kumpulkan",
          body: () =>
            "Data yang kamu berikan bisa berupa nama, alamat email, nomor telepon, alamat pengiriman dan penagihan, serta produk dalam pesananmu. Data akun digunakan untuk akun dan riwayat pesananmu. Jika kamu berlangganan kabar menu, kamu memberikan alamat email untuk keperluan itu.",
        },
        {
          id: "why-we-use-it",
          title: "Untuk apa kami menggunakannya",
          body: () =>
            "Kami menggunakan data akun dan pesanan untuk mengelola akunmu, memproses pembelian, mengatur pengiriman atau pengambilan, dan menjawab pertanyaanmu. Pemrosesan juga bisa diperlukan untuk memenuhi kewajiban pencatatan menurut hukum. Kabar menu dikirim atas persetujuanmu, yang bisa kamu tarik kapan saja.",
        },
        {
          id: "sharing-and-payments",
          title: "Berbagi data dan pembayaran",
          body: () =>
            "Layanan pengiriman menerima data penerima yang diperlukan untuk mengantar pesanan. Layanan pembayaran menangani data yang dibutuhkan metode pembayaran pilihanmu; kebijakan privasi mereka menjelaskan pemrosesan mereka sendiri. Hubungi kami untuk info layanan yang digunakan untuk pesananmu.",
        },
        {
          id: "keeping-your-information",
          title: "Penyimpanan informasimu",
          body: () =>
            "Lama penyimpanan bergantung pada jenis catatan dan tujuannya, termasuk mengelola akunmu, menyelesaikan pesanan dan menangani pertanyaan pesanan. Sebagian catatan pesanan dan tagihan mungkin perlu disimpan untuk memenuhi kewajiban pencatatan menurut hukum. Hubungi kami untuk mengetahui lama penyimpanan catatan tertentu.",
        },
        {
          id: "your-rights-and-choices",
          title: "Hak dan pilihanmu",
          body: (c: PolicyContact) =>
            `Kamu bisa meminta akses, salinan, atau koreksi data pribadimu. Kamu juga bisa meminta penghapusan atau menarik persetujuan, sesuai ketentuan hukum yang berlaku. Untuk mengajukan permintaan atau berhenti menerima kabar menu, email ${c.email}. Jangan sertakan kata sandi atau data pembayaranmu.`,
        },
      ],
    },
    returns: {
      title: "Retur & refund",
      sub: "Cara meminta bantuan untuk pesanan, pembatalan atau refund.",
      metaDescription: "Cara melaporkan masalah pesanan Droolbites, mengubah atau membatalkannya, dan cara kerja refund.",
      history: "LIHAT RIWAYAT PESANAN",
      glance: () => [
        { title: "Lapor dalam 24 jam", body: "Kirim foto dan nomor pesanan dalam 24 jam setelah pesanan diantar atau diambil." },
        { title: "Diganti atau di-refund", body: "Kalau kami yang salah, kami buatkan lagi atau uangmu kembali." },
        { title: "Kembali ke cara bayarmu", body: "Refund dikembalikan lewat metode yang kamu pakai untuk bayar." },
      ],
      sticker: "Kami bereskan, janji",
      steps: {
        title: "Cara melaporkan masalah",
        items: [
          {
            title: "Foto dulu",
            body: "Foto produk dan kemasannya, lalu cari nomor pesanan di konfirmasimu (formatnya seperti DB-0001).",
          },
          {
            title: "Kabari kami",
            body: "WhatsApp atau email kami dalam 24 jam setelah pesanan diantar atau diambil. Selama toko buka, kami balas dalam satu jam.",
          },
          {
            title: "Kami bereskan",
            body: "Setelah kami cek, kami buatkan pengganti atau refund lewat metode pembayaran awalmu.",
          },
        ],
      },
      sections: [
        {
          id: "problems-with-an-order",
          title: "Masalah dengan pesanan",
          body: () =>
            "Jika ada item yang rusak, kurang atau berbeda dari yang dipesan, hubungi kami dalam 24 jam dengan menyertakan nomor pesanan dan penjelasan masalahnya. Sertakan foto yang jelas bila perlu.",
        },
        {
          id: "ask-us-to-check-it",
          title: "Minta kami periksa",
          body: (c: PolicyContact) =>
            `Email ${c.email} atau telepon ${c.phone}. Simpan produk dan kemasannya selama kami memeriksa masalahnya, agar kami bisa meminta detail tambahan bila perlu.`,
        },
        {
          id: "changes-and-cancellations",
          title: "Perubahan dan pembatalan",
          body: () =>
            "Hubungi kami secepatnya jika perlu mengubah atau membatalkan pesanan. Kami akan mengecek status persiapan dan pengirimannya sebelum memastikan perubahan apa yang masih bisa dilakukan.",
        },
        {
          id: "refunds",
          title: "Refund",
          body: () =>
            "Jika refund disetujui, dana akan dikembalikan lewat metode pembayaran awal. Lama dana masuk ke rekeningmu bergantung pada penyedia pembayaran.",
        },
        {
          id: "keep-your-order-details",
          title: "Simpan detail pesananmu",
          body: () =>
            "Simpan konfirmasi pesanan dan bukti pembayaran sampai masalahnya selesai. Kamu bisa melihat nomor dan status pesanan di akunmu.",
        },
      ],
    },
  },
});

export type PolicyKey = "shipping" | "privacy" | "returns";
