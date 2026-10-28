import { Footer } from "@/components/layout/footer";
import { ShopUIProvider } from "@/components/layout/shop-ui";
import { SiteHeader } from "@/components/layout/site-header";
import { SkipLink } from "@/components/layout/skip-link";
import { getMessages } from "@/i18n/server";
import { commonMessages } from "@/i18n/messages/common";

/** Storefront chrome: Site Top + page + Footer, as in every pen storefront frame. */
export default async function ShopLayout({ children }: LayoutProps<"/">) {
  const t = await getMessages(commonMessages);
  return (
    <ShopUIProvider>
      <SkipLink label={t.header.skipToContent} />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col outline-hidden">{children}</main>
      <Footer />
    </ShopUIProvider>
  );
}
