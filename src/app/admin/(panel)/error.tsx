"use client";

import { useEffect } from "react";
import { AdminMain, PageHead } from "@/components/admin/ui";
import { Button, ButtonLink } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";

/** Error boundary for admin pages: renders inside the admin shell, sidebar intact. */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useMessages(adminMessages).errorPage;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AdminMain>
      <div role="alert">
        <PageHead eyebrow={t.eyebrow} title={t.title} sub={t.sub} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => retry()}>{t.retry}</Button>
        <ButtonLink href="/admin" variant="secondary">
          {t.back}
        </ButtonLink>
      </div>
    </AdminMain>
  );
}
