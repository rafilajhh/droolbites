import type { Metadata } from "next";
import { AuthHead, AuthSwitch } from "@/components/auth/auth-bits";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { SignUpPerks } from "@/components/auth/sign-up-perks";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { safeNext } from "@/lib/auth";
import { redirectIfSignedIn } from "../guard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).signUp.metaTitle };
}

/** pen: Sign up (mjLE0). */
export default async function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  const { next } = await searchParams;
  await redirectIfSignedIn(next);
  const t = await getMessages(authMessages);
  const nextPath = typeof next === "string" ? safeNext(next) : undefined;
  const signInHref = nextPath ? `/sign-in?next=${encodeURIComponent(nextPath)}` : "/sign-in";

  return (
    <AuthShell photo="gift-box" quote={t.signUp.quote}>
      <AuthHead eyebrow={t.signUp.eyebrow} title={t.signUp.title} sub={t.signUp.sub} />
      <SignUpPerks label={t.signUp.perksLabel} perks={t.signUp.perks} />
      <SignUpForm next={nextPath} />
      <AuthSwitch text={t.signUp.switchText} linkLabel={t.signUp.switchLink} href={signInHref} />
    </AuthShell>
  );
}
