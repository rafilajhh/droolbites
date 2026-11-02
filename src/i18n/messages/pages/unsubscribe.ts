import { defineMessages } from "../../config";

/** /newsletter/unsubscribe: confirm, then done (or a bad link). */
export const unsubscribeMessages = defineMessages({
  en: {
    metaTitle: "Unsubscribe",
    eyebrow: "NEWSLETTER",
    confirmTitle: "Leave the newsletter?",
    confirmSub: (email: string) => `We'll stop sending new flavors and seasonal specials to ${email}. Order emails still arrive as usual.`,
    confirm: "UNSUBSCRIBE",
    keep: "KEEP ME ON THE LIST",
    doneTitle: "You're unsubscribed.",
    doneSub: "No more newsletter emails. You can sign up again any time from the bottom of any page.",
    invalidTitle: "This link doesn't work anymore.",
    invalidSub: "Use the unsubscribe link in the latest Droolbites newsletter, or email us and we'll take you off the list.",
    menu: "BACK TO THE MENU",
  },
  id: {
    metaTitle: "Berhenti berlangganan",
    eyebrow: "NEWSLETTER",
    confirmTitle: "Berhenti langganan newsletter?",
    confirmSub: (email: string) => `Kami tidak akan mengirim kabar rasa baru dan menu musiman lagi ke ${email}. Email pesanan tetap dikirim seperti biasa.`,
    confirm: "BERHENTI BERLANGGANAN",
    keep: "TETAP BERLANGGANAN",
    doneTitle: "Kamu sudah berhenti berlangganan.",
    doneSub: "Tidak ada lagi email newsletter. Kamu bisa daftar lagi kapan saja dari bagian bawah setiap halaman.",
    invalidTitle: "Tautan ini sudah tidak berlaku.",
    invalidSub: "Pakai tautan berhenti berlangganan di newsletter Droolbites terbaru, atau kirim email ke kami dan akan kami hapus dari daftar.",
    menu: "KEMBALI KE MENU",
  },
});
