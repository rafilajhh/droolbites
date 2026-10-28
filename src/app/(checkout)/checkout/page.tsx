import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { DetailsForm, type DetailsValues } from "@/components/checkout/details-form";
import { cartSummaryLines } from "@/components/checkout/summary-lines";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { getCurrentUser } from "@/lib/auth";
import { getCart } from "@/lib/cart";
import { DELIVERY_CITY, readCheckoutDetails, shortStoreAddress } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(checkoutMessages)).meta.details, robots: { index: false } };
}

/** pen: Checkout · Details (PPHfX). */
export default async function CheckoutDetailsPage() {
  const [cart, settings, user, details, locale] = await Promise.all([
    getCart(),
    getStoreSettings(),
    getCurrentUser(),
    readCheckoutDetails(),
    getLocale(),
  ]);
  if (cart.lines.length === 0) redirect("/menu");

  const defaultFulfilment = settings.deliveryEnabled || !settings.pickupEnabled ? "delivery" : "pickup";
  const initial: DetailsValues = details
    ? {
        email: details.email,
        fulfilment: details.fulfilment,
        fullName: details.fullName,
        phone: details.phone,
        street: details.street,
        apartment: details.apartment,
        city: DELIVERY_CITY,
        postal: details.postal,
      }
    : {
        email: user?.email ?? "",
        fulfilment: defaultFulfilment,
        fullName: user?.fullName ?? "",
        phone: user?.phone ?? "",
        street: user?.address ?? "",
        apartment: "",
        city: DELIVERY_CITY,
        postal: user?.postalCode ?? "",
      };
  if (initial.fulfilment === "delivery" && !settings.deliveryEnabled && settings.pickupEnabled) initial.fulfilment = "pickup";
  if (initial.fulfilment === "pickup" && !settings.pickupEnabled) initial.fulfilment = "delivery";

  const saved =
    user?.address && user.city && user.postalCode
      ? {
          street: user.address,
          apartment: "",
          city: DELIVERY_CITY,
          postal: user.postalCode,
        }
      : null;

  return (
    <>
      <CheckoutHeader step={2} />
      <main className="flex w-full flex-1 flex-col">
        <DetailsForm
          initial={initial}
          saved={saved}
          signInHref={user ? null : "/sign-in?next=/checkout"}
          options={{ delivery: settings.deliveryEnabled, pickup: settings.pickupEnabled }}
          store={{
            city: settings.city,
            shortAddress: shortStoreAddress(settings.address, settings.city),
            fullAddress: settings.address,
            opensAt: settings.opensAt,
            closesAt: settings.closesAt,
            deliveryFee: settings.deliveryFee,
          }}
          summary={{ lines: cartSummaryLines(cart, locale), itemCount: cart.count, subtotal: cart.subtotal }}
        />
      </main>
    </>
  );
}
