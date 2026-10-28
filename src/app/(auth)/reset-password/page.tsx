import type { Metadata } from "next";
import { AuthHead, AuthSwitch } from "@/components/auth/auth-bits";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetRequestForm } from "@/components/auth/reset-request-form";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { redirectIfSignedIn } from "../guard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).reset.metaTitle };
}

/** pen: Reset password (TwZFf). */
export default async function ResetPasswordPage() {
  await redirectIfSignedIn();
  const t = await getMessages(authMessages);

  return (
    <AuthShell photo="story-bakers" quote={t.reset.quote}>
      <AuthHead eyebrow={t.reset.eyebrow} title={t.reset.title} sub={t.reset.sub} />
      <ResetRequestForm />
      <AuthSwitch text={t.reset.switchText} linkLabel={t.reset.switchLink} href="/sign-in" />
    </AuthShell>
  );
}
