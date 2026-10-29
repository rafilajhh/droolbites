import type { PrismaClient } from "@/generated/prisma/client";

/**
 * "Continue with Google": claim checks and account linking. Kept free of
 * `server-only` and of the shared `db` so scripts/google-auth.test.ts can run
 * it against the database with its own client; the app calls it through
 * signInWithGoogle in ./google-auth.ts.
 */

export type GoogleClaims = { sub: string; email: string; name: string | null };

export type GoogleLinkResult =
  | { ok: true; userId: bigint; created: boolean }
  | { ok: false; reason: "admin" | "exists" };

const ISSUERS = new Set(["accounts.google.com", "https://accounts.google.com"]);
const FULL_NAME_MAX = 100; // users.full_name
const EMAIL_MAX = 150; // users.email

/**
 * The ID token comes straight from Google's token endpoint over TLS during
 * the code exchange, so its signature is not re-checked (Arctic's documented
 * approach). Issuer, audience, expiry and a verified email still are.
 */
export function parseGoogleClaims(raw: unknown, clientId: string, now = Date.now()): GoogleClaims | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const audOk = c.aud === clientId || (Array.isArray(c.aud) && c.aud.includes(clientId));
  if (typeof c.iss !== "string" || !ISSUERS.has(c.iss) || !audOk) return null;
  if (typeof c.exp !== "number" || c.exp * 1000 <= now) return null;
  if (c.email_verified !== true || typeof c.sub !== "string" || !c.sub || typeof c.email !== "string") return null;
  // Stored the way sign-up stores it.
  const email = c.email.trim().toLowerCase();
  if (!email || email.length > EMAIL_MAX) return null;
  const name = typeof c.name === "string" ? c.name.trim().replace(/\s+/g, " ") : "";
  return { sub: c.sub, email, name: name || null };
}

/**
 * Finds the user for a Google sign-in by Google id, otherwise creates a customer
 * without a password. An email that already has an account is never linked:
 * sign-up and profile edits don't verify addresses, so that row may belong to
 * someone else (account pre-hijacking). Its owner signs in with the password;
 * admins always use /admin/sign-in.
 */
export async function linkGoogleAccount(prisma: PrismaClient, claims: GoogleClaims): Promise<GoogleLinkResult> {
  const select = { id: true, role: true, googleId: true } as const;

  const byGoogle = await prisma.user.findUnique({ where: { googleId: claims.sub }, select });
  if (byGoogle) return byGoogle.role === "admin" ? { ok: false, reason: "admin" } : { ok: true, userId: byGoogle.id, created: false };

  const byEmail = await prisma.user.findUnique({ where: { email: claims.email }, select });
  if (byEmail) return { ok: false, reason: byEmail.role === "admin" ? "admin" : "exists" };

  const fullName = (claims.name ?? claims.email.split("@")[0]).slice(0, FULL_NAME_MAX).trim() || claims.email.slice(0, FULL_NAME_MAX);
  try {
    const user = await prisma.user.create({
      data: { fullName, email: claims.email, passwordHash: null, googleId: claims.sub, role: "customer" },
      select: { id: true },
    });
    return { ok: true, userId: user.id, created: true };
  } catch (e) {
    // Unique race: the same Google account (or email) was created a moment ago.
    const again = await prisma.user.findUnique({ where: { googleId: claims.sub }, select });
    if (again && again.role !== "admin") return { ok: true, userId: again.id, created: false };
    throw e;
  }
}
