import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { claimPastOrders } from "@/app/actions/claim-orders";
import { findClaim } from "@/app/auth/claim-orders/claim-token";
import { Eyebrow } from "@/components/content/eyebrow";
import { Button, ButtonLink } from "@/components/ui/button";
import { claimOrdersMessages } from "@/i18n/messages/pages/claim-orders";
import { getMessages } from "@/i18n/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(claimOrdersMessages)).metaTitle, robots: { index: false } };
}

/**
 * From the "add your past orders" email after a password sign-up. Opening the link changes nothing (mail
 * scanners open links too, and the account may not be the inbox owner's): signed out, it asks to sign in
 * first and comes back; signed in as another account, it says so; signed in as the account the link was
 * emailed for, it asks to confirm, and the button (claimPastOrders) adds the orders.
 */
export default async function ClaimOrdersPage({ searchParams }: PageProps<"/account/claim">) {
  const { t: raw } = await searchParams;
  const token = typeof raw === "string" ? raw : "";
  const [t, claim] = await Promise.all([getMessages(claimOrdersMessages), findClaim(token)]);

  let view: { title: string; sub: string; confirm?: boolean };
  if (!claim) view = { title: t.invalidTitle, sub: t.invalidSub };
  else {
    const user = await requireUser(`/account/claim?t=${encodeURIComponent(token)}`);
    if (user.id !== claim.userId) view = { title: t.otherTitle, sub: t.otherSub };
    else {
      const count = await db.order.count({ where: { userId: null, email: claim.email } });
      // Nothing left to add (added already, or from Google sign-in): the account says they're there.
      if (count === 0) redirect("/account?linked=0");
      view = { title: t.confirmTitle(count), sub: t.confirmSub(count, claim.email), confirm: true };
    }
  }

  return (
    <section className="section-y flex w-full flex-col items-center gap-6 px-4 text-center sm:px-8 lg:px-16" aria-labelledby="claim-title">
      <Eyebrow>{t.eyebrow}</Eyebrow>
      <h1 id="claim-title" className="type-page max-w-[800px] font-display text-balance font-bold text-foreground">
        {view.title}
      </h1>
      <p className="max-w-[560px] text-balance text-[17px] leading-[1.53] break-words text-muted-foreground sm:text-[19px] sm:leading-[29px]">
        {view.sub}
      </p>
      {view.confirm ? (
        <form action={claimPastOrders} className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <input type="hidden" name="t" value={token} />
          <Button type="submit" className="w-full max-w-[320px] sm:w-auto">
            {t.confirm}
          </Button>
          <ButtonLink href="/account" variant="secondary" className="w-full max-w-[320px] sm:w-auto">
            {t.later}
          </ButtonLink>
        </form>
      ) : (
        <ButtonLink href="/account" className="w-full max-w-[320px] sm:w-auto">
          {t.account}
        </ButtonLink>
      )}
    </section>
  );
}
