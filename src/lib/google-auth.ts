import "server-only";
import { Google } from "arctic";
import { db } from "./db";
import { linkGoogleAccount, type GoogleClaims } from "./google-account";

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

export function signInWithGoogle(claims: GoogleClaims) {
  return linkGoogleAccount(db, claims);
}
