import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminMain } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { getStoreSettings } from "@/lib/settings";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(adminMessages);
  return { title: t.meta.settings };
}

/** pen: Admin / Store settings (j3evM). */
export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const s = await getStoreSettings();
  return (
    <AdminMain>
      <SettingsForm
        values={{
          storeName: s.storeName,
          city: s.city,
          email: s.email,
          phone: s.phone,
          address: s.address,
          pickupEnabled: s.pickupEnabled,
          deliveryEnabled: s.deliveryEnabled,
          opensAt: s.opensAt,
          closesAt: s.closesAt,
          openDays: s.openDays.split(",").filter(Boolean),
          deliveryFee: s.deliveryFee,
          deliveryBaseKm: s.deliveryBaseKm,
          deliveryPerKm: s.deliveryPerKm,
          deliveryMaxKm: s.deliveryMaxKm,
          storeLat: s.storeLat,
          storeLng: s.storeLng,
          vaEnabled: s.vaEnabled,
          retailEnabled: s.retailEnabled,
          qrisEnabled: s.qrisEnabled,
          ewalletEnabled: s.ewalletEnabled,
        }}
      />
      {/* Below lg the settings form ends in a sticky save bar that eats the gap (-mb-6), so add it back. */}
      <PasswordForm email={admin.email} className="max-lg:mt-6" />
    </AdminMain>
  );
}
