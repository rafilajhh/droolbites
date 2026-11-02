import "server-only";
import nodemailer from "nodemailer";
import type { EmailFooter } from "./email-template";
import { getStoreSettings } from "./settings";

/**
 * Local development sends everything to Mailpit (http://localhost:8025).
 * On the VPS, point SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS at a real server.
 * An empty SMTP_HOST (or none in production) turns email off: sendMail skips
 * the send and returns false, so orders, payments and resets carry on.
 */
const SMTP_HOST = process.env.SMTP_HOST ?? (process.env.NODE_ENV === "production" ? "" : "localhost");

const transport = SMTP_HOST
  ? nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 1025),
      secure: false,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

let warnedMailOff = false;

/**
 * Reserved test domains (RFC 2606/6761) never receive mail. In production the live verification
 * runs sign up with addresses like shots+…@example.com; sending to them would only bounce and hurt
 * the sender's reputation, so they are skipped. Local runs still deliver them to Mailpit.
 */
const RESERVED_TEST_DOMAIN = /@(?:[^@]+\.)?(?:example\.(?:com|net|org)|[^@]+\.(?:test|example|invalid|localhost))$/i;

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
  if (!transport) {
    if (!warnedMailOff) {
      warnedMailOff = true;
      console.warn("[mail] SMTP_HOST is not set, so email is off: no emails will be sent.");
    }
    return false;
  }
  if (process.env.NODE_ENV === "production" && RESERVED_TEST_DOMAIN.test(to)) return false;
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM ?? "Droolbites <hello@droolbites.biz.id>",
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("[mail] could not send", subject, "to", to, error);
    return false;
  }
}

export function appUrl(path = "/") {
  return new URL(path, process.env.APP_URL ?? "http://localhost:3000").toString();
}

/** The store details for the footer band of the HTML emails. */
export async function emailFooter(): Promise<EmailFooter> {
  const { storeName, address, phone, email } = await getStoreSettings();
  return { storeName, address, phone, email };
}
