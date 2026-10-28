import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { PaymentForm } from "@/components/checkout/payment-form";
import { cartSummaryLines } from "@/components/checkout/summary-lines";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { getCart } from "@/lib/cart";
import { formatAddress, joinStreet, readCheckoutDetails } from "@/lib/orders";
import { getPaymentOptions } from "@/lib/payments";
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

  const fee = delivery ? settings.deliveryFee : 0;
  const { methods, logos } = await getPaymentOptions(settings);
  const defaultMethod = methods.includes("bca_va") ? "bca_va" : (methods[0] ?? null);

  return (
    <>
      <CheckoutHeader step={3} />
      <main className="flex w-full flex-1 flex-col">
        <PaymentForm
          review={{
            email: details.email,
            fulfilment: details.fulfilment,
            address: delivery
              ? formatAddress({
                  address: joinStreet(details.street, details.apartment),
                  city: details.city,
                  postal: details.postal,
                })
              : settings.address,
            fee,
          }}
          methods={methods}
          logos={logos}
          defaultMethod={defaultMethod}
          summary={{
            lines: cartSummaryLines(cart, locale),
            itemCount: cart.count,
            subtotal: cart.subtotal,
            total: cart.subtotal + fee,
          }}
        />
      </main>
    </>
  );
}
