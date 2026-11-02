import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "./db";

/**
 * Stateless session: a signed JWT in an httpOnly cookie.
 * Customers and the admin share one cookie; `role` decides access.
 */
export const SESSION_COOKIE = "db_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  userId: string; // users.id as string (BigInt is not JSON-safe)
  role: "customer" | "admin";
  /** Stamp of the password hash at sign-in: changing the password ends every older session. */
  pv?: string;
};

/** Short, one-way stamp of a password hash ("" for Google-only accounts without one). */
export function passwordStamp(passwordHash: string | null) {
  return createHash("sha256").update(`session:${passwordHash ?? ""}`).digest("hex").slice(0, 16);
}

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function signToken(payload: Record<string, unknown>, expiresIn: string | number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyToken<T>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return payload as T;
  } catch {
    return null;
  }
}

export async function createSession({ userId, role }: { userId: string; role: SessionPayload["role"] }) {
  const user = await db.user.findUnique({ where: { id: BigInt(userId) }, select: { passwordHash: true } });
  const payload: SessionPayload = { userId, role, pv: passwordStamp(user?.passwordHash ?? null) };
  const token = await signToken(payload, `${MAX_AGE}s`);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.APP_URL?.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = await verifyToken<SessionPayload>(token);
  if (!payload?.userId || (payload.role !== "customer" && payload.role !== "admin")) return null;
  return { userId: payload.userId, role: payload.role, pv: payload.pv };
});
