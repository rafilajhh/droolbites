import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { PaymentForm } from "@/components/checkout/payment-form";
import { cartShortItems, cartSummaryLines } from "@/components/checkout/summary-lines";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { getCart } from "@/lib/cart";
import { formatDistance } from "@/lib/format";
import { checkoutDeliveryFee, formatAddress, joinStreet, otherRecipient, readCheckoutDetails } from "@/lib/orders";
import { demoPaymentsEnabled, getPaymentOptions, serviceFeeEstimates, serviceFeeMayApply } from "@/lib/payments";
import { getStoreSettings } from "@/lib/settings";
import { checkoutClosed } from "@/lib/store-hours";

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
  // BCA VA first, unless the gateway refuses it for this total (VAs have a minimum): then QRIS, which
  // takes any amount, else the first method it takes.
  const usable = methods.filter((m) => !(m in belowMinimum));
  const defaultMethod = usable.includes("bca_va") ? "bca_va" : usable.includes("qris") ? "qris" : (usable[0] ?? null);
  // The fee each method adds to this total, where it's known before the charge (only while a fee may apply).
  const fees = feeMayApply ? serviceFeeEstimates(usable, total) : {};
  const recipient = delivery
    ? otherRecipient({
        customerName: details.fullName,
        phone: details.phone,
        recipientName: details.recipientName || null,
        recipientPhone: details.recipientPhone || null,
      })
    : null;

  return (
    <>
      <CheckoutHeader step={3} />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col outline-hidden">
        <PaymentForm
          review={{
            name: details.fullName,
            phone: details.phone,
            email: details.email,
            recipient,
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
          fees={fees}
          storeClosed={checkoutClosed(settings)}
          short={cartShortItems(cart)}
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
