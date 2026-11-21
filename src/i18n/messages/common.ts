import { defineMessages } from "../config";

/** Site chrome shared by every storefront page: header, nav menu, cart drawer, footer. */
export const commonMessages = defineMessages({
  en: {
    /** The site-wide <title> and description (the home page uses them as they are). */
    site: {
      title: "Droolbites — Soft cookies, fudgy brownies & tiramisu in Surabaya",
      description:
        "Thick, soft-centered cookies, fudgy brownies and creamy tiramisu — made in small batches in Surabaya for delivery or store pickup.",
    },
    announce: {
      label: "Store news",
      hoursLabel: "Hours:",
      hours: (hours: string) => `${hours} WIB`,
      /** Outside ordering hours (WIB), in the bar and by the cart drawer's CHECKOUT: when orders open again. */
      closed: (reopens: { inDays: number; day: number; time: string } | null) =>
        reopens
          ? `Closed now · orders open ${
              reopens.inDays === 0
                ? "today"
                : reopens.inDays === 1
                  ? "tomorrow"
                  : ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][reopens.day]
            } at ${reopens.time}`
          : "Closed now",
    },
    header: {
      openMenu: "Open menu",
      skipToContent: "Skip to content",
      home: "Droolbites home",
      search: "Search the menu",
      account: "My account",
      cart: "Open cart",
      cartCount: (n: number) => `${n} ${n === 1 ? "item" : "items"} in cart`,
      language: "Language",
    },
    nav: {
      title: "Menu",
      close: "Close menu",
      home: "Home",
      menu: "Our menu",
      story: "Our story",
      location: "Location",
      faq: "FAQ",
      orderNow: "ORDER NOW",
      /** The drawer's account button, named for where it goes: sign-in, the account page, or the admin panel. */
      signIn: "SIGN IN",
      account: "MY ACCOUNT",
      admin: "ADMIN PANEL",
      search: "Search the menu",
    },
    cart: {
      title: "Your cart",
      close: "Close cart",
      items: (n: number) => `${n} ${n === 1 ? "item" : "items"}`,
      remove: (name: string) => `Remove ${name}`,
      /** Unit price beside a quantity of two or more; `unit` names what one of them is. */
      each: (price: string, unit: "tray" | "piece" | "portion") => `${price} ${unit === "tray" ? "per tray" : "each"}`,
      subtotal: "Subtotal",
      note: (fee: string) => `Plus delivery from ${fee}, or pick up for free.`,
      checkout: "CHECKOUT",
      continue: "Continue shopping",
      emptyTitle: "Your cart is empty",
      emptyBody: "Pick a few desserts from the menu and they'll show up here.",
      emptyCta: "SEE THE MENU",
      decrease: "Decrease quantity",
      increase: "Increase quantity",
      updateError: "Couldn't update your cart. Please try again.",
      status: (n: number, subtotal: string) => `${n} ${n === 1 ? "item" : "items"}, subtotal ${subtotal}`,
      /** Stock on a cart line: sold out or short since it was added, or the last ones are in the cart. */
      soldOut: "Sold out now. Remove it to check out.",
      short: (n: number) => `Only ${n} left. Lower the quantity to check out.`,
      last: (n: number) => (n === 1 ? "That's the last one." : `That's all ${n} we have left.`),
      fixFirst: "Some items ran low. Fix the marked lines before you check out.",
      /** Outside ordering hours, under the subtotal while CHECKOUT is off: the announce line, then this. */
      closedNote: "You can check out once we open.",
    },
    footer: {
      tagline: "Soft cookies, fudgy brownies and creamy tiramisu from Sememi, Surabaya.",
      shop: "SHOP",
      visit: "VISIT",
      help: "HELP",
      menu: "Our menu",
      cookies: "Soft cookies",
      brownies: "Brownies",
      tiramisu: "Tiramisu",
      story: "Our story",
      location: "Location",
      faq: "FAQ",
      careers: "Join our team",
      shipping: "Shipping policy",
      returns: "Returns & refunds",
      privacy: "Privacy policy",
      findOrder: "Find an order",
      account: "My account",
      newsTitle: "Be first to try new flavors.",
      newsSub: "Monthly drops, seasonal specials and no spam.",
      newsPlaceholder: "Your email",
      newsSubmit: "Subscribe",
      newsThanks: "Thanks! Check your inbox for a welcome note.",
      newsInvalid: "Enter a valid email address.",
      rights: "© 2026 Droolbites. All rights reserved.",
    },
  },
  id: {
    site: {
      title: "Droolbites — Soft cookies, brownies fudgy & tiramisu di Surabaya",
      description:
        "Cookies tebal yang lembut di tengah, brownies fudgy dan tiramisu creamy, dibuat dalam batch kecil di Surabaya untuk diantar atau diambil di toko.",
    },
    announce: {
      label: "Info toko",
      hoursLabel: "Jam buka:",
      hours: (hours: string) => `${hours} WIB`,
      closed: (reopens: { inDays: number; day: number; time: string } | null) =>
        reopens
          ? `Lagi tutup · pemesanan buka ${
              reopens.inDays === 0
                ? "hari ini"
                : reopens.inDays === 1
                  ? "besok"
                  : `hari ${["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"][reopens.day]}`
            } pukul ${reopens.time}`
          : "Lagi tutup",
    },
    header: {
      openMenu: "Buka menu",
      skipToContent: "Langsung ke konten",
      home: "Beranda Droolbites",
      search: "Cari di menu",
      account: "Akun saya",
      cart: "Buka keranjang",
      cartCount: (n: number) => `${n} item di keranjang`,
      language: "Bahasa",
    },
    nav: {
      title: "Menu",
      close: "Tutup menu",
      home: "Beranda",
      menu: "Menu kami",
      story: "Cerita kami",
      location: "Lokasi",
      faq: "FAQ",
      orderNow: "PESAN SEKARANG",
      signIn: "MASUK",
      account: "AKUN SAYA",
      admin: "PANEL ADMIN",
      search: "Cari di menu",
    },
    cart: {
      title: "Keranjangmu",
      close: "Tutup keranjang",
      items: (n: number) => `${n} item`,
      remove: (name: string) => `Hapus ${name}`,
      each: (price: string, unit: "tray" | "piece" | "portion") =>
        `${price}/${unit === "tray" ? "loyang" : unit === "portion" ? "porsi" : "buah"}`,
      subtotal: "Subtotal",
      note: (fee: string) => `Belum termasuk ongkir (mulai ${fee}), ambil di toko gratis.`,
      checkout: "CHECKOUT",
      continue: "Lanjut belanja",
      emptyTitle: "Keranjangmu masih kosong",
      emptyBody: "Pilih beberapa dessert dari menu, nanti muncul di sini, ya.",
      emptyCta: "LIHAT MENU",
      decrease: "Kurangi jumlah",
      increase: "Tambah jumlah",
      updateError: "Keranjang gagal diperbarui. Coba lagi, ya.",
      status: (n: number, subtotal: string) => `${n} item, subtotal ${subtotal}`,
      soldOut: "Lagi habis. Hapus dulu untuk checkout.",
      short: (n: number) => `Sisa ${n}. Kurangi jumlahnya untuk checkout.`,
      last: (n: number) => (n === 1 ? "Ini yang terakhir." : `Sisa ${n}, semuanya sudah di keranjangmu.`),
      fixFirst: "Ada item yang stoknya menipis. Perbaiki yang ditandai dulu sebelum checkout.",
      closedNote: "Checkout bisa dilakukan begitu kami buka.",
    },
    footer: {
      tagline: "Soft cookies, brownies fudgy dan tiramisu yang creamy dari Sememi, Surabaya.",
      shop: "BELANJA",
      visit: "KUNJUNGI",
      help: "BANTUAN",
      menu: "Menu kami",
      cookies: "Soft cookies",
      brownies: "Brownies",
      tiramisu: "Tiramisu",
      story: "Cerita kami",
      location: "Lokasi",
      faq: "FAQ",
      careers: "Gabung tim kami",
      shipping: "Kebijakan pengiriman",
      returns: "Retur & refund",
      privacy: "Kebijakan privasi",
      findOrder: "Cari pesanan",
      account: "Akun saya",
      newsTitle: "Jadi yang pertama coba rasa baru.",
      newsSub: "Menu baru tiap bulan, edisi musiman, tanpa spam.",
      newsPlaceholder: "Email kamu",
      newsSubmit: "Langganan",
      newsThanks: "Terima kasih! Cek inbox untuk email sambutan.",
      newsInvalid: "Masukkan alamat email yang valid.",
      rights: "© 2026 Droolbites. Hak cipta dilindungi.",
    },
  },
});
