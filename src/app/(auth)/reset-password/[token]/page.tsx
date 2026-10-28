import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/new-password-form";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { findResetUser } from "../reset-token";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).newPassword.metaTitle, referrer: "no-referrer" };
}

/** pen: Set new password (y7fayf). */
export default async function NewPasswordPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  const t = await getMessages(authMessages);
  const user = await findResetUser(decodeURIComponent(token));

  return (
    <AuthShell photo="party-spread" quote={t.newPassword.quote}>
      <NewPasswordForm token={decodeURIComponent(token)} initiallyInvalid={!user} />
    </AuthShell>
  );
}
