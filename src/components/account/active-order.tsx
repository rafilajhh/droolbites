import Image from "next/image";
import { ArrowLink, ButtonLink } from "@/components/ui/button";
import { photoFrame } from "@/components/ui/snapshot";
import { getLocale, getMessages } from "@/i18n/server";
import { accountMessages } from "@/i18n/messages/account";
import { cn } from "@/lib/cn";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/format";
import { getAccountOrders, itemNames, type AccountOrder } from "./account-orders";

type StepState = "done" | "current" | "todo";

/**
 * The order in progress, first on the account page: what is happening now in one line, a five-step
 * bar (paid → confirmed → baking → on its way / ready → delivered / picked up) and the one action that
 * moves it on: pay while it's unpaid, otherwise follow it.
 */
export async function ActiveOrder({ userId }: { userId: bigint }) {
  const [orders, t, locale] = await Promise.all([getAccountOrders(userId), getMessages(accountMessages), getLocale()]);
  const active = orders.filter((o) => o.bucket === "active");
  const order = active[0];
  if (!order) return null;
  const a = t.active;
  const o = t.orders;
  const delivery = order.fulfilmentMethod === "delivery";
  const f = order.fulfilmentStatus;
  const unpaid = order.bucket === "active" && order.paymentStatus === "awaiting";

  // Where it is now: 0 paying, 1 waiting for the shop, 2 baking, 3 on its way / ready.
  const at = unpaid ? 0 : f === "pending" ? 1 : f === "baking" ? 2 : 3;
  const labels = [
    a.steps.payment,
    a.steps.confirmed,
    a.steps.baking,
    delivery ? a.steps.out : a.steps.ready,
    delivery ? a.steps.delivered : a.steps.collected,
  ];
  const steps = labels.map((label, i) => ({ label, state: (i < at ? "done" : i === at ? "current" : "todo") as StepState }));

  const now = statusLine(order, a, locale);
  const names = itemNames(order);
  const href = `/orders/${order.orderNumber}`;

  return (
    <section aria-labelledby="active-order-title" className="flex w-full flex-col gap-6 rounded-m bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2
          id="active-order-title"
          className="font-display text-[24px] leading-[28px] font-bold tracking-[-0.5px] text-foreground lg:text-[28px] lg:leading-[31px]"
        >
          {a.title}
        </h2>
        {active.length > 1 ? <ArrowLink href="/account?status=active#order-history">{a.more(active.length - 1)}</ArrowLink> : null}
      </div>

      <div className="flex w-full items-start gap-4 sm:gap-5">
        <div className={cn(photoFrame, "size-16 shrink-0 rounded-sm bg-white sm:size-20")}>
          {order.imageUrl ? <Image src={order.imageUrl} alt="" fill sizes="80px" quality={100} className="object-cover" /> : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="font-mono text-[13px] leading-[17px] font-semibold text-muted-foreground">
            {order.orderNumber} · {formatDate(order.createdAt, locale)}
            <span className="max-sm:hidden"> · {delivery ? o.delivery : o.pickup}</span>
          </p>
          <p className="font-display text-[22px] leading-[26px] font-bold text-balance text-foreground sm:text-[24px] sm:leading-[29px]">
            {now.title}
          </p>
          <p className="text-[15px] leading-[23px] text-muted-foreground">{now.sub}</p>
        </div>
      </div>

      <ol aria-label={a.progress} className="grid w-full grid-cols-5 gap-1.5 sm:gap-2">
        {steps.map((step) => (
          <li key={step.label} aria-current={step.state === "current" ? "step" : undefined} className="flex min-w-0 flex-col gap-2">
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-full rounded-pill",
                step.state === "done" ? "bg-primary" : step.state === "current" ? "bg-highlight" : "bg-border-divider",
              )}
            />
            {/* Below sm the headline above says where the order is; the labels stay for screen readers. */}
            <span
              className={cn(
                "truncate text-[13px] leading-[18px] max-sm:sr-only",
                step.state === "todo" ? "text-muted-foreground" : "font-semibold text-foreground",
              )}
            >
              {step.label}
              <span className="sr-only">
                {step.state === "done" ? ` (${a.stepDone})` : step.state === "current" ? ` (${a.stepCurrent})` : ""}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex w-full flex-col gap-4 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-[15px] leading-[23px] text-foreground">{names.join(", ")}</p>
          <p className="font-display text-xl leading-6 font-bold text-foreground">{formatRupiah(order.total)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          {unpaid ? (
            <>
              <ArrowLink href={href} className="max-sm:order-last">
                {a.details}
              </ArrowLink>
              <ButtonLink href={`/checkout/pay/${order.orderNumber}`} className="max-sm:w-full">
                {a.pay}
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href={href} className="max-sm:w-full">
              {a.track}
            </ButtonLink>
          )}
        </div>
      </div>
    </section>
  );
}

type ActiveMessages = (typeof accountMessages)["en"]["active"];

/** The headline and the line under it for where the order is now. */
function statusLine(order: AccountOrder, a: ActiveMessages, locale: Parameters<typeof formatDateTime>[1]) {
  const delivery = order.fulfilmentMethod === "delivery";
  if (order.paymentStatus === "awaiting") return { title: a.awaiting.title, sub: a.awaiting.sub(formatDateTime(order.payBy, locale)) };
  switch (order.fulfilmentStatus) {
    case "pending":
      return a.confirming;
    case "baking":
      return { title: a.baking.title, sub: delivery ? a.baking.subDelivery : a.baking.subPickup };
    case "out_for_delivery":
      return { title: a.out.title, sub: a.out.sub(order.shippingAddress ?? "") };
    default:
      return a.ready;
  }
}
