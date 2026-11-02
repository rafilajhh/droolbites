import type { Metadata } from "next";
import { AdminPulse } from "@/components/admin/admin-pulse";
import { AdminSidebar } from "@/components/admin/sidebar";
import { adminPulse } from "@/lib/admin-pulse";
import { requireAdmin } from "@/lib/auth";
import { getStoreSettings, isOpenNow } from "@/lib/settings";
import { getMessages } from "@/i18n/server";
import { SkipLink } from "@/components/layout/skip-link";
import { adminMessages } from "@/i18n/messages/admin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Admin shell: sidebar (pen b1FcOS) + page. /admin/sign-in lives outside this group. */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [settings, t, pulse] = await Promise.all([getStoreSettings(), getMessages(adminMessages), adminPulse()]);
  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <SkipLink label={t.common.skipToContent} />
      <AdminSidebar storeName={settings.storeName} city={settings.city} openNow={isOpenNow(settings)} newOrders={pulse.newOrders} />
      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-hidden">
        {children}
      </main>
      <AdminPulse newOrders={pulse.newOrders} latest={pulse.latest} />
    </div>
  );
}
