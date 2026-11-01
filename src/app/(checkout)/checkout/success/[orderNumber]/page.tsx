import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CircleCheckBig, CircleX, Cookie, House, ShoppingBag, Store, Truck } from "lucide-react";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { FulfilmentCard, InfoGrid, StoreContact } from "@/components/checkout/order-info";
import { OrderSummary } from "@/components/checkout/order-summary";
import { orderSummaryLines } from "@/components/checkout/summary-lines";
import { SummaryToggle } from "@/components/checkout/summary-toggle";
import { ButtonLink } from "@/components/ui/button";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { formatAddress, getOrderForViewer, itemCount, payable, withOrderToken } from "@/lib/orders";
import { paymentMethodInfo } from "@/lib/order-status";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getMessages(checkoutMessages)).meta.success, robots: { index: false } };
}

/** pen: Checkout · Payment success (cKUFC). */
export default async function SuccessPage({ params, searchParams }: PageProps<"/checkout/success/[orderNumber]">) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  const order = await getOrderForViewer(orderNumber, token);
  if (!order) notFound();
  if (order.paymentStatus !== "paid") redirect(withOrderToken(`/checkout/pay/${orderNumber}`, token));

  const [t, locale, settings] = await Promise.all([getMessages(checkoutMessages), getLocale(), getStoreSettings()]);
  const s = t.success;
  const delivery = order.fulfilmentMethod === "delivery";
  const payment = order.payments.find((pay) => pay.status === "paid") ?? order.payments[0];
  const pay = payable(order, payment);

  // What happens next: baking → out for delivery / ready → delivered / picked up.
  const stage =
    order.fulfilmentStatus === "completed"
      ? 3
      : order.fulfilmentStatus === "out_for_delivery" || order.fulfilmentStatus === "ready_for_pickup"
        ? 2
        : order.fulfilmentStatus === "cancelled"
          ? -1
          : 1;
  const next = [
    { icon: Cookie, ...s.steps.baking },
    delivery ? { icon: Truck, ...s.steps.out } : { icon: ShoppingBag, ...s.steps.ready },
    delivery ? { icon: House, ...s.steps.delivered } : { icon: Store, ...s.steps.collected },
  ];
  // The hero says what is true now, not only what was true at payment time.
  const cancelled = stage === -1;
  const hero = cancelled
    ? { title: s.titleCancelled, sub: s.subCancelled }
    : stage === 3
      ? { title: s.titleDone, sub: s.subDone }
      : stage === 2
        ? delivery
          ? { title: s.titleOut, sub: s.subOut }
          : { title: s.titleReady, sub: s.subReady }
        : { title: s.title, sub: delivery ? s.subDelivery : s.subPickup };
  const HeroIcon = cancelled ? CircleX : CircleCheckBig;

  return (
    <>
      {/* Checkout is over: the header is just the logo (no stepper, no way back into the flow). */}
      <CheckoutHeader />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col outline-hidden">
        <div className="flex w-full flex-col items-center gap-4 px-4 pt-12 pb-10 text-center md:px-16 md:pt-16 md:pb-12">
          <span
            className={cn(
              "flex size-16 items-center justify-center rounded-pill md:size-20",
              cancelled ? "bg-tint-salmon" : "bg-mint",
            )}
          >
            <HeroIcon className={cn("size-8 md:size-9", cancelled ? "text-error" : "text-primary")} aria-hidden />
          </span>
          <h1 className="type-checkout font-display font-bold text-balance text-foreground">{hero.title}</h1>
          <p className="text-[17px] leading-[27px] text-muted-foreground md:text-lg">
            {hero.sub}
          </p>
        </div>

        <div className="flex w-full flex-col gap-8 px-4 pb-16 md:px-8 lg:flex-row lg:items-start lg:gap-12 lg:px-40 lg:pb-28">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
            {/* The hero says the status and the summary has the total, so only what is said nowhere else stays here. */}
            <InfoGrid
              rows={[
                { label: s.orderNumber, value: orderNumber },
                { label: s.paymentMethod, value: payment ? paymentMethodInfo[payment.method].name : "—" },
              ]}
            />

            <FulfilmentCard
              method={order.fulfilmentMethod}
              title={delivery ? t.fulfilment.localDelivery : t.fulfilment.pickup}
              lines={
                delivery
                  ? [formatAddress({ address: order.shippingAddress, city: order.shippingCity, postal: order.shippingPostal })]
                  : [settings.address, t.fulfilment.pickupHours(settings.opensAt, settings.closesAt)]
              }
            />

            {cancelled ? null : (
            <section
              aria-labelledby="whats-next"
              className="flex w-full flex-col gap-3.5 rounded-m bg-white p-6 inset-ring-1 inset-ring-border-subtle"
            >
              <h2 id="whats-next" className="font-display text-xl leading-[30px] font-bold text-foreground">
                {s.next}
              </h2>
              <ol className="flex flex-col gap-3.5">
                {next.map((step, i) => (
                  <li key={step.title} className="flex w-full items-center gap-3.5" aria-current={i + 1 === stage ? "step" : undefined}>
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-pill",
                        i + 1 === stage ? "bg-highlight" : i + 1 < stage ? "bg-mint" : "bg-oat",
                      )}
                    >
                      <step.icon className="size-[18px] text-foreground" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-[15px] leading-[23px] font-bold text-foreground">
                        {step.title}
                        <span className="sr-only"> ({i + 1 === stage ? s.stepState.current : i + 1 < stage ? s.stepState.done : s.stepState.upcoming})</span>
                      </span>
                      <span className="text-[13px] leading-5 text-muted-foreground">{step.sub}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>
            )}

            <div className="grid w-full gap-4 sm:grid-cols-2">
              <ButtonLink href={withOrderToken(`/orders/${orderNumber}`, token)}>
                {cancelled ? s.viewOrder : s.track}
              </ButtonLink>
              <ButtonLink href="/menu" variant="secondary">
                {s.continue}
              </ButtonLink>
            </div>
            <StoreContact
              label={t.fulfilment.contact}
              phone={settings.phone}
              email={settings.email}
              whatsappLabel={t.fulfilment.whatsapp}
              emailLabel={t.fulfilment.email}
            />
          </div>

          <SummaryToggle id="success-summary" labels={{ show: t.summary.show, hide: t.summary.hide }} total={formatRupiah(pay.amount)} className="lg:w-[440px] lg:shrink-0">
            <OrderSummary
              t={t.summary}
              lines={orderSummaryLines(order, locale)}
              itemCount={itemCount(order)}
              subtotal={order.subtotal}
              fulfilment={order.fulfilmentMethod}
              fee={order.deliveryFee}
              serviceFee={pay.serviceFee}
              total={pay.amount}
            />
          </SummaryToggle>
        </div>
      </main>
    </>
  );
}
