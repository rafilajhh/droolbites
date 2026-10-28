import { defineMessages } from "../config";

/** Singular category eyebrow on the product page, keyed by category slug. */
const EYEBROW: Record<string, string> = {
  "soft-cookies": "SOFT COOKIE",
  brownies: "FUDGY BROWNIES",
  tiramisu: "TIRAMISU",
};

/** Product detail page (w7mQL). */
export const productMessages = defineMessages({
  en: {
    breadcrumb: "Breadcrumb",
    menu: "Our menu",
    eyebrow: EYEBROW,
    size: "Size",
    addToCart: (price: string) => `ADD TO CART · ${price}`,
    error: "Couldn't add to cart. Please try again.",
    decrease: "Decrease quantity",
    increase: "Increase quantity",
    perkDelivery: "Delivery across Surabaya",
    perkPickup: "Pickup at Jl. Palem Sememi",
    ingredients: "Ingredients",
    allergens: "Allergens",
    storage: "Storage & shelf life",
    gallery: "Product photos",
    showPhoto: (alt: string) => `Show photo: ${alt}`,
    photos: {
      product: (name: string) => `${name} on an oat background`,
      stack: "A stack of five assorted Droolbites cookies: chocolate chunk, double chocolate, red velvet and white chocolate almond",
      gift: "An open kraft gift box with a green ribbon, holding chocolate chunk cookies, brownies and a cup of tiramisu",
      party: "A party table with a plate of cookies, a tray of brownies, and dishes of classic and matcha tiramisu",
    },
    alsoLike: "You may also like",
    viewMenu: "View our menu",
    notFoundTitle: "We couldn't find that dessert.",
    notFoundBody: "It may be sold out today or no longer on the menu.",
    notFoundCta: "SEE THE MENU",
  },
  id: {
    breadcrumb: "Navigasi",
    menu: "Menu kami",
    eyebrow: EYEBROW,
    size: "Ukuran",
    addToCart: (price: string) => `TAMBAH KE KERANJANG · ${price}`,
    error: "Gagal menambahkan ke keranjang. Coba lagi ya.",
    decrease: "Kurangi jumlah",
    increase: "Tambah jumlah",
    perkDelivery: "Antar ke seluruh Surabaya",
    perkPickup: "Ambil di Jl. Palem Sememi",
    ingredients: "Bahan",
    allergens: "Alergen",
    storage: "Penyimpanan & daya tahan",
    gallery: "Foto produk",
    showPhoto: (alt: string) => `Tampilkan foto: ${alt}`,
    photos: {
      product: (name: string) => `${name} dengan latar krem`,
      stack: "Tumpukan lima cookies Droolbites aneka rasa: chocolate chunk, double chocolate, red velvet dan white chocolate almond",
      gift: "Kotak hadiah kraft berpita hijau yang terbuka, berisi cookies chocolate chunk, brownies dan secangkir tiramisu",
      party: "Meja pesta dengan sepiring cookies, senampan brownies, serta tiramisu klasik dan matcha",
    },
    alsoLike: "Mungkin kamu juga suka",
    viewMenu: "Lihat menu kami",
    notFoundTitle: "Dessert itu tidak kami temukan.",
    notFoundBody: "Mungkin sedang habis hari ini atau sudah tidak ada di menu.",
    notFoundCta: "LIHAT MENU",
  },
});
