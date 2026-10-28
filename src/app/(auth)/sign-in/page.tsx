import type { Metadata } from "next";
import { AuthHead, AuthSwitch } from "@/components/auth/auth-bits";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { safeNext } from "@/lib/auth";
import { redirectIfSignedIn } from "../guard";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(authMessages)).signIn.metaTitle };
}

/** pen: Sign in (tjpUD). */
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const { next } = await searchParams;
  await redirectIfSignedIn(next);
  const t = await getMessages(authMessages);
  const nextPath = typeof next === "string" ? safeNext(next) : undefined;
  const signUpHref = nextPath ? `/sign-up?next=${encodeURIComponent(nextPath)}` : "/sign-up";

  return (
    <AuthShell photo="hero-cookies" quote={t.signIn.quote}>
      <AuthHead eyebrow={t.signIn.eyebrow} title={t.signIn.title} sub={t.signIn.sub} />
      <SignInForm next={nextPath} />
      <AuthSwitch text={t.signIn.switchText} linkLabel={t.signIn.switchLink} href={signUpHref} />
    </AuthShell>
  );
}
