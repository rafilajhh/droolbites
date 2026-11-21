import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CircleCheckBig, CircleX } from "lucide-react";
import { CheckoutHeader } from "@/components/checkout/checkout-header";
import { StoreContact } from "@/components/checkout/order-info";
import { CheckoutColumns, CheckoutHeading, ReviewRows } from "@/components/checkout/checkout-section";
import { OrderSummary } from "@/components/checkout/order-summary";
import { orderSummaryLines } from "@/components/checkout/summary-lines";
import { ButtonLink } from "@/components/ui/button";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { db } from "@/lib/db";
import { getOrderForViewer, itemCount, orderAddress, payable, withOrderToken } from "@/lib/orders";
import { paymentMethodInfo } from "@/lib/order-status";
import { orderPageMetadata } from "@/lib/order-metadata";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata({ params, searchParams }: PageProps<"/checkout/success/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await params;
  return orderPageMetadata(orderNumber, (await searchParams).t, async () => (await getMessages(checkoutMessages)).meta.success);
}

/**
 * Checkout · Done. One confirmation (icon, what is true now, one line on what happens), the order's facts
 * once (number, how it was paid, where it goes), then Track order / Back to menu. The summary is the receipt: beside the column from lg, after it below lg, never folded.
 */
export default async function SuccessPage({ params, searchParams }: PageProps<"/checkout/success/[orderNumber]">) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  const order = await getOrderForViewer(orderNumber, token);
  if (!order) notFound();
  if (order.paymentStatus !== "paid") redirect(withOrderToken(`/checkout/pay/${orderNumber}`, token));

  const [t, locale, settings, user] = await Promise.all([getMessages(checkoutMessages), getLocale(), getStoreSettings(), getCurrentUser()]);
  const s = t.success;
  // A guest without an account for this email is offered one, with the email filled in.
  const offerAccount =
    !user && order.userId === null && !(await db.user.findUnique({ where: { email: order.email }, select: { id: true } }));
  const delivery = order.fulfilmentMethod === "delivery";
  const payment = order.payments.find((pay) => pay.status === "paid") ?? order.payments[0];
  const pay = payable(order, payment);

  // Where the order is: 1 waiting for the shop, 2 baking, 3 on its way / ready, 4 finished, -1 cancelled.
  const f = order.fulfilmentStatus;
  const stage =
    f === "completed" ? 4 : f === "out_for_delivery" || f === "ready_for_pickup" ? 3 : f === "baking" ? 2 : f === "cancelled" ? -1 : 1;
  // The hero says what is true now, not only what was true at payment time.
  const cancelled = stage === -1;
  const hero = cancelled
    ? { title: s.titleCancelled, sub: s.subCancelled }
    : stage === 4
      ? { title: s.titleDone, sub: s.subDone }
      : stage === 3
        ? delivery
          ? { title: s.titleOut, sub: s.subOut }
          : { title: s.titleReady, sub: s.subReady }
        : stage === 2
          ? { title: s.title, sub: delivery ? s.subDelivery : s.subPickup }
          : { title: s.titleConfirming, sub: s.subConfirming };
  const HeroIcon = cancelled ? CircleX : CircleCheckBig;

  return (
    <>
      <CheckoutHeader step={4} />
      <main id="main" tabIndex={-1} className="flex w-full flex-1 flex-col outline-hidden">
        <CheckoutColumns
          summary={
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
          }
        >
          <div className="flex w-full flex-col gap-8">
            <CheckoutHeading
              lead={
                <span className={cn("mb-1 flex size-14 items-center justify-center rounded-pill", cancelled ? "bg-tint-salmon" : "bg-mint")}>
                  <HeroIcon className={cn("size-7", cancelled ? "text-error" : "text-primary")} aria-hidden />
                </span>
              }
              title={hero.title}
              sub={hero.sub}
            />

            {/* Each fact once: the summary has the items and the total, the hero the status. */}
            <ReviewRows
              rows={[
                { label: s.orderNumber, value: <span className="font-mono text-base leading-[23px] tracking-[0.5px]">{orderNumber}</span> },
                { label: s.paymentMethod, value: payment ? paymentMethodInfo[payment.method].name : "—" },
                {
                  label: delivery ? t.payment.deliverTo : t.payment.pickupAt,
                  value: delivery ? (
                    orderAddress(order)
                  ) : (
                    <>
                      {settings.address}
                      <span className="block font-normal text-muted-foreground">
                        {t.fulfilment.pickupHours(settings.opensAt, settings.closesAt)}
                      </span>
                    </>
                  ),
                },
              ]}
            />
            <p className="-mt-4 text-[15px] leading-normal break-words text-muted-foreground">{s.emailed(order.email)}</p>

            {/* The end of the column, under a hairline like the other steps. */}
            <div className="flex w-full flex-col gap-4 pt-8 shadow-[inset_0_1px_0_var(--border-subtle)]">
              <div className="grid w-full gap-4 sm:grid-cols-2">
                <ButtonLink href={withOrderToken(`/orders/${orderNumber}`, token)}>{cancelled ? s.viewOrder : s.track}</ButtonLink>
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

            {offerAccount ? (
              <div className="flex w-full flex-col gap-3 pt-8 shadow-[inset_0_1px_0_var(--border-subtle)] sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-lg leading-6 font-bold text-foreground">{s.saveTitle}</h2>
                  <p className="text-[15px] leading-normal text-pretty text-muted-foreground">{s.saveBody}</p>
                </div>
                <ButtonLink href={`/sign-up?email=${encodeURIComponent(order.email)}`} variant="secondary" className="shrink-0">
                  {s.saveCta}
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </CheckoutColumns>
      </main>
    </>
  );
}
