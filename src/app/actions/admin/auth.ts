"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientIp, isSignInLocked, recordSignInFailure, resetSignInFailures } from "@/lib/rate-limit";
import { createSession, deleteSession } from "@/lib/session";

export type AdminSignInState = { error: "invalid" | "missing" | "locked" | null; email: string };

// Compared against when the email is unknown so both paths take the same time.
const DUMMY_HASH = "$2b$10$AqPy5BV1eLUua.Jm0t.M4OIjT9XOn89xLCvvJSt3aupnAsbENx1Q6";

const schema = z.object({
  email: z.string().trim().toLowerCase().min(1).max(150),
  password: z.string().min(1).max(200),
});

/** Only users with role "admin" may enter; everyone else gets the same generic error. */
export async function adminSignIn(_prev: AdminSignInState, formData: FormData): Promise<AdminSignInState> {
  const email = String(formData.get("email") ?? "");
  const parsed = schema.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) return { error: "missing", email };

  const ip = await clientIp();
  // Locked out: answer before touching the database or bcrypt.
  if (isSignInLocked(ip, parsed.data.email)) return { error: "locked", email };

  const user = await db.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true },
  });
  const ok = await bcrypt.compare(parsed.data.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user?.passwordHash || !ok || user.role !== "admin") {
    recordSignInFailure(ip, parsed.data.email);
    return { error: "invalid", email };
  }
  resetSignInFailures(ip, parsed.data.email);

  await createSession({ userId: user.id.toString(), role: "admin" });
  redirect("/admin");
}

export async function adminSignOut() {
  await deleteSession();
  redirect("/admin/sign-in");
}
