import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Shared key for the app calling its own housekeeping routes (see src/instrumentation.ts).
 * Derived from AUTH_SECRET, so there is no extra secret to set; null when that isn't set.
 */
export function cronKey() {
  const secret = process.env.AUTH_SECRET;
  return secret ? createHash("sha256").update(`droolbites-cron:${secret}`).digest("hex") : null;
}

export function isCronRequest(request: Request) {
  const expected = cronKey();
  const given = request.headers.get("x-cron-key");
  if (!expected || !given || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
