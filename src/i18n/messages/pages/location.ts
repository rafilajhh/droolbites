import { defineMessages } from "../../config";

/** pen: Location (QwcUD). */
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
    pickupTitle: "Store pickup",
    pickupBody: "Choose pickup at checkout and collect your order here.",
    openNow: "Open now",
    closedNow: "Closed now",
    questionsTitle: "Questions?",
    callPrefix: "Call ",
    emailMiddle: " or email ",
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
    pickupTitle: "Ambil di toko",
    pickupBody: "Pilih ambil di toko saat checkout, lalu ambil pesananmu di sini.",
    openNow: "Sedang buka",
    closedNow: "Sedang tutup",
    questionsTitle: "Ada pertanyaan?",
    callPrefix: "Telepon ",
    emailMiddle: " atau email ",
  },
});
