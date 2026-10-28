"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { WEEK_DAYS } from "@/components/admin/rules";

export type SettingsErrorKey =
  | "storeName"
  | "city"
  | "email"
  | "phone"
  | "address"
  | "time"
  | "closesAt"
  | "fee"
  | "days"
  | "fulfilment"
  | "payments"
  | "generic";

export type SettingsField =
  | "storeName"
  | "city"
  | "email"
  | "phone"
  | "address"
  | "opensAt"
  | "closesAt"
  | "deliveryFee"
  | "openDays"
  | "fulfilment"
  | "payments"
  | "form";

export type SettingsState = {
  status: "idle" | "saved" | "error";
  errors: Partial<Record<SettingsField, SettingsErrorKey>>;
  savedAt?: number;
};

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const schema = z
  .object({
    storeName: z.string().trim().min(1).max(100),
    city: z.string().trim().min(1).max(100),
    email: z.email().max(150),
    phone: z.string().trim().min(6).max(20),
    address: z.string().trim().min(1).max(255),
    opensAt: time,
    closesAt: time,
    deliveryFee: z.number().int().min(0).max(10_000_000),
    openDays: z.array(z.enum(WEEK_DAYS)).min(1),
    pickupEnabled: z.boolean(),
    deliveryEnabled: z.boolean(),
    vaEnabled: z.boolean(),
    retailEnabled: z.boolean(),
    qrisEnabled: z.boolean(),
    ewalletEnabled: z.boolean(),
  })
  .superRefine((s, ctx) => {
    if (s.closesAt <= s.opensAt) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "closesAt" });
    if (!s.pickupEnabled && !s.deliveryEnabled) ctx.addIssue({ code: "custom", path: ["fulfilment"], message: "fulfilment" });
    if (!s.vaEnabled && !s.retailEnabled && !s.qrisEnabled && !s.ewalletEnabled)
      ctx.addIssue({ code: "custom", path: ["payments"], message: "payments" });
  });

const fieldError: Record<string, [SettingsField, SettingsErrorKey]> = {
  storeName: ["storeName", "storeName"],
  city: ["city", "city"],
  email: ["email", "email"],
  phone: ["phone", "phone"],
  address: ["address", "address"],
  opensAt: ["opensAt", "time"],
  closesAt: ["closesAt", "time"],
  deliveryFee: ["deliveryFee", "fee"],
  openDays: ["openDays", "days"],
  fulfilment: ["fulfilment", "fulfilment"],
  payments: ["payments", "payments"],
};

export async function saveStoreSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const fee = String(formData.get("deliveryFee") ?? "").replace(/\D/g, "");
  const on = (name: string) => formData.get(name) === "on";
  const parsed = schema.safeParse({
    storeName: formData.get("storeName") ?? "",
    city: formData.get("city") ?? "",
    email: String(formData.get("email") ?? "").trim(),
    phone: formData.get("phone") ?? "",
    address: formData.get("address") ?? "",
    opensAt: String(formData.get("opensAt") ?? "").trim(),
    closesAt: String(formData.get("closesAt") ?? "").trim(),
    deliveryFee: fee === "" ? Number.NaN : Number(fee),
    openDays: formData.getAll("openDays").map(String),
    pickupEnabled: on("pickupEnabled"),
    deliveryEnabled: on("deliveryEnabled"),
    vaEnabled: on("vaEnabled"),
    retailEnabled: on("retailEnabled"),
    qrisEnabled: on("qrisEnabled"),
    ewalletEnabled: on("ewalletEnabled"),
  });

  if (!parsed.success) {
    const errors: SettingsState["errors"] = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      const mapped = fieldError[key];
      if (!mapped) continue;
      const [field, error] = mapped;
      // A custom "closes after opens" issue keeps its own message.
      errors[field] ??= issue.code === "custom" && issue.message === "closesAt" ? "closesAt" : error;
    }
    return { status: "error", errors };
  }

  const { openDays, ...rest } = parsed.data;
  try {
    await db.storeSettings.upsert({
      where: { id: 1 },
      update: { ...rest, openDays: WEEK_DAYS.filter((d) => openDays.includes(d)).join(",") },
      create: { id: 1, ...rest, openDays: WEEK_DAYS.filter((d) => openDays.includes(d)).join(",") },
    });
  } catch (error) {
    console.error("saveStoreSettings failed", error);
    return { status: "error", errors: { form: "generic" } };
  }

  // Store name, hours, fees and payment methods show up all over the storefront
  // (footer and header on every page), so this stays layout-wide.
  revalidatePath("/", "layout");
  return { status: "saved", errors: {}, savedAt: Date.now() };
}
