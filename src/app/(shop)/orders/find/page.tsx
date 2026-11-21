import type { Metadata } from "next";
import Link from "next/link";
import { FindOrderForm } from "@/components/account/find-order-form";
import { Eyebrow } from "@/components/content/eyebrow";
import { findOrderMessages } from "@/i18n/messages/pages/find-order";
import { getMessages } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(findOrderMessages)).metaTitle, robots: { index: false } };
}

/**
 * Guest order lookup: the order number and the email it was placed with get the order's link emailed
 * to that address (linked from sign-in and the footer). Guests also get a sign-in link for orders placed
 * with an account.
 */
export default async function FindOrderPage() {
  const [t, user] = await Promise.all([getMessages(findOrderMessages), getCurrentUser()]);

  return (
    <section className="section-y flex w-full flex-col items-center gap-6 px-4 sm:px-8 lg:px-16" aria-labelledby="find-order-title">
      <div className="flex w-full max-w-[560px] flex-col items-center gap-4 text-center">
        <Eyebrow>{t.eyebrow}</Eyebrow>
        <h1 id="find-order-title" className="type-page font-display text-balance font-bold text-foreground">
          {t.title}
        </h1>
        <p className="text-balance text-[17px] leading-[1.53] text-muted-foreground sm:text-[19px] sm:leading-[29px]">{t.sub}</p>
      </div>
      <div className="flex w-full max-w-[440px] flex-col gap-6 pt-2">
        <FindOrderForm />
        {user ? null : (
          <p className="flex w-full flex-wrap justify-center gap-x-1.5 text-[15px] leading-[23px]">
            <span className="text-muted-foreground">{t.signIn}</span>
            <Link
              href="/sign-in"
              className="relative font-bold text-foreground underline-offset-4 after:absolute after:-inset-x-2 after:-inset-y-2.5 after:content-[''] hover:underline"
            >
              {t.signInLink}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
