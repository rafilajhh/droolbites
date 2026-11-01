"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { DELIVERY_CITY, DELIVERY_POSTAL_RE } from "@/lib/orders";
import { getSession } from "@/lib/session";

/** Keys into accountMessages.errors; the client renders them in the active language. */
export type AccountErrorKey = "fullName" | "phone" | "email" | "emailTaken" | "address" | "postalCode" | "postalArea" | "generic";

export type AccountState<F extends string> = {
  errors?: Partial<Record<F, AccountErrorKey>>;
  formError?: AccountErrorKey;
  saved?: boolean;
  /** What was submitted, so a failed save keeps the visitor's edits after React resets the form. */
  values?: Partial<Record<F, string>>;
  /** Changes on every submit so the client can re-announce and move focus. */
  attempt?: number;
};

export type ProfileField = "fullName" | "phone" | "email";
export type AddressField = "address" | "postalCode";

/**
 * Fresh read of the signed-in user. getCurrentUser() is cached per request, and
 * revalidatePath re-renders the page inside this same request, so it would
 * hand the page the values from before the update.
 */
async function sessionUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: BigInt(session.userId) }, select: { id: true, email: true } });
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

const nameOk = (name: string) => name.length >= 2 && name.length <= 100;
// Digits with optional leading +, spaces and dashes; 8–15 digits in total (E.164 max).
const phoneOk = (phone: string) => /^\+?[\d\s-]+$/.test(phone) && phone.length <= 20 && /^(\D*\d){8,15}\D*$/.test(phone);

export async function updateProfile(_prev: AccountState<ProfileField>, formData: FormData): Promise<AccountState<ProfileField>> {
  const attempt = Date.now();
  const user = await sessionUser();
  if (!user) return { formError: "generic", attempt };

  const fullName = text(formData, "fullName");
  const phone = text(formData, "phone");
  const email = text(formData, "email").toLowerCase();

  const values = { fullName, phone, email };
  const errors: AccountState<ProfileField>["errors"] = {};
  if (!nameOk(fullName)) errors.fullName = "fullName";
  if (phone && !phoneOk(phone)) errors.phone = "phone";
  if (!z.email().max(150).safeParse(email).success) errors.email = "email";
  if (Object.keys(errors).length) return { errors, values, attempt };

  if (email !== user.email) {
    const taken = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (taken && taken.id !== user.id) return { errors: { email: "emailTaken" }, values, attempt };
  }

  try {
    await db.user.update({ where: { id: user.id }, data: { fullName, phone: phone || null, email } });
  } catch {
    return { errors: { email: "emailTaken" }, values, attempt };
  }
  revalidatePath("/account");
  return { saved: true, values, attempt };
}

/**
 * Saved delivery address: users.address/city/postal_code. We only deliver within
 * Surabaya, so the city is always DELIVERY_CITY whatever the client sends; the
 * country (Indonesia) has no column and the name on orders stays users.full_name.
 */
export async function updateAddress(_prev: AccountState<AddressField>, formData: FormData): Promise<AccountState<AddressField>> {
  const attempt = Date.now();
  const user = await sessionUser();
  if (!user) return { formError: "generic", attempt };

  const address = text(formData, "address");
  const postalCode = text(formData, "postalCode");

  const values = { address, postalCode };
  const errors: AccountState<AddressField>["errors"] = {};
  if (address.length < 5 || address.length > 255) errors.address = "address";
  if (!/^\d{5}$/.test(postalCode)) errors.postalCode = "postalCode";
  // Same rule as checkout, so a saved address always pre-fills a valid delivery.
  else if (!DELIVERY_POSTAL_RE.test(postalCode)) errors.postalCode = "postalArea";
  if (Object.keys(errors).length) return { errors, values, attempt };

  await db.user.update({ where: { id: user.id }, data: { address, city: DELIVERY_CITY, postalCode } });
  revalidatePath("/account");
  return { saved: true, values, attempt };
}
