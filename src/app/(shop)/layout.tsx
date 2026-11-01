import { Footer } from "@/components/layout/footer";
import { ShopUIProvider } from "@/components/layout/shop-ui";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { getMessages } from "@/i18n/server";
import { commonMessages } from "@/i18n/messages/common";

/**
 * Storefront chrome: Site Top + page + Footer, as in every pen storefront frame. The header is a
 * compact 56/64px, so `main` starts with a 12/24px top gutter (the landing side gutters) for air.
 */
export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const t = await getMessages(commonMessages);
  return (
    <ShopUIProvider>
      <SkipLink label={t.header.skipToContent} />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col pt-3 outline-hidden sm:pt-6">{children}</main>
      <Footer />
    </ShopUIProvider>
  );
}
