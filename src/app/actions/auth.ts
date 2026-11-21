"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/auth";
import { db } from "@/lib/db";
import { claimOrdersEmail, passwordResetEmail, sendAccountWelcomeEmail } from "@/lib/emails";
import { appUrl, deliverLater, emailFooter, sendMail } from "@/lib/mail";
import { allowRequest, clientIp, isSignInLocked, perClientMax, recordSignInFailure, resetSignInFailures } from "@/lib/rate-limit";
import { clearCheckoutDetails, forgetRecentOrders } from "@/lib/orders";
import { createSession, deleteSession } from "@/lib/session";
import { getLocale } from "@/i18n/server";
import type { Locale } from "@/i18n/config";
import { createResetToken, findResetUser } from "@/app/(auth)/reset-password/reset-token";
import { createClaimToken } from "@/app/auth/claim-orders/claim-token";

/** Keys into authMessages.errors; the client renders them in the active language. */
export type AuthErrorKey =
  | "fullName"
  | "email"
  | "password"
  | "passwordRequired"
  | "mismatch"
  | "emailTaken"
  | "invalidLogin"
  | "tooManyAttempts"
  | "generic";

export type AuthField = "fullName" | "email" | "password" | "confirm";

export type AuthState = {
  errors?: Partial<Record<AuthField, AuthErrorKey>>;
  formError?: AuthErrorKey;
  values?: { fullName?: string; email?: string };
  sent?: boolean;
  tokenInvalid?: boolean;
  /** Changes on every submit so the client can move focus to the first error. */
  attempt?: number;
};

const BCRYPT_COST = 10;
// Compared against when the email is unknown so response time does not reveal which accounts exist.
const DUMMY_HASH = "$2b$10$AqPy5BV1eLUua.Jm0t.M4OIjT9XOn89xLCvvJSt3aupnAsbENx1Q6";

const emailSchema = z.email().max(150);
/** New accounts per 15 minutes per client (see allowRequest); each one sends a welcome email. */
const SIGN_UP_MAX_PER_IP = 5;

/** Password-reset emails per 15 minutes (see allowRequest). */
const RESET_MAX_PER_EMAIL = 3;
const RESET_MAX_PER_IP = 10;
const passwordSchema = z.string().min(8).max(72); // bcrypt only reads the first 72 bytes

/**
 * The welcome email goes to an address nobody has verified yet, so a name typed at sign-up only appears in
 * it when it looks like a name: letters (any script), spaces and . ' -, up to 40 characters, no digits and
 * no "word.word" that could read as a link. Anything else gets a plain "Hi".
 */
