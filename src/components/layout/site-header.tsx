import { toShopCategories } from "@/components/shop/shop-product";
import { getLocale } from "@/i18n/server";
import { getCurrentUser } from "@/lib/auth";
import { getMenu } from "@/lib/catalog";
import { getCart } from "@/lib/cart";
import { getStoreSettings } from "@/lib/settings";
import { AnnouncementBar } from "./announcement-bar";
import { HeaderBar } from "./header-bar";
import { NavMenu } from "./nav-menu";
import { CartDrawer } from "./cart-drawer";
import { SearchOverlay } from "./search-overlay";

/** pen: Site Top (iCPgc) → Site Header (n8WZL), plus its overlays (nav, cart, search). The announcement strip above it is an owner-requested addition. */
export async function SiteHeader() {
  const [cart, user, settings, menu, locale] = await Promise.all([
    getCart(),
    getCurrentUser(),
    getStoreSettings(),
    getMenu(),
    getLocale(),
  ]);
  const accountHref = user ? (user.role === "admin" ? "/admin" : "/account") : "/sign-in";

  return (
    <>
      <AnnouncementBar />
      <HeaderBar cartCount={cart.count} accountHref={accountHref} />
      <NavMenu accountHref={accountHref} />
      <CartDrawer cart={cart} deliveryFee={settings.deliveryFee} />
      <SearchOverlay categories={toShopCategories(menu, locale)} />
    </>
  );
}
