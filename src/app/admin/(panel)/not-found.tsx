import { AdminMain, PageHead } from "@/components/admin/ui";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { adminMessages } from "@/i18n/messages/admin";

/** notFound() from an admin page (unknown order or product) lands here, inside the admin shell. */
export default async function AdminNotFound() {
  const t = (await getMessages(adminMessages)).notFound;
  return (
    <AdminMain>
      <PageHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      <ButtonLink href="/admin" variant="secondary" className="w-fit">
        {t.back}
      </ButtonLink>
    </AdminMain>
  );
}
