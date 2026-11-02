import "server-only";
import { Google } from "arctic";
import { getLocale } from "@/i18n/server";
import { db } from "./db";
import { sendAccountWelcomeEmail } from "./emails";
import { linkGoogleAccount, type GoogleClaims } from "./google-account";
import { deliverLater } from "./mail";

/** OAuth round-trip cookies, scoped to /auth/google (start + callback) and gone after 10 minutes. */
export const GOOGLE_COOKIES = { state: "g_oauth_state", verifier: "g_oauth_verifier", next: "g_oauth_next" } as const;
export const GOOGLE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" && Boolean(process.env.APP_URL?.startsWith("https")),
  sameSite: "lax",
  path: "/auth/google",
  maxAge: 60 * 10,
} as const;
export const GOOGLE_SCOPES = ["openid", "profile", "email"];

/** Both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET set; otherwise the button is hidden and the routes bounce to /sign-in. */
export function isGoogleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const redirectUri = new URL("/auth/google/callback", process.env.APP_URL ?? "http://localhost:3000").toString();
  return { google: new Google(clientId, clientSecret, redirectUri), clientId };
}

/** Signs in (or creates) the Google user; a brand-new account gets the welcome email. */
export async function signInWithGoogle(claims: GoogleClaims) {
  const result = await linkGoogleAccount(db, claims);
  if (result.ok && result.created) {
    const lang = await getLocale();
    const fullName = claims.name ?? claims.email.split("@")[0];
    deliverLater(() => sendAccountWelcomeEmail({ fullName, email: claims.email }, lang));
  }
  return result;
}
