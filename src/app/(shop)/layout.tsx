import { Footer } from "@/components/layout/footer";
import { ShopUIProvider } from "@/components/layout/shop-ui";
import { SiteHeader } from "@/components/layout/site-header";

/** Storefront chrome: Site Top + page + Footer, as in every pen storefront frame. */
export default function ShopLayout({ children }: LayoutProps<"/">) {
  return (
    <ShopUIProvider>
      <SiteHeader />
      <main className="flex w-full flex-1 flex-col">{children}</main>
      <Footer />
    </ShopUIProvider>
  );
}
