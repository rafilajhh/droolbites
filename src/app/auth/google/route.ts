import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { safeNext } from "@/lib/auth";
import { GOOGLE_COOKIES, GOOGLE_COOKIE_OPTIONS, GOOGLE_SCOPES, googleClient } from "@/lib/google-auth";

/** "Continue with Google": remembers state, PKCE verifier and ?next= in short-lived cookies, then hands off to Google. */
export async function GET(request: NextRequest) {
  const client = googleClient();
  if (!client) return new Response(null, { status: 302, headers: { Location: "/sign-in", "Cache-Control": "no-store" } });

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = client.google.createAuthorizationURL(state, verifier, GOOGLE_SCOPES);

  const jar = await cookies();
  jar.set(GOOGLE_COOKIES.state, state, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_COOKIES.verifier, verifier, GOOGLE_COOKIE_OPTIONS);
  jar.set(GOOGLE_COOKIES.next, safeNext(request.nextUrl.searchParams.get("next")), GOOGLE_COOKIE_OPTIONS);
  return new Response(null, { status: 302, headers: { Location: url.toString(), "Cache-Control": "no-store" } });
}