const GREETABLE_NAME = /^(?!.*\.\p{L})[\p{L}\p{M}][\p{L}\p{M} .'’-]{0,39}$/u;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const attempt = Date.now();

  const errors: AuthState["errors"] = {};
  if (!emailSchema.safeParse(email).success) errors.email = "email";
  if (!password) errors.password = "passwordRequired";
  if (Object.keys(errors).length) return { errors, values: { email }, attempt };

  const ip = await clientIp();
  // Locked out: answer before touching the database or bcrypt.
  if (isSignInLocked(ip, email)) return { formError: "tooManyAttempts", values: { email }, attempt };

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, passwordHash: true },
  });
  // Unknown email or a Google-only account (no password): compare anyway so timing matches, then fail.
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user?.passwordHash || !ok) {
    recordSignInFailure(ip, email);
    return { formError: "invalidLogin", values: { email }, attempt };
  }
  resetSignInFailures(ip, email);

  await createSession({ userId: user.id.toString(), role: user.role });
  redirect(user.role === "admin" ? "/admin" : safeNext(text(formData, "next")));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = text(formData, "fullName").trim().replace(/\s+/g, " ");
  const email = normalizeEmail(text(formData, "email"));
  const password = text(formData, "password");
  const confirm = text(formData, "confirm");
  const values = { fullName, email };
  const attempt = Date.now();

  const errors: AuthState["errors"] = {};
  if (fullName.length < 2 || fullName.length > 100) errors.fullName = "fullName";
  if (!emailSchema.safeParse(email).success) errors.email = "email";
  if (!passwordSchema.safeParse(password).success) errors.password = "password";
  else if (password !== confirm) errors.confirm = "mismatch";
  if (Object.keys(errors).length) return { errors, values, attempt };

  // Every new account sends an email, so a client can't open accounts (and mail addresses) in bulk.
  const ip = await clientIp();
  if (!allowRequest(`signup:ip:${ip}`, perClientMax(ip, SIGN_UP_MAX_PER_IP))) {
    return { formError: "tooManyAttempts", values, attempt };
  }

  if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
    return { errors: { email: "emailTaken" }, values, attempt };
  }

  let userId: bigint;
  try {
    const user = await db.user.create({
      data: { fullName, email, passwordHash: await bcrypt.hash(password, BCRYPT_COST), role: "customer" },
      select: { id: true },
    });
    userId = user.id;
  } catch {
    // Unique constraint race: someone registered the same email a moment ago.
    return { errors: { email: "emailTaken" }, values, attempt };
  }

  const lang = await getLocale();
  deliverLater(() => sendAccountWelcomeEmail({ email, fullName: GREETABLE_NAME.test(fullName) ? fullName : null }, lang));
  // Guest orders placed with this email join the account only once its owner, signed in, confirms them
  // from the emailed link (/account/claim).
  const guestOrders = await db.order.count({ where: { userId: null, email } });
  if (guestOrders > 0) deliverLater(() => sendClaimOrdersEmail({ id: userId, email }, guestOrders, lang));
  await createSession({ userId: userId.toString(), role: "customer" });
  const next = safeNext(text(formData, "next"));
  // Landing on the account: after every sign-up (orders or not, so it says nothing about the email) its
  // notice says that guest orders placed with this email get a link by email (?claim=1).
  if (next.split(/[?#]/)[0] === "/account") {
    const url = new URL(next, "http://x");
    url.searchParams.set("claim", "1");
    redirect(url.pathname + url.search + url.hash);
  }
  redirect(next);
}

/** "Verify your email to add your N past orders": the link (/account/claim) asks, signed in, to add them. */
async function sendClaimOrdersEmail(user: { id: bigint; email: string }, count: number, lang: Locale) {
  const link = appUrl(`/account/claim?t=${encodeURIComponent(await createClaimToken(user))}`);
  await sendMail({ to: user.email, ...claimOrdersEmail(lang, { count, link }, await emailFooter()) });
}

export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = normalizeEmail(text(formData, "email"));
  const attempt = Date.now();
  if (!emailSchema.safeParse(email).success) return { errors: { email: "email" }, values: { email }, attempt };

  // Limit reset emails per address and per client. Over the limit the answer is the same
  // "sent" as always, so it reveals nothing about the account; the email just isn't sent.
  const ip = await clientIp();
  const allowed = allowRequest(`reset:email:${email}`, RESET_MAX_PER_EMAIL) && allowRequest(`reset:ip:${ip}`, perClientMax(ip, RESET_MAX_PER_IP));
  if (!allowed) return { sent: true, values: { email }, attempt };

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, fullName: true, email: true, passwordHash: true },
  });
  if (user) {
    const token = await createResetToken(user);
    const [lang, footer] = await Promise.all([getLocale(), emailFooter()]);
    const link = appUrl(`/reset-password/${token}`);
    await sendMail({ to: user.email, ...passwordResetEmail(lang, { name: user.fullName, link }, footer) });
  }
  // Same answer whether or not the account exists (no account enumeration).
  return { sent: true, values: { email }, attempt };
}

export async function resetPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const token = text(formData, "token");
  const password = text(formData, "password");
  const confirm = text(formData, "confirm");
  const attempt = Date.now();

  const errors: AuthState["errors"] = {};
  if (!passwordSchema.safeParse(password).success) errors.password = "password";
  else if (password !== confirm) errors.confirm = "mismatch";
  if (Object.keys(errors).length) return { errors, attempt };

  const user = await findResetUser(token);
  if (!user) return { tokenInvalid: true, attempt };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
  });
  redirect("/reset-password/done");
}

/**
 * Signing out also forgets this browser's recent orders and saved checkout
 * details, so the next person on a shared device can't open them. A guest who
 * never signs in keeps both (that is how they track their order). A guest order
 * that was never linked to the account (Google sign-in links them, password
 * sign-up once the emailed link is opened) can still be opened from the link in
 * its confirmation email, or found on /orders/find, after signing out.
 */
export async function signOut() {
  await Promise.all([deleteSession(), forgetRecentOrders(), clearCheckoutDetails()]);
  redirect("/");
}
