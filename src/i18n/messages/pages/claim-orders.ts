import { defineMessages } from "../../config";

/** /account/claim: the link from the email after a password sign-up asks to add the guest orders placed with that email. */
export const claimOrdersMessages = defineMessages({
  en: {
    metaTitle: "Add your past orders",
    eyebrow: "MY ACCOUNT",
    confirmTitle: (n: number) => (n === 1 ? "Add 1 past order to your account?" : `Add ${n} past orders to your account?`),
    confirmSub: (n: number, email: string) =>
      n === 1
        ? `It was placed with ${email} before you had an account. Once added, it shows up in your order history.`
        : `They were placed with ${email} before you had an account. Once added, they show up in your order history.`,
    confirm: "ADD TO MY ACCOUNT",
    later: "NOT NOW",
    otherTitle: "This link is for another account.",
    otherSub: "You're signed in with a different Droolbites account. Sign out, then open the link in the email again and sign in with the account it was sent to.",
    account: "GO TO MY ACCOUNT",
    invalidTitle: "This link doesn't work anymore.",
    invalidSub: "It has expired, or the account's email has changed. If a past order is missing from your account, contact us.",
  },
  id: {
    metaTitle: "Tambahkan pesanan lamamu",
    eyebrow: "AKUN SAYA",
    confirmTitle: (n: number) => `Tambahkan ${n} pesanan lama ke akunmu?`,
    confirmSub: (_n: number, email: string) =>
      `Pesanan ini dibuat dengan ${email} sebelum kamu punya akun. Setelah ditambahkan, pesanannya muncul di riwayat pesananmu.`,
    confirm: "TAMBAHKAN KE AKUNKU",
    later: "NANTI SAJA",
    otherTitle: "Tautan ini untuk akun lain.",
    otherSub: "Kamu sedang masuk dengan akun Droolbites yang lain. Keluar dulu, lalu buka lagi tautan di email dan masuk dengan akun yang dituju email itu.",
    account: "KE AKUN SAYA",
    invalidTitle: "Tautan ini sudah tidak berlaku.",
    invalidSub: "Tautannya sudah kedaluwarsa, atau email akunnya sudah berubah. Kalau ada pesanan lama yang belum muncul di akunmu, hubungi kami, ya.",
  },
});
