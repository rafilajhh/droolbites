import "server-only";
import { headers } from "next/headers";

/**
 * Sign-in brute-force limiter: a sliding window of failed attempts per
 * ip+email, per email (whatever the ip) and per ip. Too many failures lock
 * that key for LOCK_MS. The per-email key means a spoofed or rotating client
 * IP can't buy more guesses at one account.
 *
 * Also a plain request limiter (`allowRequest`) for password-reset and
 * newsletter emails.
 *
 * State lives in this process's memory, so it resets on restart and is not
 * shared between instances. That is fine for the single-instance local/VPS
 * deployment; running several instances would need a shared store.
 */
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_PER_PAIR = 5;
const MAX_PER_EMAIL = 10;
const MAX_PER_IP = 20;
const MAX_KEYS = 10_000;

type Bucket = { failures: number[]; lockedUntil: number };
const buckets = new Map<string, Bucket>();

/**
 * Client IP for rate limiting. Forwarding headers are only believed with
 * TRUST_PROXY=1, i.e. behind one reverse proxy that appends the client to
 * X-Forwarded-For: the last entry is the one that proxy added, so it is used
 * first; earlier entries come from the client and can be forged. X-Real-IP is
 * only a fallback when there is no X-Forwarded-For (a proxy that doesn't set
 * it may pass a client-sent X-Real-IP through untouched). Without TRUST_PROXY
 * anyone could send a fresh fake IP per request, so every client is "local"
 * (Next gives server actions no socket address).
 */
export async function clientIp(): Promise<string> {
  if (process.env.TRUST_PROXY !== "1") return "local";
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",").at(-1)?.trim() || h.get("x-real-ip")?.trim() || "local";
}

/**
 * Per-client limit for `ip`. Without a trusted proxy every client is "local",
 * so that bucket is shared by everyone: it gets SHARED_FACTOR times the room,
 * enough that one stranger can't lock all sign-ins with a handful of
 * failures, while still capping guesses spread over many emails.
 */
const SHARED_FACTOR = 5;
export function perClientMax(ip: string, max: number) {
  return ip === "local" ? max * SHARED_FACTOR : max;
}

function keys(ip: string, email: string) {
  return [
    { key: `pair:${ip}|${email}`, max: MAX_PER_PAIR },
    { key: `email:${email}`, max: MAX_PER_EMAIL },
    { key: `ip:${ip}`, max: perClientMax(ip, MAX_PER_IP) },
  ];
}

function sweep(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [key, b] of buckets) {
    if (b.lockedUntil <= now && b.failures.every((t) => now - t >= WINDOW_MS)) buckets.delete(key);
  }
}

/** Adds one hit to `key`; true when that reaches `max` within the window (then the key locks). */
function hit(key: string, max: number, now: number) {
  const b = buckets.get(key) ?? { failures: [], lockedUntil: 0 };
  b.failures = b.failures.filter((t) => now - t < WINDOW_MS);
  b.failures.push(now);
  const reached = b.failures.length >= max;
  if (reached) {
    b.lockedUntil = now + LOCK_MS;
    b.failures = [];
  }
  buckets.set(key, b);
  return reached;
}

const locked = (key: string, now: number) => (buckets.get(key)?.lockedUntil ?? 0) > now;

/** True while the ip+email pair, the email or the ip is locked out. */
export function isSignInLocked(ip: string, email: string, now = Date.now()) {
  return keys(ip, email).some(({ key }) => locked(key, now));
}

export function recordSignInFailure(ip: string, email: string, now = Date.now()) {
  sweep(now);
  for (const { key, max } of keys(ip, email)) hit(key, max, now);
}

/** After a successful sign-in, forget the failures for this ip+email and email (the per-ip count stays). */
export function resetSignInFailures(ip: string, email: string) {
  for (const { key } of keys(ip, email).slice(0, 2)) buckets.delete(key);
}

/**
 * Request limiter: counts every call per key (e.g. `reset:email:…`) and
 * returns false once `max` calls happened within the window, until LOCK_MS
 * after the limit was reached.
 */
export function allowRequest(key: string, max: number, now = Date.now()) {
  sweep(now);
  if (locked(key, now)) return false;
  hit(key, max + 1, now);
  return !locked(key, now);
}
