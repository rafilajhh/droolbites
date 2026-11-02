import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { getSession, passwordStamp } from "./session";

/**
 * The signed-in user (customer or admin), or null. A session from before the account's last
 * password change no longer counts, so changing the password signs out every other device.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const row = await db.user.findUnique({
    where: { id: BigInt(session.userId) },
    select: {
      passwordHash: true,
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      address: true,
      city: true,
      postalCode: true,
      createdAt: true,
    },
  });
  if (!row) return null;
  // The hash only decides validity; it never leaves this function.
  const { passwordHash, ...user } = row;
  return session.pv === passwordStamp(passwordHash) ? user : null;
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/** For customer-only pages: sends guests to /sign-in and comes back afterwards. */
export async function requireUser(returnTo: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(returnTo)}`);
  return user;
}

/** For every /admin page except /admin/sign-in. */
export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/admin/sign-in");
  return user;
}

/**
 * Only allow same-origin relative paths as a post-login destination. Browsers
 * read "//host", "/\host" and paths with tabs/newlines as other sites, so
 * those are refused; the rest is resolved against a dummy origin and must
 * stay on it (which also catches "/..//host" collapsing to "//host").
 */
export function safeNext(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\s\x00-\x1f\x7f]/.test(next)) return fallback;
  try {
    const url = new URL(next, "http://x");
    const path = url.pathname + url.search + url.hash;
    return url.origin === "http://x" && !path.startsWith("//") ? path : fallback;
  } catch {
    return fallback;
  }
}
