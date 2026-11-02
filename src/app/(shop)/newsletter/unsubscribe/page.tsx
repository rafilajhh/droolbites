import type { Metadata } from "next";
import { unsubscribeNewsletter } from "@/app/actions/newsletter";
import { Eyebrow } from "@/components/content/eyebrow";
import { Button, ButtonLink } from "@/components/ui/button";
import { unsubscribeMessages } from "@/i18n/messages/pages/unsubscribe";
import { getMessages } from "@/i18n/server";
import { readUnsubscribeToken } from "@/lib/emails";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(unsubscribeMessages)).metaTitle, robots: { index: false } };
}

/**
 * From the newsletter's "Unsubscribe" link. Opening the link changes nothing (mail scanners open
 * links too); the button does. Mail apps that support one-click use /api/newsletter/unsubscribe.
 */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string; done?: string }> }) {
  const [t, { t: token, done }] = await Promise.all([getMessages(unsubscribeMessages), searchParams]);
  const email = done ? null : await readUnsubscribeToken(token);
  const state = done ? "done" : email ? "confirm" : "invalid";

  const title = state === "done" ? t.doneTitle : state === "confirm" ? t.confirmTitle : t.invalidTitle;
  const sub = state === "done" ? t.doneSub : state === "confirm" ? t.confirmSub(email!) : t.invalidSub;

  return (
    <section
      className="section-y flex w-full flex-col items-center gap-6 px-4 text-center sm:px-8 lg:px-16"
      aria-labelledby="unsubscribe-title"
    >
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <h1 id="unsubscribe-title" className="type-page max-w-[800px] font-display text-balance font-bold text-foreground">
        {title}
      </h1>
      <p className="max-w-[560px] text-balance text-[17px] leading-[1.53] break-words text-muted-foreground sm:text-[19px] sm:leading-[29px]">
        {sub}
      </p>
      {state === "confirm" ? (
        <form action={unsubscribeNewsletter} className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <input type="hidden" name="t" value={token} />
          <Button type="submit" className="w-full max-w-[320px] sm:w-auto">
            {t.confirm}
          </Button>
          <ButtonLink href="/" variant="secondary" className="w-full max-w-[320px] sm:w-auto">
            {t.keep}
          </ButtonLink>
        </form>
      ) : (
        <ButtonLink href="/menu" className="w-full max-w-[320px] sm:w-auto">
          {t.menu}
        </ButtonLink>
      )}
    </section>
  );
}
