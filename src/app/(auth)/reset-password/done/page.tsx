import type { Metadata } from "next";
import { AuthHead } from "@/components/auth/auth-bits";
import { AuthShell } from "@/components/auth/auth-shell";
import { ButtonLink } from "@/components/ui/button";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).done.metaTitle };
}

/** pen: Password updated (mK4mI). */
export default async function PasswordUpdatedPage() {
  const t = await getMessages(authMessages);

  return (
    <AuthShell photo="store-front" quote={t.done.quote}>
      <AuthHead eyebrow={t.done.eyebrow} title={t.done.title} sub={t.done.sub} />
      <ButtonLink href="/sign-in" className="w-full">
        {t.done.submit}
      </ButtonLink>
    </AuthShell>
  );
}
