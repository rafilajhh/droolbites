"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { isLatLng } from "@/lib/delivery";
import { isValidMobile, normalizePhone } from "@/lib/orders";
import { allowRequest, clientIp, perClientMax } from "@/lib/rate-limit";
import { createSession, getSession } from "@/lib/session";

/** Keys into accountMessages.errors; the client renders them in the active language. */
export type AccountErrorKey =
  | "fullName"
  | "phone"
  | "email"
  | "emailTaken"
  | "address"
  | "city"
  | "postalCode"
  | "pin"
  | "recipientName"
  | "recipientPhone"
  | "detail"
  | "note"
  | "currentRequired"
  | "currentWrong"
  | "password"
  | "mismatch"
  | "same"
  | "tooManyAttempts"
  | "generic";

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
export type AddressField =
  | "recipientName"
  | "recipientPhone"
  | "address"
  | "addressDetail"
  | "district"
  | "city"
  | "postalCode"
  | "note"
  | "pin";
export type PasswordField = "current" | "password" | "confirm";

/**
 * Fresh read of the signed-in user. getCurrentUser() is cached per request, and
 * revalidatePath re-renders the page inside this same request, so it would
 * hand the page the values from before the update.
 */
async function sessionUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: BigInt(session.userId) }, select: { id: true, email: true, phone: true } });
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

const nameOk = (name: string) => name.length >= 2 && name.length <= 100;
// The same rule as checkout (the profile phone prefills it): an Indonesian mobile number.
const phoneOk = isValidMobile;

export async function updateProfile(_prev: AccountState<ProfileField>, formData: FormData): Promise<AccountState<ProfileField>> {
  const attempt = Date.now();
  const user = await sessionUser();
  if (!user) return { formError: "generic", attempt };

  const fullName = text(formData, "fullName");
  const phone = normalizePhone(text(formData, "phone"));
  const email = text(formData, "email").toLowerCase();

  const values = { fullName, phone, email };
  const errors: AccountState<ProfileField>["errors"] = {};
  if (!nameOk(fullName)) errors.fullName = "fullName";
  // Only a changed number is checked: one saved under the older, looser rule (a landline) must not
  // block saving the name or email.
  if (phone && phone !== (user.phone ?? "") && !phoneOk(phone)) errors.phone = "phone";
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
 * Saved delivery address: who receives it (users.recipient_name/phone), the street with its block/floor/
 * unit, the kecamatan from the pin, city, postal code, a note for the courier, and the map pin
 * (address_lat/lng) that checkout measures the delivery distance from. Whether it can be delivered to
 * is decided there from the pin, not from the city; the country (Indonesia) has no column.
 */
export async function updateAddress(_prev: AccountState<AddressField>, formData: FormData): Promise<AccountState<AddressField>> {
  const attempt = Date.now();
  const user = await sessionUser();
  if (!user) return { formError: "generic", attempt };

  const recipientName = text(formData, "recipientName");
  const recipientPhone = normalizePhone(text(formData, "recipientPhone"));
  const address = text(formData, "address");
  const addressDetail = text(formData, "addressDetail");
  const district = text(formData, "district").slice(0, 100);
  const city = text(formData, "city");
  const postalCode = text(formData, "postalCode");
  const note = text(formData, "note");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  const values = { recipientName, recipientPhone, address, addressDetail, district, city, postalCode, note };
  const errors: AccountState<AddressField>["errors"] = {};
  if (!nameOk(recipientName)) errors.recipientName = "recipientName";
  if (!phoneOk(recipientPhone)) errors.recipientPhone = "recipientPhone";
  if (address.length < 5 || address.length > 255) errors.address = "address";
  if (addressDetail.length > 70) errors.addressDetail = "detail";
  if (city.length < 2 || city.length > 100) errors.city = "city";
  if (!/^\d{5}$/.test(postalCode)) errors.postalCode = "postalCode";
  if (note.length > 200) errors.note = "note";
  if (!formData.get("lat") || !formData.get("lng") || !isLatLng(lat, lng)) errors.pin = "pin";
  if (Object.keys(errors).length) return { errors, values, attempt };

  await db.user.update({
    where: { id: user.id },
    data: {
      recipientName,
      recipientPhone,
      address,
      addressDetail: addressDetail || null,
      district: district || null,
      city,
      postalCode,
      addressNote: note || null,
      addressLat: lat,
      addressLng: lng,
    },
  });
  revalidatePath("/checkout");
  revalidatePath("/account");
  return { saved: true, values, attempt };
}

/** Same rules as sign-up and the admin password form (src/app/actions/auth.ts, admin/account.ts). */
const BCRYPT_COST = 10;
const passwordSchema = z.string().min(8).max(72); // bcrypt only reads the first 72 bytes
/** Current-password checks per 15 minutes (see allowRequest). */
const PASSWORD_MAX_PER_USER = 5;
const PASSWORD_MAX_PER_IP = 10;

/**
 * Change the password of an email-and-password account: the current one first. Sessions carry a stamp
 * of the password, so every other device is signed out and this one gets a fresh session. A Google
 * account without a password sets one through the reset email instead (requestPasswordReset).
 */
export async function changePassword(_prev: AccountState<PasswordField>, formData: FormData): Promise<AccountState<PasswordField>> {
  const attempt = Date.now();
  const session = await getSession();
  if (!session) return { formError: "generic", attempt };
  const raw = (key: string) => {
    const value = formData.get(key);
    return typeof value === "string" ? value : "";
  };
  const current = raw("current");
  const password = raw("password");
  const confirm = raw("confirm");

  const errors: AccountState<PasswordField>["errors"] = {};
  if (!current) errors.current = "currentRequired";
  if (!passwordSchema.safeParse(password).success) errors.password = "password";
  else if (password !== confirm) errors.confirm = "mismatch";
  else if (password === current) errors.password = "same";
  if (Object.keys(errors).length) return { errors, attempt };

  // Each check of the current password counts, so a stolen session can't brute-force it.
  const ip = await clientIp();
  const allowed =
    allowRequest(`accountpw:user:${session.userId}`, PASSWORD_MAX_PER_USER) &&
    allowRequest(`accountpw:ip:${ip}`, perClientMax(ip, PASSWORD_MAX_PER_IP));
  if (!allowed) return { formError: "tooManyAttempts", attempt };

  const user = await db.user.findUnique({ where: { id: BigInt(session.userId) }, select: { id: true, role: true, passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(current, user.passwordHash))) {
    return { errors: { current: "currentWrong" }, attempt };
  }

  try {
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, BCRYPT_COST) } });
  } catch (error) {
    console.error("[account] changePassword failed", error);
    return { formError: "generic", attempt };
  }
  await createSession({ userId: user.id.toString(), role: user.role });
  return { saved: true, attempt };
}
