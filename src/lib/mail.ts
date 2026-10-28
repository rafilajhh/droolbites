import "server-only";
import nodemailer from "nodemailer";

/**
 * Local development sends everything to Mailpit (http://localhost:8025).
 * On the VPS, point SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS at a real server.
 */
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST ?? "localhost",
  port: Number(process.env.SMTP_PORT ?? 1025),
  secure: false,
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
});

export async function sendMail({ to, subject, text, html }: { to: string; subject: string; text: string; html?: string }) {
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
