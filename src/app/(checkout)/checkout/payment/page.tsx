import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { PaymentForm } from "@/components/checkout/payment-form";
import { cartSummaryLines } from "@/components/checkout/summary-lines";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { getCart } from "@/lib/cart";
import { formatDistance } from "@/lib/format";
import { checkoutDeliveryFee, formatAddress, joinStreet, readCheckoutDetails } from "@/lib/orders";
import { demoPaymentsEnabled, getPaymentOptions, serviceFeeMayApply } from "@/lib/payments";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(checkoutMessages)).meta.payment, robots: { index: false } };
}

/** pen: Checkout · Payment (D75ET6). */
export default async function CheckoutPaymentPage() {
  const [cart, settings, details, locale] = await Promise.all([
    getCart(),
    getStoreSettings(),
    readCheckoutDetails(),
    getLocale(),
  ]);
  if (cart.lines.length === 0) redirect("/menu");
  if (!details) redirect("/checkout");
  const delivery = details.fulfilment === "delivery";
  if (delivery ? !settings.deliveryEnabled : !settings.pickupEnabled) redirect("/checkout");

  const fee = checkoutDeliveryFee(settings, details);
  // No distance on file, or the store's range shrank since: pin the address again.
  if (fee === null) redirect("/checkout");
  const total = cart.subtotal + fee;
  const [{ methods, logos, belowMinimum }, feeMayApply] = await Promise.all([getPaymentOptions(settings, total), serviceFeeMayApply()]);
  // BCA VA first, unless the gateway refuses it for this total: then the first method it takes.
  const usable = methods.filter((m) => !(m in belowMinimum));
  const defaultMethod = usable.includes("bca_va") ? "bca_va" : (usable[0] ?? null);

  return (
    <>
      <CheckoutHeader step={3} />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col outline-hidden">
        <PaymentForm
          review={{
            email: details.email,
            fulfilment: details.fulfilment,
            address: delivery
              ? formatAddress({
                  address: joinStreet(details.street, details.apartment),
                  district: details.district,
                  city: details.city,
                  postal: details.postal,
                })
              : settings.address,
            distance: delivery && details.distanceM !== null ? formatDistance(details.distanceM, locale) : null,
            fee,
          }}
          methods={methods}
          logos={logos}
          belowMinimum={belowMinimum}
          defaultMethod={defaultMethod}
          feeMayApply={feeMayApply}
          demo={demoPaymentsEnabled()}
          summary={{
            lines: cartSummaryLines(cart, locale),
            itemCount: cart.count,
            subtotal: cart.subtotal,
            total,
          }}
        />
      </main>
    </>
  );
}
