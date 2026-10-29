import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { parseGoogleClaims, type GoogleLinkResult } from "@/lib/google-account";
import { GOOGLE_COOKIES, GOOGLE_COOKIE_OPTIONS, googleClient, signInWithGoogle } from "@/lib/google-auth";
import { createSession } from "@/lib/session";

/**
 * Google sends the browser back here. Checks state against the cookie,
 * exchanges the code (PKCE), validates the ID token claims, then signs in,
 * links or creates the customer. Failures land on /sign-in with a generic
 * error code only; nothing from Google is echoed back.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const jar = await cookies();
  const storedState = jar.get(GOOGLE_COOKIES.state)?.value;
  const verifier = jar.get(GOOGLE_COOKIES.verifier)?.value;
  const next = safeNext(jar.get(GOOGLE_COOKIES.next)?.value);
  for (const name of Object.values(GOOGLE_COOKIES)) jar.delete({ name, path: GOOGLE_COOKIE_OPTIONS.path });

  const go = (location: string) => new Response(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
  const fail = (error: "google" | "google_admin" | "google_cancelled") =>
    go(`/sign-in?error=${error}${next !== "/account" ? `&next=${encodeURIComponent(next)}` : ""}`);

  const client = googleClient();
  if (!client) return go("/sign-in");
  if (params.has("error")) return fail(params.get("error") === "access_denied" ? "google_cancelled" : "google");

  const code = params.get("code");
  const state = params.get("state");
  if (!code || !state || !storedState || !verifier || state !== storedState) return fail("google");

  let result: GoogleLinkResult;
  try {
    const tokens = await client.google.validateAuthorizationCode(code, verifier);
    const claims = parseGoogleClaims(decodeIdToken(tokens.idToken()), client.clientId);
    if (!claims) return fail("google");
    result = await signInWithGoogle(claims);
  } catch {
    return fail("google");
  }
  if (!result.ok) return fail(result.reason === "admin" ? "google_admin" : "google");

  await createSession({ userId: result.userId.toString(), role: "customer" });
  return go(next);
}
