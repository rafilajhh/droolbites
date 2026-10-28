import type { Metadata } from "next";
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
  await requireAdmin();
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
          vaEnabled: s.vaEnabled,
          retailEnabled: s.retailEnabled,
          qrisEnabled: s.qrisEnabled,
          ewalletEnabled: s.ewalletEnabled,
        }}
      />
    </AdminMain>
  );
}
