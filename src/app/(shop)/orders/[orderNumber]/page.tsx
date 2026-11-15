import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CircleX } from "lucide-react";
import { ReviewRows } from "@/components/checkout/checkout-section";
import { StoreContact } from "@/components/checkout/order-info";
import { OrderSummary } from "@/components/checkout/order-summary";
import { ReorderButton } from "@/components/checkout/reorder-button";
import { orderSummaryLines } from "@/components/checkout/summary-lines";
import { StatusBadge } from "@/components/ui/badges";
import { ButtonLink } from "@/components/ui/button";
import { OrderSteps, type OrderStep } from "@/components/ui/order-steps";
import { getLocale, getMessages } from "@/i18n/server";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { ordersMessages } from "@/i18n/messages/orders";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatItemCount } from "@/lib/format";
import {
  awaitingConfirmationInfo,
  cancelReasonText,
  fulfilmentStatusInfo,
  paymentMethodInfo,
  paymentStatusInfo,
} from "@/lib/order-status";
import { cancelledByStore, getOrderForViewer, itemCount, orderAddress, orderDeadline, payable, withOrderToken } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/orders/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await params;
  const t = await getMessages(ordersMessages);
  return { title: t.title(orderNumber), robots: { index: false } };
}

/**
 * Customer order tracking. Each fact once: the header has the number, date and status badge; one oat
 * card has the progress bar (the account page's five steps) and one sentence on where the order is now,
 * with Pay now while it's unpaid; then delivery (or pickup) and payment as plain label/value rows; the
 * items and totals in the summary beside it, sticky from lg.
 */
