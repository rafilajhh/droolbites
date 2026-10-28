import { defineMessages } from "../../config";

/** Contact details quoted in the policy text, read from the store settings. */
export type PolicyContact = { email: string; phone: string };

/** pen: Shipping policy (MInKs), Privacy policy (T4tsh), Returns & refunds (C9zhg6). */
export const policyMessages = defineMessages({
  en: {
    eyebrow: "POLICIES",
    contents: "ON THIS PAGE",
    shipping: {
      title: "Shipping policy",
      sub: "Delivery, store pickup and help with your order.",
      metaDescription: "How Droolbites delivery and store pickup work, delivery fees, order changes and getting help.",
      sections: [
        {
          id: "delivery-availability",
          title: "Delivery availability",
          body: () =>
            "Enter your delivery address at checkout to see the available delivery options and fees. Availability depends on the address and the selected service. Check the options before placing your order.",
        },
        {
          id: "store-pickup",
          title: "Store pickup",
          body: () =>
            "Choose store pickup at checkout to collect your order in Surabaya. Review the pickup address in your order details. Contact us before visiting if you need to confirm collection arrangements.",
        },
        {
          id: "delivery-fees-and-timing",
          title: "Delivery fees and timing",
          body: () =>
            "Review the delivery fee and any timing information shown for your selected option before completing payment. Contact us if you need to check whether an order can arrive by a particular date or time.",
        },
        {
          id: "changes-to-your-order",
          title: "Changes to your order",
          body: () =>
            "If you need to change the delivery address or collection arrangements, contact us as soon as possible with your order number. Changes depend on whether the order has already been prepared or handed to the delivery service.",
        },
        {
          id: "problems-with-an-order",
          title: "Problems with an order",
          body: (c: PolicyContact) =>
            `If your order is damaged, incomplete, different from what you ordered, or delayed, email ${c.email} or call ${c.phone}. Include your order number, a description of the issue and photos where relevant so we can review it and advise on the next steps.`,
        },
      ],
    },
    privacy: {
      title: "Privacy policy",
      sub: "How your account and order information is used.",
      metaDescription: "What information Droolbites collects, why we use it, who we share it with and your choices.",
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
      sections: [
        {
          id: "problems-with-an-order",
          title: "Problems with an order",
          body: () =>
            "If an item is damaged, missing or different from what you ordered, contact us with your order number and a description of the problem. Include clear photos where relevant.",
        },
        {
          id: "request-a-review",
          title: "Request a review",
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
    shipping: {
      title: "Kebijakan pengiriman",
      sub: "Pengiriman, ambil di toko dan bantuan untuk pesananmu.",
      metaDescription: "Cara kerja pengiriman dan ambil di toko Droolbites, ongkos kirim, perubahan pesanan dan bantuan.",
      sections: [
        {
          id: "delivery-availability",
          title: "Ketersediaan pengiriman",
          body: () =>
            "Masukkan alamat pengiriman saat checkout untuk melihat pilihan pengiriman dan ongkosnya. Ketersediaan bergantung pada alamat dan layanan yang dipilih. Cek pilihannya sebelum membuat pesanan.",
        },
        {
          id: "store-pickup",
          title: "Ambil di toko",
          body: () =>
            "Pilih ambil di toko saat checkout untuk mengambil pesananmu di Surabaya. Cek alamat pengambilan di detail pesanan. Hubungi kami sebelum datang jika perlu memastikan pengaturan pengambilan.",
        },
        {
          id: "delivery-fees-and-timing",
          title: "Ongkos kirim dan waktu",
          body: () =>
            "Cek ongkos kirim dan info waktu yang tampil untuk pilihanmu sebelum menyelesaikan pembayaran. Hubungi kami jika ingin memastikan pesanan bisa tiba pada tanggal atau jam tertentu.",
        },
        {
          id: "changes-to-your-order",
          title: "Perubahan pesanan",
          body: () =>
            "Jika perlu mengubah alamat pengiriman atau pengaturan pengambilan, hubungi kami secepatnya dengan menyertakan nomor pesanan. Perubahan bergantung pada apakah pesanan sudah disiapkan atau sudah diserahkan ke layanan pengiriman.",
        },
        {
          id: "problems-with-an-order",
          title: "Masalah dengan pesanan",
          body: (c: PolicyContact) =>
            `Jika pesananmu rusak, tidak lengkap, berbeda dari yang dipesan, atau terlambat, email ${c.email} atau telepon ${c.phone}. Sertakan nomor pesanan, penjelasan masalahnya dan foto bila perlu agar kami bisa memeriksanya dan memberi tahu langkah selanjutnya.`,
        },
      ],
    },
    privacy: {
      title: "Kebijakan privasi",
      sub: "Bagaimana informasi akun dan pesananmu digunakan.",
      metaDescription:
        "Informasi apa yang dikumpulkan Droolbites, untuk apa kami menggunakannya, dengan siapa dibagikan dan pilihanmu.",
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
      sections: [
        {
          id: "problems-with-an-order",
          title: "Masalah dengan pesanan",
          body: () =>
            "Jika ada item yang rusak, kurang atau berbeda dari yang dipesan, hubungi kami dengan menyertakan nomor pesanan dan penjelasan masalahnya. Sertakan foto yang jelas bila perlu.",
        },
        {
          id: "request-a-review",
          title: "Ajukan pemeriksaan",
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
