import { AdminMain } from "@/components/admin/ui";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

const block = "rounded-sm bg-oat animate-pulse motion-reduce:animate-none";

/** Placeholder for the admin content area while a page loads; the sidebar stays put. */
export default async function AdminLoading() {
  const t = await getMessages(adminMessages);
  return (
    <AdminMain>
      <p role="status" className="sr-only">
        {t.common.loading}
      </p>
      <div aria-hidden className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <div className={`${block} h-[34px] w-56 lg:h-[44px]`} />
          <div className={`${block} h-[23px] w-80 max-w-full`} />
        </div>
        <div className={`${block} h-12 w-full rounded-m`} />
        <div className={`${block} h-[420px] w-full rounded-m`} />
      </div>
    </AdminMain>
  );
}
