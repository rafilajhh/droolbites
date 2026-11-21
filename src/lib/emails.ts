import "server-only";
import type { Locale } from "@/i18n/config";
import { pickMessages } from "@/i18n/config";
import { emailMessages } from "@/i18n/messages/emails";
import { renderEmail, type EmailFooter, type Mail } from "./email-template";
import { appUrl, emailFooter, sendMail } from "./mail";
import { signToken, verifyToken } from "./session";

/**
 * Account and newsletter emails (order emails are in ./order-emails), in the same shape: the
 * `…Email` functions build the message (scripts/email-preview.ts renders them), the `send…`
 * functions add the store footer and send it.
 */

/**
 * Greets the name given at sign-up (or the Google profile's), like the order and reset emails; a plain
 * "Hi" when there is none (a password sign-up whose name doesn't look like one, see signUp).
 */
export function accountWelcomeEmail(lang: Locale, { name }: { name: string | null }, footer: EmailFooter): Mail {
  const t = pickMessages(emailMessages, lang).accountWelcome;
  const { html, text } = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title,
    intro: t.intro(name),
    action: { label: t.button, href: appUrl("/menu") },
    footer,
    reason: t.reason,
  });
  return { subject: t.subject, text, html };
}

export async function sendAccountWelcomeEmail(user: { email: string; fullName: string | null }, lang: Locale) {
  await sendMail({ to: user.email, ...accountWelcomeEmail(lang, { name: user.fullName }, await emailFooter()) });
}

/** The password-reset link (requestPasswordReset); `link` carries the one-time token. */
export function passwordResetEmail(lang: Locale, { name, link }: { name: string; link: string }, footer: EmailFooter): Mail {
  const t = pickMessages(emailMessages, lang).reset;
  const { html, text } = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title,
    intro: t.intro(name),
    action: { label: t.button, href: link },
    after: [{ kind: "p", text: t.expiry, muted: true }],
    footer,
    reason: t.reason,
  });
  return { subject: t.subject, text, html };
}

/**
 * "Verify your email to add your N past orders", after a password sign-up with guest orders on the
 * same email: the link (/account/claim) asks the owner, signed in to that account, to add them. No name: it
 * goes out before the address is verified, to whoever owns it.
 */
export function claimOrdersEmail(lang: Locale, { count, link }: { count: number; link: string }, footer: EmailFooter): Mail {
  const t = pickMessages(emailMessages, lang).claim;
  const { html, text } = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title(count),
    intro: t.intro(count),
    action: { label: t.button, href: link },
    after: [{ kind: "p", text: t.expiry, muted: true }],
    footer,
    reason: t.reason,
  });
  return { subject: t.subject(count), text, html };
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

/** `unsubscribe`: the page link from newsletterUnsubscribeToken. */
export function newsletterWelcomeEmail(lang: Locale, unsubscribe: string, footer: EmailFooter): Mail {
  const t = pickMessages(emailMessages, lang).newsletter;
  const { html, text } = renderEmail({
    lang,
    baseUrl: appUrl("/"),
    preheader: t.preheader,
    eyebrow: t.eyebrow,
    title: t.title,
    intro: t.intro,
    action: { label: t.button, href: appUrl("/menu") },
    footer,
    reason: t.reason,
    unsubscribe: { label: t.unsubscribe, href: unsubscribe },
  });
  return { subject: t.subject, text, html };
}

export async function sendNewsletterWelcomeEmail(email: string, lang: Locale) {
  const token = encodeURIComponent(await newsletterUnsubscribeToken(email));
  const page = appUrl(`/newsletter/unsubscribe?t=${token}`);
  // RFC 8058 one-click: mail apps POST here straight from their "Unsubscribe" button.
  const oneClick = appUrl(`/api/newsletter/unsubscribe?t=${token}`);
  await sendMail({
    to: email,
    ...newsletterWelcomeEmail(lang, page, await emailFooter()),
    headers: {
      "List-Unsubscribe": `<${oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
