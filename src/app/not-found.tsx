import type { Metadata } from "next";
import Image from "next/image";
import { Footer } from "@/components/layout/footer";
import { ShopUIProvider } from "@/components/layout/shop-ui";
import { SiteHeader } from "@/components/layout/site-header";
import { ButtonLink } from "@/components/ui/button";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(notFoundMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

const four = "font-display text-[120px] leading-[0.9] font-extrabold sm:text-[220px]";

/**
 * pen: Page not found (Ge2Dq). Renders outside the (shop) layout, so it
 * mounts the same storefront chrome itself.
 */
export default async function NotFound() {
  const t = await getMessages(notFoundMessages);

  return (
    <ShopUIProvider>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <section className="flex w-full flex-col items-center gap-7 px-4 pt-12 pb-16 text-center sm:px-8 lg:px-16 lg:pt-24 lg:pb-28">
          <div className="flex items-center gap-2" aria-hidden>
            <span className={`${four} text-accent-magenta`}>4</span>
            <span className="relative size-[104px] shrink-0 overflow-hidden rounded-full bg-oat sm:size-[190px]">
              <Image
                src="/images/products/chocolate-chunk.png"
                alt=""
                fill
                priority
                quality={100}
                sizes="190px"
                className="object-cover"
              />
            </span>
            <span className={`${four} text-accent-cobalt`}>4</span>
          </div>
          <h1 className="max-w-[900px] font-display text-[40px] leading-[1.02] font-bold tracking-[-1px] text-foreground sm:text-[64px] sm:leading-[65px] sm:tracking-[-2px]">
            {t.title}
          </h1>
          <p className="max-w-[560px] text-[17px] leading-[1.53] text-muted-foreground sm:text-[19px] sm:leading-[29px]">
            {t.sub}
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <ButtonLink href="/menu">{t.menu}</ButtonLink>
            <ButtonLink href="/" variant="secondary">
              {t.home}
            </ButtonLink>
          </div>
        </section>
      </main>
      <Footer />
    </ShopUIProvider>
  );
}
