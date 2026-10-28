import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import { AnnouncementBar } from "./announcement-bar";
import { HeaderBar } from "./header-bar";
import { NavMenu } from "./nav-menu";
import { CartDrawer } from "./cart-drawer";

/** pen: Site Top (iCPgc) → Site Header (n8WZL), plus its two overlays. The announcement strip above it is an owner-requested addition. */
export async function SiteHeader() {
  const [cart, user, settings] = await Promise.all([getCart(), getCurrentUser(), getStoreSettings()]);
  const accountHref = user ? (user.role === "admin" ? "/admin" : "/account") : "/sign-in";

  return (
    <>
      <AnnouncementBar />
      <HeaderBar cartCount={cart.count} accountHref={accountHref} />
      <NavMenu accountHref={accountHref} email={settings.email} />
      <CartDrawer cart={cart} deliveryFee={settings.deliveryFee} />
    </>
  );
}
