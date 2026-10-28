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
  Timer,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { FulfilmentCard, InfoGrid, StoreContact } from "@/components/checkout/order-info";
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
import { formatDate, formatDateTime, formatItemCount, formatRupiah } from "@/lib/format";
import { fulfilmentStatusInfo, paymentMethodInfo, paymentStatusInfo } from "@/lib/order-status";
import { formatAddress, getOrderForViewer, itemCount, orderDeadline, payable, shortMethodName, withOrderToken } from "@/lib/orders";
import { getStoreSettings } from "@/lib/settings";

export async function generateMetadata({ params }: PageProps<"/orders/[orderNumber]">): Promise<Metadata> {
  const { orderNumber } = await params;
  const t = await getMessages(ordersMessages);
  return { title: t.title(orderNumber), robots: { index: false } };
}

type StepState = "done" | "current" | "todo";

/** pen: Order detail (Csrk7). */
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
  // A payment that lapsed while the order is still open no longer says what the customer will pay.
  const pay = payable(order, payment?.status === "expired" ? null : payment);
  const f = order.fulfilmentStatus;

  // Progress: placed → payment → baking → out for delivery / ready → delivered / picked up.
  const rank = { pending: 0, baking: 1, out_for_delivery: 2, ready_for_pickup: 2, completed: 3, cancelled: -1 }[f];
  const steps: { label: string; state: StepState; icon: LucideIcon }[] = [
    { label: t.steps.placed, state: "done", icon: Check },
    { label: t.steps.payment, state: paid ? "done" : order.paymentStatus === "awaiting" ? "current" : "todo", icon: Wallet },
    { label: t.steps.baking, state: paid && rank > 1 ? "done" : paid && rank === 1 ? "current" : "todo", icon: Cookie },
    {
      label: delivery ? t.steps.out : t.steps.ready,
      state: paid && rank > 2 ? "done" : paid && rank === 2 ? "current" : "todo",
      icon: delivery ? Truck : ShoppingBag,
    },
    { label: delivery ? t.steps.delivered : t.steps.collected, state: paid && rank === 3 ? "done" : "todo", icon: Check },
  ];

  const badge = paid || f === "cancelled" ? fulfilmentStatusInfo[f] : paymentStatusInfo[order.paymentStatus];
  const meta = [
    t.placed(formatDate(order.createdAt, locale)),
    formatItemCount(itemCount(order), locale),
    delivery ? t.localDelivery : t.pickup,
    ...(methodName ? [paid ? t.paidWith(shortMethodName(methodName)) : t.payWith(shortMethodName(methodName))] : []),
  ].join(" · ");

  const payHref = withOrderToken(`/checkout/pay/${orderNumber}`, token);
  const statusCard =
    paid && payment?.paidAt
      ? {
          tone: "bg-mint",
          icon: CircleCheck,
          iconClass: "text-primary",
          title: t.paidTitle,
          body: t.paidBody(methodName, formatDateTime(payment.paidAt, locale)),
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
          }
        : order.paymentStatus === "expired"
          ? {
              tone: "bg-tint-salmon",
              icon: CircleX,
              iconClass: "text-error",
              title: t.expiredTitle,
              body: t.expiredBody(formatDateTime(orderDeadline(order), locale)),
            }
          : {
              tone: "bg-tint-salmon",
              icon: CircleX,
              iconClass: "text-error",
              title: t.cancelledTitle,
              body: t.cancelledBody,
            };

  const signedIn = Boolean(user);
  const crumbs = signedIn
    ? [
        { href: "/account", label: t.account },
        { href: "/account#order-history", label: t.history },
      ]
    : [{ href: "/", label: t.home }];

  return (
    <>
      <div className="flex w-full flex-col gap-4 px-4 pt-8 pb-6 md:px-8 lg:px-16 lg:pt-10 lg:pb-8">
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
        <div className="flex w-full flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[40px] leading-none font-bold tracking-[-1.5px] text-foreground sm:text-[56px]">
              {t.title(orderNumber)}
            </h1>
            <p className="text-base leading-6 text-muted-foreground">{meta}</p>
          </div>
          <StatusBadge tone={badge.tone} className="shrink-0">
            {badge[locale]}
          </StatusBadge>
        </div>
      </div>

      <div className="w-full px-4 pb-8 md:px-8 lg:px-16 lg:pb-10">
        <ol
          aria-label={t.progress}
          className="flex w-full flex-col items-start gap-2 rounded-m bg-card px-6 py-5 lg:flex-row lg:items-center lg:gap-3 lg:px-7 lg:py-6"
        >
          {steps.map((step, i) => (
            <li
              key={step.label}
              className={cn("flex flex-col items-start gap-2 lg:flex-row lg:items-center lg:gap-3", i > 0 && "lg:flex-auto")}
              aria-current={step.state === "current" ? "step" : undefined}
            >
              {i > 0 ? (
                <span
                  className={cn(
                    "ml-[15px] h-4 w-0.5 lg:ml-0 lg:h-0.5 lg:w-auto lg:flex-1",
                    step.state === "todo" ? "bg-border-divider" : "bg-primary",
                  )}
                  aria-hidden
                />
              ) : null}
              <span className="flex items-center gap-2.5">
                <StepDot state={step.state} icon={step.icon} />
                <span
                  className={cn(
                    "text-sm leading-[21px] font-bold whitespace-nowrap",
                    step.state === "todo" ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {step.label}
                  <span className="sr-only">
                    {step.state === "done" ? ` (${t.stepDone})` : step.state === "current" ? ` (${t.stepCurrent})` : ""}
                  </span>
                </span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex w-full flex-col gap-8 px-4 pb-16 md:px-8 lg:flex-row lg:items-start lg:gap-12 lg:px-16 lg:pb-28">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
          <div className={cn("flex w-full items-center gap-4 rounded-m px-6 py-5", statusCard.tone)}>
            <statusCard.icon className={cn("size-6 shrink-0", statusCard.iconClass)} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-base leading-6 font-bold text-foreground">{statusCard.title}</p>
              <p className="text-sm leading-[21px] text-muted-foreground">{statusCard.body}</p>
            </div>
            {order.paymentStatus === "awaiting" ? (
              <ArrowLink href={payHref} className="shrink-0">
                {t.completePayment}
              </ArrowLink>
            ) : null}
          </div>

          <InfoGrid
            rows={[
              { label: ct.success.orderNumber, value: orderNumber },
              {
                label: ct.success.paymentStatus,
                value: (
                  <StatusBadge tone={paymentStatusInfo[order.paymentStatus].tone}>
                    {paymentStatusInfo[order.paymentStatus][locale]}
                  </StatusBadge>
                ),
              },
              { label: ct.success.paymentMethod, value: methodName || "—" },
              { label: ct.success.orderTotal, value: formatRupiah(pay.amount) },
            ]}
          />

          <FulfilmentCard
            method={order.fulfilmentMethod}
            title={delivery ? ct.fulfilment.localDelivery : ct.fulfilment.pickup}
            lines={
              delivery
                ? [formatAddress({ address: order.shippingAddress, city: order.shippingCity, postal: order.shippingPostal })]
                : [settings.address, ct.fulfilment.pickupHours(settings.opensAt, settings.closesAt)]
            }
          />

          <div className="grid w-full items-start gap-4 sm:grid-cols-2">
            <ReorderButton
              orderNumber={orderNumber}
              token={token}
              label={t.orderAgain}
              pendingLabel={t.reordering}
              failedLabel={t.reorderFailed}
            />
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

        <OrderSummary
          t={ct.summary}
          lines={orderSummaryLines(order, locale)}
          itemCount={itemCount(order)}
          subtotal={order.subtotal}
          fulfilment={order.fulfilmentMethod}
          fee={order.deliveryFee}
          serviceFee={pay.serviceFee}
          total={pay.amount}
          className="lg:w-[440px] lg:shrink-0"
        />
      </div>
    </>
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
