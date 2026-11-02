import "server-only";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { emailMessages } from "@/i18n/messages/emails";
import { button, paragraph, renderEmail } from "./email-template";
import { appUrl, emailFooter, sendMail } from "./mail";
import { signToken, verifyToken } from "./session";

/** Account and newsletter emails (order emails are in ./order-emails). */

/** No name in it: sign-up doesn't verify addresses, so the email carries nothing a stranger typed. */
export async function sendAccountWelcomeEmail(user: { email: string }, lang: Locale) {
  const t = pickMessages(emailMessages, lang).accountWelcome;
  const menu = appUrl("/menu");
  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title,
    body: [paragraph(t.body), paragraph(t.next, { muted: true }), button(t.button, menu)].join("\n"),
    footer: await emailFooter(),
    reason: t.reason,
  });
  await sendMail({
    to: user.email,
    subject: t.subject,
    text: `${t.title}\n\n${t.body}\n${t.next}\n\n${menu}\n\nDroolbites · Surabaya`,
    html,
  });
}

/* ------------------------------------------------------------------ */
/* Newsletter                                                           */
/* ------------------------------------------------------------------ */

type UnsubscribeClaims = { typ?: string; nl?: string };

/** A signed link that takes exactly this address off the list, with no sign-in. */
export async function newsletterUnsubscribeToken(email: string) {
  return signToken({ typ: "unsub", nl: email }, "400d");
}

export async function readUnsubscribeToken(token: string | null | undefined) {
  const claims = await verifyToken<UnsubscribeClaims>(token ?? undefined);
  return claims?.typ === "unsub" && typeof claims.nl === "string" ? claims.nl : null;
}

export async function sendNewsletterWelcomeEmail(email: string, lang: Locale) {
  const t = pickMessages(emailMessages, lang).newsletter;
  const token = encodeURIComponent(await newsletterUnsubscribeToken(email));
  const page = appUrl(`/newsletter/unsubscribe?t=${token}`);
  // RFC 8058 one-click: mail apps POST here straight from their "Unsubscribe" button.
  const oneClick = appUrl(`/api/newsletter/unsubscribe?t=${token}`);
  const menu = appUrl("/menu");
  const html = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title,
    body: [paragraph(t.body), paragraph(t.next, { muted: true }), button(t.button, menu)].join("\n"),
    footer: await emailFooter(),
    reason: t.reason,
    unsubscribe: { label: t.unsubscribe, href: page },
  });
  await sendMail({
    to: email,
    subject: t.subject,
    text: `${t.body}\n${t.next}\n\n${menu}\n\nDroolbites · Surabaya\n\n${t.textUnsubscribe}: ${page}`,
    html,
    headers: {
      "List-Unsubscribe": `<${oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
