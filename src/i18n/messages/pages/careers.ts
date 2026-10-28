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
          "Include your name, contact details, a short intro — and your CV, experience or availability if you have them.",
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
    mailSubject: "Working at Droolbites",
    howTitle: "Cara menghubungi kami",
    steps: [
      {
        title: "Kirim email",
        body: (email: string) => `Kirim email ke ${email} dengan subjek “Working at Droolbites”.`,
      },
      {
        title: "Ceritakan dirimu",
        body: () => "Sebutkan jenis pekerjaan yang kamu minati dan cara kami menghubungimu.",
      },
      {
        title: "Lampirkan pelengkapnya",
        body: () =>
          "Sertakan nama, kontak, perkenalan singkat — serta CV, pengalaman atau ketersediaan waktumu jika ada.",
      },
    ],
  },
});
