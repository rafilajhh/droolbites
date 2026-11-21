import { defineMessages } from "../../config";

/** /orders/find: a guest finds their order with its number and the email it was placed with. */
export const findOrderMessages = defineMessages({
  en: {
    metaTitle: "Find your order",
    eyebrow: "ORDER LOOKUP",
    title: "Find your order",
    sub: "Ordered as a guest? Enter your order number and the email you used at checkout, and we'll email you a link to your order.",
    orderNumber: "Order number",
    orderNumberPlaceholder: "e.g. DB-0042",
    orderNumberHelper: "It's in your order confirmation email.",
    email: "Email address",
    emailPlaceholder: "The email you ordered with",
    submit: "EMAIL ME THE LINK",
    resend: "SEND AGAIN",
    pending: "SENDING…",
    sent: "If that order number and email match, we've emailed you a link to it. Check your inbox (and spam folder).",
    errors: {
      orderNumber: "Enter your order number, for example DB-0042.",
      email: "Enter a valid email address.",
      tooMany: "Too many tries. Please wait a few minutes and try again.",
    },
    signIn: "Have an account?",
    signInLink: "Sign in to see all your orders",
  },
  id: {
    metaTitle: "Cari pesananmu",
    eyebrow: "CEK PESANAN",
    title: "Cari pesananmu",
    sub: "Pesan tanpa akun? Masukkan nomor pesanan dan email yang kamu pakai saat checkout, nanti kami kirim link pesananmu lewat email.",
    orderNumber: "Nomor pesanan",
    orderNumberPlaceholder: "mis. DB-0042",
    orderNumberHelper: "Ada di email konfirmasi pesananmu.",
    email: "Alamat email",
    emailPlaceholder: "Email yang kamu pakai untuk memesan",
    submit: "KIRIM LINK KE EMAILKU",
    resend: "KIRIM LAGI",
    pending: "MENGIRIM…",
    sent: "Kalau nomor pesanan dan emailnya cocok, kami sudah kirim link ke pesanan itu lewat email. Cek inbox-mu (dan folder spam), ya.",
    errors: {
      orderNumber: "Masukkan nomor pesananmu, misalnya DB-0042.",
      email: "Masukkan alamat email yang valid.",
      tooMany: "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi, ya.",
    },
    signIn: "Punya akun?",
    signInLink: "Masuk untuk melihat semua pesananmu",
  },
});
