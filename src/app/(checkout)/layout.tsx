/**
 * Checkout chrome: no site header, nav, cart drawer or footer. Each page
 * renders the Checkout Header (zWLto) with its own step above its <main>.
 */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex w-full flex-1 flex-col bg-background">{children}</div>;
}
