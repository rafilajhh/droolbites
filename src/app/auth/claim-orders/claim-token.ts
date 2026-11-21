import "server-only";
import { db } from "@/lib/db";
import { signToken, verifyToken } from "@/lib/session";

/**
 * Password sign-up doesn't verify the email, so guest orders placed with it are only added to the new
 * account from the link we email there (Google sign-in adds them straight away: Google has verified the
 * address). Like the password-reset link, a signed JWT with an expiry, here naming the account and the
 * email it was sent to. It stops working if the account's email changes. Opening it changes nothing
 * (/account/claim): the orders move only when that same account, signed in, confirms. So a mail scanner
 * opening it does nothing, and someone who signed up with another person's email can't get that
 * person's orders by having them open the link while signed out or signed in as themselves.
 */
const PURPOSE = "claim-orders";
const TTL = "7d";

export function createClaimToken(user: { id: bigint; email: string }) {
  return signToken({ sub: user.id.toString(), em: user.email.trim().toLowerCase(), purpose: PURPOSE }, TTL);
}

type ClaimPayload = { sub?: string; em?: string; purpose?: string };

/** The customer account and email a claim link is for, or null when it is invalid, expired or out of date. */
export async function findClaim(token: string) {
  const payload = await verifyToken<ClaimPayload>(token);
  if (!payload?.sub || !payload.em || payload.purpose !== PURPOSE || !/^\d+$/.test(payload.sub)) return null;
  const user = await db.user.findUnique({ where: { id: BigInt(payload.sub) }, select: { id: true, email: true, role: true } });
  if (!user || user.role !== "customer" || user.email.trim().toLowerCase() !== payload.em) return null;
  return { userId: user.id, email: payload.em };
}
