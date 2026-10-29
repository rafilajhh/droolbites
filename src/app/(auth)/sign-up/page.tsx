import type { Metadata } from "next";
import { AuthHead, AuthSwitch } from "@/components/auth/auth-bits";
import { AuthShell } from "@/components/auth/auth-shell";
import { GoogleSignIn } from "@/components/auth/google-sign-in";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getMessages } from "@/i18n/server";
import { authMessages } from "@/i18n/messages/auth";
import { safeNext } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google-auth";
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
  const googleHref = nextPath ? `/auth/google?next=${encodeURIComponent(nextPath)}` : "/auth/google";

  return (
    <AuthShell photo="gift-box" quote={t.signUp.quote}>
      <AuthHead eyebrow={t.signUp.eyebrow} title={t.signUp.title} sub={t.signUp.sub} />
      {isGoogleConfigured() ? <GoogleSignIn href={googleHref} label={t.google.continue} or={t.google.or} /> : null}
      <SignUpForm next={nextPath} />
      <AuthSwitch text={t.signUp.switchText} linkLabel={t.signUp.switchLink} href={signInHref} />
    </AuthShell>
  );
}
