import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Attach guest orders placed with this email to the account that just signed
 * in with Google, or whose owner, signed in, confirmed them from the link
 * emailed after a password sign-up (/account/claim). Only for a verified address: password sign-up
 * alone never verifies email ownership, so linking there would let anyone
 * register someone else's address and read their orders. Idempotent: orders
 * that already belong to an account are never moved. orders.email is a
 * case-insensitive column (utf8mb4_unicode_ci) and checkout stores it
 * lowercased, so the match ignores case.
 *
 * Kept free of `server-only` and the shared `db` so a script can run it
 * against the database with its own client.
 */
export async function claimGuestOrders(prisma: Pick<PrismaClient, "order">, userId: bigint, verifiedEmail: string) {
  const { count } = await prisma.order.updateMany({
    where: { userId: null, email: verifiedEmail.trim().toLowerCase() },
    data: { userId },
  });
  return count;
}
