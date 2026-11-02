/**
 * Writes the HTML emails with sample data to ./email-preview/*.html for a look in the browser.
 * Run: npx tsx scripts/email-preview.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { button, fallbackLink, highlight, infoBox, itemsTable, paragraph, renderEmail } from "../src/lib/email-template";
import { authMessages } from "../src/i18n/messages/auth";
import { pickMessages } from "../src/i18n/config";

const baseUrl = "https://droolbites.biz.id/";
const footer = {
  storeName: "Droolbites",
  address: "Jl. Palem Sememi Raya F16, Sememi, Benowo, Surabaya",
  phone: "+62 896 7562 4486",
  email: "hello@droolbites.biz.id",
};
const link = "https://droolbites.biz.id/orders/DB-0001?t=sample-token";
const items = [
  { qty: 2, name: "Chocolate Chunk", detail: "Per piece", price: "Rp 50.000" },
  { qty: 1, name: "Fudgy Brownies", detail: "20 × 20 cm", price: "Rp 145.000" },
];
const reason = "You're getting this email because you placed an order at droolbites.biz.id.";

const placed = renderEmail({
  lang: "en",
  baseUrl,
  preheader: "DB-0001 is waiting for payment: Rp 214.000.",
  eyebrow: "ORDER DB-0001",
  title: "Thanks for your order!",
  body: [
    paragraph("Hi Rafi, your order is in. It's waiting for payment, and we start baking as soon as it's paid."),
    highlight("Virtual account number", "8277 0812 3456 7890", [
      ["Service fee", "Rp 4.000"],
      ["Amount to pay", "Rp 214.000"],
    ]),
    paragraph("Pay with BCA Virtual Account before 2 Nov 2026, 16:30 WIB.", { muted: true }),
    button("SEE HOW TO PAY", link),
    itemsTable(items, [
      ["Subtotal", "Rp 195.000"],
      ["Delivery", "Rp 15.000"],
      ["Total", "Rp 210.000"],
    ]),
    infoBox("Delivery to", "Jl. Uji Email 1, Surabaya 60111"),
    fallbackLink("Button not working? Open this link:", link),
  ].join("\n"),
  footer,
  reason,
});

const paid = renderEmail({
  lang: "en",
  baseUrl,
  preheader: "Payment received for DB-0001. We're baking!",
  eyebrow: "ORDER DB-0001 · PAID",
  title: "Payment received. We're baking!",
  body: [
    paragraph("Hi Rafi, we've received your payment for order DB-0001 (BCA Virtual Account)."),
    paragraph("We'll email you again when it's out for delivery.", { muted: true }),
    button("TRACK YOUR ORDER", link),
    itemsTable(items, [["Total paid", "Rp 214.000"]]),
    infoBox("Delivery to", "Jl. Uji Email 1, Surabaya 60111"),
    fallbackLink("Button not working? Open this link:", link),
  ].join("\n"),
  footer,
  reason,
});

const resetLink = "https://droolbites.biz.id/reset-password/sample-token";
const reset = (lang: "en" | "id") => {
  const t = pickMessages(authMessages, lang).reset.mail;
  return renderEmail({
    lang,
    baseUrl,
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title,
    body: [
      paragraph(t.intro("Rafi")),
      button(t.button, resetLink),
      paragraph(t.expiry, { muted: true }),
      fallbackLink(t.fallback, resetLink),
    ].join("\n"),
    footer,
    reason: t.reason,
  });
};

const welcome = renderEmail({
  lang: "en",
  baseUrl,
  preheader: "You're on the list for new flavors and seasonal specials.",
  eyebrow: "NEWSLETTER",
  title: "Welcome to Droolbites!",
  body: [
    paragraph("Thanks for joining! We'll email you when new flavors and seasonal specials drop. Monthly at most, and no spam."),
    paragraph("Until then, the soft cookies, fudgy brownies and tiramisu are on the menu every day.", { muted: true }),
    button("SEE THE MENU", "https://droolbites.biz.id/menu"),
  ].join("\n"),
  footer,
  reason: "You're getting this email because this address signed up for the Droolbites newsletter.",
});

mkdirSync("email-preview", { recursive: true });
for (const [name, html] of Object.entries({ placed, paid, "reset-en": reset("en"), "reset-id": reset("id"), welcome })) {
  writeFileSync(`email-preview/${name}.html`, html);
}
console.log("wrote email-preview/*.html");