export default async function OrderDetailPage({ params, searchParams }: PageProps<"/orders/[orderNumber]">) {
  const { orderNumber } = await params;
  const query = await searchParams;
  const token = typeof query.t === "string" ? query.t : "";

  const order = await getOrderForViewer(orderNumber, token);
  if (!order) notFound();

  const [t, ct, locale, settings, user] = await Promise.all([
    getMessages(ordersMessages),
    getMessages(checkoutMessages),
    getLocale(),
    getStoreSettings(),
    getCurrentUser(),
  ]);
  const delivery = order.fulfilmentMethod === "delivery";
  const paidPayment = order.payments.find((p) => p.status === "paid");
  const payment = paidPayment ?? order.payments[0];
  const paid = order.paymentStatus === "paid";
  // Money can arrive after a store cancel; the order stays unpaid but the customer is owed a refund (admin: "Refund needed").
  const paidSomething = paid || Boolean(paidPayment);
  // A payment that lapsed while the order is still open no longer says what the customer will pay.
  const pay = payable(order, payment?.status === "expired" ? null : payment);
  const f = order.fulfilmentStatus;
  const awaiting = order.paymentStatus === "awaiting";
  const confirming = paid && f === "pending";
  const completed = f === "completed";

  // The order is closed (no bar): cancelled by the store, cancelled after a payment, or never paid in time.
  const declinedWhy = f === "cancelled" ? cancelReasonText(order.cancelReason, t.reasons) : null;
  const closed = cancelledByStore(order) || f === "cancelled" || (!paid && !awaiting);
  const deadline = payment?.status === "awaiting" ? (payment.expiresAt ?? orderDeadline(order)) : orderDeadline(order);
  const message = closed
    ? f === "cancelled" || cancelledByStore(order)
      ? declinedWhy && paidSomething
        ? t.declinedBody(declinedWhy)
        : paidSomething
          ? t.cancelledPaidBody
          : t.cancelledBody
      : order.paymentStatus === "expired"
        ? t.expiredBody(formatDateTime(orderDeadline(order), locale))
        : t.cancelledBody
    : awaiting
      ? t.now.awaiting(formatDateTime(deadline, locale))
      : f === "pending"
        ? t.now.confirming
        : f === "baking"
          ? delivery
            ? t.now.bakingDelivery
            : t.now.bakingPickup
          : f === "out_for_delivery"
            ? t.now.out
            : f === "ready_for_pickup"
              ? t.now.ready
              : delivery
                ? t.now.delivered
                : t.now.collected;

  // Five steps, as on the account page: 0 paying, 1 waiting for the shop, 2 baking, 3 on its way / ready,
  // 4 delivered / picked up; a completed order has them all done.
  const at = awaiting ? 0 : f === "pending" ? 1 : f === "baking" ? 2 : completed ? 5 : 3;
  const steps = [
    t.steps.payment,
    t.steps.confirmed,
    t.steps.baking,
    delivery ? t.steps.out : t.steps.ready,
    delivery ? t.steps.delivered : t.steps.collected,
  ].map((label, i): OrderStep => ({ label, state: i < at ? "done" : i === at ? "current" : "todo" }));

  const badge = confirming
    ? awaitingConfirmationInfo
    : paid || f === "cancelled"
      ? fulfilmentStatusInfo[f]
      : paymentStatusInfo[order.paymentStatus];
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);

  const signedIn = Boolean(user);
  const crumbs = signedIn
    ? [
        { href: "/account", label: t.account },
        { href: "/account#order-history", label: t.history },
      ]
    : [{ href: "/", label: t.home }];

  // Where the order goes (or where to collect it), one row per fact.
  const fulfilmentRows = delivery
    ? [
        { label: ct.payment.deliverTo, value: orderAddress(order) },
        // Orders placed before recipients were recorded have none; the contact is the recipient then.
        ...(order.recipientName
          ? [{ label: ct.details.recipient, value: [order.recipientName, order.recipientPhone].filter(Boolean).join(" · ") }]
          : []),
        ...(order.deliveryNote ? [{ label: t.courierNote, value: order.deliveryNote }] : []),
      ]
    : [
        {
          label: ct.payment.pickupAt,
          value: (
            <>
              {settings.address}
              <span className="block font-normal text-muted-foreground">
                {ct.fulfilment.pickupHours(settings.opensAt, settings.closesAt)}
              </span>
            </>
          ),
        },
      ];
  // A lapsed attempt on an order that is still open says nothing about how it will be paid.
  const methodName = payment && !(awaiting && payment.status !== "awaiting") ? paymentMethodInfo[payment.method].name : t.notChosen;
  const paymentRows = [
    { label: t.method, value: methodName },
    {
      label: t.status,
      value: paidPayment?.paidAt ? t.paidOn(formatDateTime(paidPayment.paidAt, locale)) : awaiting ? t.notPaidYet : t.notPaid,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-8 px-4 pt-8 pb-16 md:px-8 lg:gap-10 lg:px-16 lg:pt-12 lg:pb-28">
      <div className="flex w-full flex-col gap-4 pb-6 shadow-[inset_0_-1px_0_var(--border-subtle)] lg:pb-8">
        <nav aria-label={t.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-2 text-sm leading-[21px] font-medium text-muted-foreground">
            {crumbs.map((c) => (
              <li key={c.href} className="flex items-center gap-2">
                <Link href={c.href} className="hover:text-foreground">
                  {c.label}
                </Link>
                <ChevronRight className="size-3.5" aria-hidden />
              </li>
            ))}
            <li aria-current="page" className="font-bold text-foreground">
              {orderNumber}
            </li>
          </ol>
        </nav>
        <div className="flex flex-col items-start gap-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <h1 className="font-display type-page font-bold text-foreground">{t.title(orderNumber)}</h1>
            <StatusBadge tone={badge.tone} className="shrink-0">
              {badge[locale]}
            </StatusBadge>
          </div>
          <p className="text-base leading-6 text-muted-foreground">
            {t.placed(formatDate(order.createdAt, locale))} · {formatItemCount(itemCount(order), locale)}
          </p>
        </div>
      </div>

      {/* Left: progress, then the details flat on the page, then the actions. Right: the summary, kept in
          view from lg. Below lg the summary comes before the actions, so the items are read before "what next". */}
      <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-8 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <section aria-labelledby="order-progress" className="flex w-full flex-col gap-5 rounded-m bg-card p-5 sm:p-7">
            <h2 id="order-progress" className="sr-only">
              {t.progress}
            </h2>
            {closed ? null : (
              <OrderSteps steps={steps} doneLabel={t.stepDone} currentLabel={t.stepCurrent} />
            )}
            <div
              className={cn(
                "flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6",
                !closed && "pt-5 shadow-[inset_0_1px_0_var(--border-divider)]",
              )}
            >
              <p className="flex min-w-0 items-start gap-3 text-base leading-6 text-pretty text-foreground">
                {closed ? <CircleX className="mt-0.5 size-5 shrink-0 text-error" aria-hidden /> : null}
                <span>{message}</span>
              </p>
              {awaiting ? (
                <ButtonLink href={payHref} className="shrink-0 max-sm:w-full">
                  {t.payNow}
                </ButtonLink>
              ) : null}
            </div>
          </section>

          <section aria-labelledby="order-fulfilment" className="flex w-full flex-col gap-3">
            <h2 id="order-fulfilment" className="font-display text-xl leading-7 font-bold text-foreground sm:text-[22px]">
              {delivery ? t.localDelivery : t.pickup}
            </h2>
            <ReviewRows rows={fulfilmentRows} />
          </section>

          <section aria-labelledby="order-payment" className="flex w-full flex-col gap-3">
            <h2 id="order-payment" className="font-display text-xl leading-7 font-bold text-foreground sm:text-[22px]">
              {t.payment}
            </h2>
            <ReviewRows rows={paymentRows} />
          </section>
        </div>

        <OrderSummary
          t={ct.summary}
          lines={orderSummaryLines(order, locale)}
          itemCount={itemCount(order)}
          subtotal={order.subtotal}
          fulfilment={order.fulfilmentMethod}
          fee={order.deliveryFee}
          serviceFee={pay.serviceFee}
          total={pay.amount}
          className="self-start rounded-none bg-transparent p-0 sm:p-0 lg:sticky lg:top-[88px] lg:col-start-2 lg:row-span-2 lg:row-start-1"
        />

        {/* Order again only once the order is done (as in the order history); until then the way on is the history. */}
        <div className="flex w-full min-w-0 flex-col gap-4 self-start pt-8 shadow-[inset_0_1px_0_var(--border-subtle)] lg:col-start-1 lg:row-start-2">
          <div className="grid w-full items-start gap-4 sm:grid-cols-2">
            {completed ? (
              <ReorderButton
                orderNumber={orderNumber}
                token={token}
                label={t.orderAgain}
                pendingLabel={t.reordering}
                failedLabel={t.reorderFailed}
              />
            ) : null}
            <ButtonLink href={signedIn ? "/account#order-history" : "/menu"} variant="secondary">
              {signedIn ? t.viewHistory : t.continueShopping}
            </ButtonLink>
          </div>
          <StoreContact
            label={ct.fulfilment.contact}
            phone={settings.phone}
            email={settings.email}
            whatsappLabel={ct.fulfilment.whatsapp}
            emailLabel={ct.fulfilment.email}
          />
        </div>
      </div>
    </div>
  );
}
