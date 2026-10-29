import type { Metadata } from "next";
import { NotFoundBody } from "@/components/content/not-found-body";
import { Footer } from "@/components/layout/footer";
import { ShopUIProvider } from "@/components/layout/shop-ui";
import { SiteHeader } from "@/components/layout/site-header";
import { notFoundMessages } from "@/i18n/messages/pages/not-found";
import { getMessages } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getMessages(notFoundMessages);
  return { title: t.metaTitle, description: t.metaDescription };
}

/**
 * pen: Page not found (Ge2Dq). Renders outside the (shop) layout, so it
 * mounts the same storefront chrome itself.
 */
export default function NotFound() {
  return (
    <ShopUIProvider>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">
        <NotFoundBody />
      </main>
      <Footer />
    </ShopUIProvider>
  );
}
