"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { allowRequest, clientIp, perClientMax } from "@/lib/rate-limit";

/** Keys into adminExtraMessages.account.errors. */
export type PasswordErrorKey =
  | "currentRequired"
  | "currentWrong"
  | "password"
  | "mismatch"
  | "same"
  | "tooManyAttempts"
  | "generic";

export type PasswordField = "current" | "password" | "confirm" | "form";

export type PasswordState = {
  status: "idle" | "saved" | "error";
  errors: Partial<Record<PasswordField, PasswordErrorKey>>;
  /** Changes on every submit so the client can move focus and re-announce. */
  attempt?: number;
};

// Same rules as sign-up in src/app/actions/auth.ts (not exported there).
const BCRYPT_COST = 10;
const passwordSchema = z.string().min(8).max(72); // bcrypt only reads the first 72 bytes

/** Current-password checks per 15 minutes (see allowRequest). */
const MAX_PER_ADMIN = 5;
const MAX_PER_IP = 10;

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function changeAdminPassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const admin = await requireAdmin();
  const current = text(formData, "current");
  const password = text(formData, "password");
  const confirm = text(formData, "confirm");
  const attempt = Date.now();

  const errors: PasswordState["errors"] = {};
  if (!current) errors.current = "currentRequired";
  if (!passwordSchema.safeParse(password).success) errors.password = "password";
  else if (password !== confirm) errors.confirm = "mismatch";
  else if (password === current) errors.password = "same";
  if (Object.keys(errors).length) return { status: "error", errors, attempt };

  // Each check of the current password counts, so a stolen session can't brute-force it.
  const ip = await clientIp();
  const allowed =
    allowRequest(`adminpw:user:${admin.id}`, MAX_PER_ADMIN) && allowRequest(`adminpw:ip:${ip}`, perClientMax(ip, MAX_PER_IP));
  if (!allowed) return { status: "error", errors: { form: "tooManyAttempts" }, attempt };

  const user = await db.user.findUnique({ where: { id: admin.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    return { status: "error", errors: { current: "currentWrong" }, attempt };
  }

  try {
    await db.user.update({
      where: { id: admin.id },
      data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST) },
    });
  } catch (error) {
    console.error("changeAdminPassword failed", error);
    return { status: "error", errors: { form: "generic" }, attempt };
  }

  // The session cookie holds only the user id and role, so it stays valid: the admin remains signed in.
  return { status: "saved", errors: {}, attempt };
}
