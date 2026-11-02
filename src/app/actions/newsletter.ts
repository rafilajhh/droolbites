"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { appUrl, emailFooter, sendMail } from "@/lib/mail";
import { button, paragraph, renderEmail } from "@/lib/email-template";
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
  const menu = appUrl("/menu");
  await sendMail({
    to: email,
    subject: "Welcome to Droolbites",
    text: "Thanks for joining! We'll email you when new flavors and seasonal specials drop.\n\nDroolbites · Surabaya",
    html: renderEmail({
      lang: "en",
      baseUrl: appUrl("/"),
      preheader: "You're on the list for new flavors and seasonal specials.",
      eyebrow: "NEWSLETTER",
      title: "Welcome to Droolbites!",
      body: [
        paragraph("Thanks for joining! We'll email you when new flavors and seasonal specials drop. Monthly at most, and no spam."),
        paragraph("Until then, the soft cookies, fudgy brownies and tiramisu are on the menu every day.", { muted: true }),
        button("SEE THE MENU", menu),
      ].join("\n"),
      footer: await emailFooter(),
      reason: "You're getting this email because this address signed up for the Droolbites newsletter.",
    }),
  });
  return { status: "ok" };
}
