import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { signToken, verifyToken } from "@/lib/session";

/**
 * Password-reset links carry a JWT with the user id and a fingerprint of the
 * current password hash. bcrypt salts every hash, so the fingerprint changes
 * as soon as the password is updated and the link stops working after one use.
 * Google-only accounts have no hash yet; they fingerprint "" until a password is set.
 */
const PURPOSE = "password-reset";
const TTL = "1h";

function passwordFingerprint(passwordHash: string | null) {
  return createHash("sha256").update(passwordHash ?? "").digest("hex").slice(0, 16);
}

export function createResetToken(user: { id: bigint; passwordHash: string | null }) {
  return signToken({ sub: user.id.toString(), fp: passwordFingerprint(user.passwordHash), purpose: PURPOSE }, TTL);
}

type ResetPayload = { sub?: string; fp?: string; purpose?: string };

/** The user a reset token belongs to, or null when it is invalid, expired or already used. */
export async function findResetUser(token: string) {
  const payload = await verifyToken<ResetPayload>(token);
  if (!payload?.sub || !payload.fp || payload.purpose !== PURPOSE || !/^\d+$/.test(payload.sub)) return null;
  const user = await db.user.findUnique({
    where: { id: BigInt(payload.sub) },
    select: { id: true, passwordHash: true },
  });
  if (!user || passwordFingerprint(user.passwordHash) !== payload.fp) return null;
  return { id: user.id };
}
