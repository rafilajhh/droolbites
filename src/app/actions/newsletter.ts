"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getLocale } from "@/i18n/server";
import { db } from "@/lib/db";
import { readUnsubscribeToken, sendNewsletterWelcomeEmail } from "@/lib/emails";
import { deliverLater } from "@/lib/mail";
import { allowRequest, clientIp, perClientMax } from "@/lib/rate-limit";

export type NewsletterState = { status: "idle" | "ok" | "invalid" };

/** Sign-ups per 15 minutes (see allowRequest). */
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 10;

/**
 * Store the address and send the welcome email once, the first time it is
 * stored. A repeat sign-up or a rate-limited one gets the same "ok" without an
 * email, so the form reveals nothing and can't be used to mail strangers.
 */
export async function subscribeNewsletter(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = z.email().max(150).safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { status: "invalid" };
  const email = parsed.data;

  const ip = await clientIp();
  const allowed = allowRequest(`newsletter:email:${email}`, MAX_PER_EMAIL) && allowRequest(`newsletter:ip:${ip}`, perClientMax(ip, MAX_PER_IP));
  if (!allowed) return { status: "ok" };

  // Insert-if-new: the unique email makes a repeat (or a concurrent double submit) fail with P2002.
  try {
    await db.newsletterSubscriber.create({ data: { email } });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { status: "ok" };
    throw error;
  }
  const lang = await getLocale();
  deliverLater(() => sendNewsletterWelcomeEmail(email, lang));
  return { status: "ok" };
}

/** The "Unsubscribe" page's button: the signed token names the address. */
export async function unsubscribeNewsletter(formData: FormData) {
  const token = String(formData.get("t") ?? "");
  const email = await readUnsubscribeToken(token);
  if (email) await db.newsletterSubscriber.deleteMany({ where: { email } });
  redirect(email ? "/newsletter/unsubscribe?done=1" : "/newsletter/unsubscribe");
}
