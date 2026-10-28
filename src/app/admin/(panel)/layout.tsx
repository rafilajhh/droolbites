import type { Metadata } from "next";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireAdmin } from "@/lib/auth";
import { getStoreSettings, isOpenNow } from "@/lib/settings";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Admin shell: sidebar (pen b1FcOS) + page. /admin/sign-in lives outside this group. */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [settings, t] = await Promise.all([getStoreSettings(), getMessages(adminMessages)]);
  return (
    <div className="flex w-full flex-1 flex-col lg:flex-row">
      <a
        href="#main"
        className="sr-only rounded-sm bg-white px-4 py-3 text-sm leading-[21px] font-bold text-foreground shadow-[0_12px_32px_rgb(31_42_20_/_0.15)] focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60]"
      >
        {t.common.skipToContent}
      </a>
      <AdminSidebar storeName={settings.storeName} city={settings.city} openNow={isOpenNow(settings)} />
      <main id="main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-hidden">
        {children}
      </main>
    </div>
  );
}
