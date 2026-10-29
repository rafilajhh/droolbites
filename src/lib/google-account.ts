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
  | { ok: false; reason: "admin" | "conflict" };

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
 * Finds the user for a Google sign-in: by Google id first, then by email (a
 * customer gets linked; an admin is refused because admins sign in with their
 * password at /admin/sign-in), otherwise creates a customer without a password.
 */
export async function linkGoogleAccount(prisma: PrismaClient, claims: GoogleClaims): Promise<GoogleLinkResult> {
  const select = { id: true, role: true, googleId: true } as const;

  const byGoogle = await prisma.user.findUnique({ where: { googleId: claims.sub }, select });
  if (byGoogle) return byGoogle.role === "admin" ? { ok: false, reason: "admin" } : { ok: true, userId: byGoogle.id, created: false };

  const byEmail = await prisma.user.findUnique({ where: { email: claims.email }, select });
  if (byEmail) {
    if (byEmail.role === "admin") return { ok: false, reason: "admin" };
    // Already linked to a different Google account: do not let a second one take it over.
    if (byEmail.googleId) return { ok: false, reason: "conflict" };
    await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: claims.sub } });
    return { ok: true, userId: byEmail.id, created: false };
  }

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
