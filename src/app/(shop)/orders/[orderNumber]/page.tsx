import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Check,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleX,
  Cookie,
  ShoppingBag,
  Store,
  Timer,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { StoreContact } from "@/components/checkout/order-info";
import { OrderSummary } from "@/components/checkout/order-summary";
import { ReorderButton } from "@/components/checkout/reorder-button";
import { orderSummaryLines } from "@/components/checkout/summary-lines";
import { StatusBadge } from "@/components/ui/badges";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
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
import {
  cancelledByStore,
  formatAddress,
  getOrderForViewer,
  itemCount,
  orderDeadline,
  payable,
  shortMethodName,
  withOrderToken,
} from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/orders/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await params;
  const t = await getMessages(ordersMessages);
  return { title: t.title(orderNumber), robots: { index: false } };
}

type StepState = "done" | "current" | "todo" | "cancelled";

/**
 * Customer order detail, laid out like the account area: header over a hairline, the order's state as
 * the one highlighted (oat) surface, its details as a flat hairline list, the summary beside it.
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
  const payment = order.payments.find((p) => p.status === "paid") ?? order.payments[0];
  const methodName = payment ? paymentMethodInfo[payment.method].name : "";
  const paid = order.paymentStatus === "paid";
  // Money can arrive after a store cancel; the order stays unpaid but the customer is owed a refund (admin: "Refund needed").
  const paidSomething = paid || order.payments.some((p) => p.status === "paid");
  // What the customer paid, not what the order recorded: a late payment still reads Paid.
  const customerPaymentStatus = paidSomething ? "paid" : order.paymentStatus;
  // A payment that lapsed while the order is still open no longer says what the customer will pay.
  const pay = payable(order, payment?.status === "expired" ? null : payment);
  const f = order.fulfilmentStatus;
  // Paid, but the shop hasn't accepted (or declined) it yet.
  const confirming = paid && f === "pending";

  // Progress, the same five steps as the account page's bar: payment → confirmed by the shop → baking →
  // out for delivery / ready → delivered / picked up.
  const rank = {
    pending: 0,
    baking: 1,
    out_for_delivery: 2,
    ready_for_pickup: 2,
    completed: 3,
    cancelled: -1,
  }[f];
  // A cancelled order ends at a Cancelled step; the steps it will never reach are left out.
  const steps: { label: string; state: StepState; icon: LucideIcon }[] =
    f === "cancelled"
      ? [
          ...(paidSomething ? [{ label: t.steps.payment, state: "done" as const, icon: Wallet }] : []),
          { label: t.steps.cancelled, state: "cancelled", icon: CircleX },
        ]
      : [
          {
            label: t.steps.payment,
            state: paid ? "done" : order.paymentStatus === "awaiting" ? "current" : "todo",
            icon: Wallet,
          },
          {
            label: t.steps.confirmed,
            state: confirming ? "current" : paid && rank >= 1 ? "done" : "todo",
            icon: Store,
          },
          {
            label: t.steps.baking,
            state: paid && rank > 1 ? "done" : paid && rank === 1 ? "current" : "todo",
            icon: Cookie,
          },
          {
            label: delivery ? t.steps.out : t.steps.ready,
            state: paid && rank > 2 ? "done" : paid && rank === 2 ? "current" : "todo",
            icon: delivery ? Truck : ShoppingBag,
          },
          {
            label: delivery ? t.steps.delivered : t.steps.collected,
            state: paid && rank === 3 ? "done" : "todo",
            icon: Check,
          },
        ];

  const badge = confirming
    ? awaitingConfirmationInfo
    : paid || f === "cancelled"
      ? fulfilmentStatusInfo[f]
      : paymentStatusInfo[order.paymentStatus];
  // The shop's reason when it declined the order (a preset, or its own words).
  const declinedWhy = f === "cancelled" ? cancelReasonText(order.cancelReason, t.reasons) : null;
  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  // A store cancel wins over the payment state: paid or not, the order won't be made.
  const statusCard =
    cancelledByStore(order) || (f === "cancelled" && paidSomething)
      ? {
          tone: "bg-tint-salmon",
          icon: CircleX,
          iconClass: "text-error",
          title: t.cancelledTitle,
          body:
            declinedWhy && paidSomething
              ? t.declinedBody(declinedWhy)
              : paidSomething
                ? t.cancelledPaidBody
                : t.cancelledBody,
          saysMethod: false,
          saysPayment: paidSomething,
        }
      : paid && payment?.paidAt
        ? confirming
          ? {
              tone: "bg-tint-mustard",
              icon: Store,
              iconClass: "text-foreground",
              title: t.confirmingTitle,
              body: t.confirmingBody(methodName, formatDateTime(payment.paidAt, locale)),
              saysMethod: true,
              saysPayment: true,
            }
          : {
              tone: "bg-mint",
              icon: CircleCheck,
              iconClass: "text-primary",
              title: f === "baking" ? t.acceptedTitle : t.paidTitle,
              body: (f === "baking" ? t.acceptedBody : t.paidBody)(methodName, formatDateTime(payment.paidAt, locale)),
              saysMethod: true,
              saysPayment: true,
            }
        : order.paymentStatus === "awaiting"
          ? {
              tone: "bg-tint-mustard",
              icon: Timer,
              iconClass: "text-foreground",
              title: t.awaitingTitle,
              body:
                payment?.status === "awaiting"
                  ? t.awaitingBody(methodName, formatDateTime(payment.expiresAt ?? orderDeadline(order), locale))
                  : t.awaitingChoose(formatDateTime(orderDeadline(order), locale)),
              saysMethod: payment?.status === "awaiting",
              saysPayment: true,
            }
          : order.paymentStatus === "expired"
            ? {
                tone: "bg-tint-salmon",
                icon: CircleX,
                iconClass: "text-error",
                title: t.expiredTitle,
                body: t.expiredBody(formatDateTime(orderDeadline(order), locale)),
                saysMethod: false,
                saysPayment: true,
              }
            : {
                tone: "bg-tint-salmon",
                icon: CircleX,
                iconClass: "text-error",
                title: t.cancelledTitle,
                body: t.cancelledBody,
                saysMethod: false,
                saysPayment: false,
              };

  // The status card already names the method in most states; the sub line only adds it when it doesn't.
  const meta = [
    t.placed(formatDate(order.createdAt, locale)),
    formatItemCount(itemCount(order), locale),
    delivery ? t.localDelivery : t.pickup,
    ...(methodName && !statusCard.saysMethod
      ? [paidSomething ? t.paidWith(shortMethodName(methodName)) : t.payWith(shortMethodName(methodName))]
      : []),
  ].join(" · ");

  const signedIn = Boolean(user);
  const crumbs = signedIn
    ? [
        { href: "/account", label: t.account },
        { href: "/account#order-history", label: t.history },
      ]
    : [{ href: "/", label: t.home }];

  // Only what the header, the status card and the summary don't already say: where it goes (or where to
  // collect it) and, when the card is silent about it, the payment status.
  const details: { label: string; value: React.ReactNode }[] = [
    {
      label: delivery ? ct.fulfilment.localDelivery : ct.fulfilment.pickup,
      value: (
        <span className="flex flex-col">
          {(delivery
            ? [
                formatAddress({
                  address: order.shippingAddress,
                  city: order.shippingCity,
                  postal: order.shippingPostal,
                }),
              ]
            : [settings.address, ct.fulfilment.pickupHours(settings.opensAt, settings.closesAt)]
          ).map((line) => (
            <span key={line} className="break-words">
              {line}
            </span>
          ))}
        </span>
      ),
    },
    ...(statusCard.saysPayment
      ? []
      : [
          {
            label: ct.success.paymentStatus,
            value: (
              <StatusBadge tone={paymentStatusInfo[customerPaymentStatus].tone}>
                {paymentStatusInfo[customerPaymentStatus][locale]}
              </StatusBadge>
            ),
          },
        ]),
  ];
  const completed = f === "completed";

  return (
    <div className="flex w-full flex-col gap-8 px-4 pt-8 pb-16 md:px-8 lg:gap-10 lg:px-16 lg:pt-12 lg:pb-28">
      <div className="flex w-full flex-col gap-4">
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
        <div className="flex w-full flex-col items-start gap-4 pb-6 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:flex-row sm:items-end sm:justify-between lg:pb-8">
          <div className="flex flex-col gap-2">
            <h1 className="font-display type-page font-bold text-foreground">{t.title(orderNumber)}</h1>
            <p className="text-base leading-6 text-muted-foreground">{meta}</p>
          </div>
          <StatusBadge tone={badge.tone} className="shrink-0">
            {badge[locale]}
          </StatusBadge>
        </div>
      </div>

      {/* Left: where the order is (the one highlighted surface), its details flat on the page, then the
          actions. Right: the order summary, also flat, kept in view from lg. Below lg the summary comes
          before the actions and contact line, so the items are read before "what next". */}
      <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:gap-y-8 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex min-w-0 flex-col gap-8 lg:col-start-1 lg:row-start-1">
          <section
            aria-labelledby="order-status-title"
            className="flex w-full flex-col gap-6 rounded-m bg-card p-5 sm:p-7"
          >
            <div className="flex w-full flex-wrap items-start gap-x-4 gap-y-3">
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-pill", statusCard.tone)}>
                <statusCard.icon className={cn("size-5", statusCard.iconClass)} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 basis-[240px] flex-col gap-1">
                <h2
                  id="order-status-title"
                  className="font-display text-[22px] leading-[26px] font-bold text-balance text-foreground sm:text-[24px] sm:leading-[29px]"
                >
                  {statusCard.title}
                </h2>
                <p className="text-[15px] leading-[23px] text-muted-foreground">{statusCard.body}</p>
              </div>
              {order.paymentStatus === "awaiting" ? (
                <ArrowLink href={payHref} className="shrink-0 self-center max-sm:ml-14">
                  {t.completePayment}
                </ArrowLink>
              ) : null}
            </div>

            {/* Below sm a vertical list; from sm one row of equal columns, each dot joined to the next. A lone
              Cancelled dot says nothing the card above doesn't, so a one-step list is left out. */}
            {steps.length > 1 ? (
              <ol
                aria-label={t.progress}
                className="grid w-full gap-3 pt-6 shadow-[inset_0_1px_0_var(--border-divider)] sm:auto-cols-fr sm:grid-flow-col sm:gap-0"
              >
                {steps.map((step, i) => {
                  const next = steps[i + 1];
                  return (
                    <li
                      key={step.label}
                      className="flex min-w-0 items-center gap-3 sm:flex-col sm:items-start sm:gap-2.5"
                      aria-current={step.state === "current" || step.state === "cancelled" ? "step" : undefined}
                    >
                      <span className="flex items-center sm:w-full">
                        <StepDot state={step.state} icon={step.icon} />
                        {next ? (
                          <span
                            aria-hidden
                            className={cn(
                              "mx-2 hidden h-0.5 flex-1 rounded-pill sm:block",
                              next.state === "todo" || next.state === "cancelled" ? "bg-border-divider" : "bg-primary",
                            )}
                          />
                        ) : null}
                      </span>
                      <span
                        className={cn(
                          "text-sm leading-[18px] font-bold sm:pr-2",
                          step.state === "todo" ? "text-muted-foreground" : "text-foreground",
                        )}
                      >
                        {step.label}
                        <span className="sr-only">
                          {step.state === "done"
                            ? ` (${t.stepDone})`
                            : step.state === "current"
                              ? ` (${t.stepCurrent})`
                              : ""}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            ) : null}
          </section>

          <dl className="flex w-full flex-col">
            {details.map((row) => (
              <div
                key={row.label}
                className="flex w-full items-start justify-between gap-6 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] first:pt-0"
              >
                <dt className="shrink-0 text-[15px] leading-[23px] text-muted-foreground">{row.label}</dt>
                <dd className="min-w-0 text-right text-[15px] leading-[23px] font-bold text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
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
        <div className="flex w-full min-w-0 flex-col gap-4 self-start lg:col-start-1 lg:row-start-2">
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

function StepDot({ state, icon: Icon }: { state: StepState; icon: LucideIcon }) {
  if (state === "done") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-primary text-primary-foreground">
        <Check className="size-4" aria-hidden />
      </span>
    );
  }
  if (state === "cancelled") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-tint-salmon text-error">
        <Icon className="size-4" aria-hidden />
      </span>
    );
  }
  if (state === "current") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-highlight text-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-pill bg-white text-muted-foreground inset-ring-1 inset-ring-border-subtle">
      <Circle className="size-4" aria-hidden />
    </span>
  );
}
