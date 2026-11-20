import { SkipLink } from "@/components/layout/skip-link";
import { getMessages } from "@/i18n/server";
import { commonMessages } from "@/i18n/messages/common";

/**
 * Checkout chrome: no site header, nav, cart drawer or footer. Each page
 * renders the Checkout Header (zWLto) with its own step above its <main>, which
 * keeps to the same 1440px column as the storefront.
 */
export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const t = await getMessages(commonMessages);
  return (
    <div className="flex w-full flex-1 flex-col bg-background [&>main]:mx-auto [&>main]:max-w-[1440px]">
      <SkipLink label={t.header.skipToContent} />
      {children}
    </div>
  );
}
