"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { placeOrder, type PlaceOrderState } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { paymentMethodInfo } from "@/lib/order-status";
import { OrderSummary, type SummaryLine } from "./order-summary";
import { PaymentMethodGroups, type PaymentLogos } from "./payment-methods";
import { SummaryToggle } from "./summary-toggle";

const initialState: PlaceOrderState = { attempt: 0 };

/** pen: Checkout · Payment (D75ET6). One form spans both columns so the PAY button submits the chosen method. */
export function PaymentForm({
  review,
  methods,
  logos,
  defaultMethod,
  summary,
}: {
  review: { email: string; fulfilment: "delivery" | "pickup"; address: string; fee: number };
  methods: PaymentMethod[];
  logos: PaymentLogos;
  defaultMethod: PaymentMethod | null;
  summary: { lines: SummaryLine[]; itemCount: number; subtotal: number; total: number };
}) {
  const t = useMessages(checkoutMessages);
  const p = t.payment;
  const [state, formAction, pending] = useActionState(placeOrder, initialState);
  const [method, setMethod] = useState<PaymentMethod | null>(defaultMethod);
  // Picking another method answers a "choose a method" error, so that attempt's error goes away.
  const [answeredAttempt, setAnsweredAttempt] = useState(0);
  const chooseMethod = (next: PaymentMethod) => {
    setMethod(next);
    setAnsweredAttempt(state.attempt);
  };
  const methodError = state.error === "payment" || state.error === "paymentUnavailable";
  const error = methodError && answeredAttempt === state.attempt ? undefined : state.error;
  // The error renders twice (in the mobile PAY bar and in the desktop card); CSS shows one,
  // so only that copy is announced. Focus whichever copy is on screen.
  const mobileErrorRef = useRef<HTMLParagraphElement>(null);
  const desktopErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!state.error) return;
    const visible = [mobileErrorRef.current, desktopErrorRef.current].find((el) => el && el.getClientRects().length > 0);
    visible?.focus();
  }, [state]);

  const errorText = error ? (
    <>
      {t.errors[error]}{" "}
      {error === "cartChanged" ? (
        <Link href="/menu" className="font-bold underline">
          {t.header.back}
        </Link>
      ) : null}
    </>
  ) : null;
  const errorClass = "rounded-sm bg-tint-salmon px-4 py-3 text-sm leading-normal text-foreground outline-hidden";

  const delivery = review.fulfilment === "delivery";
  // A long email wraps after the @, not in the middle of the domain.
  const at = review.email.lastIndexOf("@");
  const email =
    at > 0 ? (
      <>
        {review.email.slice(0, at + 1)}
        <wbr />
        {review.email.slice(at + 1)}
      </>
    ) : (
      review.email
    );
  const rows = [
    { label: p.contact, value: email },
    { label: delivery ? p.deliverTo : p.pickupAt, value: review.address },
    { label: p.method, value: delivery ? `${p.localDelivery} · ${formatRupiah(review.fee)}` : `${p.pickup} · ${p.free}` },
  ];

  return (
    <form
      action={formAction}
      className={cn(
        "flex w-full flex-col gap-8 px-4 pt-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 lg:grid lg:grid-cols-[minmax(0,1fr)_440px] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-12 lg:gap-y-4 lg:px-16 lg:pt-12 lg:pb-24",
        // Room for the error that joins the pinned PAY bar below lg.
        error && "pb-[calc(16rem+env(safe-area-inset-bottom))]",
      )}
    >
      {/* First in reading order: below lg a toggle bar above the methods; at lg the top of the right column. */}
      <SummaryToggle
        id="payment-summary"
        labels={t.summary}
        total={formatRupiah(summary.total)}
        className="lg:col-start-2 lg:row-start-1"
      >
        <OrderSummary
          t={t.summary}
          lines={summary.lines}
          itemCount={summary.itemCount}
          subtotal={summary.subtotal}
          fulfilment={review.fulfilment}
          fee={review.fee}
          total={summary.total}
        />
      </SummaryToggle>
      <div className="flex w-full min-w-0 flex-col gap-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
        <div className="flex flex-col gap-2 pb-3">
          <h1 className="type-checkout font-display font-bold text-foreground">{p.title}</h1>
          <p className="text-[17px] leading-[26px] text-muted-foreground">{p.sub}</p>
        </div>

        {/* One way back to the details step: every row here comes from it. */}
        <div className="flex w-full flex-col rounded-m bg-white px-5 pt-1 inset-ring-1 inset-ring-border-subtle sm:px-6">
          <dl className="flex w-full flex-col">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex w-full flex-col gap-1 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] sm:flex-row sm:items-baseline sm:gap-4"
              >
                <dt className="text-sm leading-[21px] text-muted-foreground sm:w-[110px] sm:shrink-0">{row.label}</dt>
                <dd className="min-w-0 flex-1 text-[15px] leading-[23px] font-semibold break-words text-foreground">{row.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex justify-end py-3.5">
            <Link
              href="/checkout"
              className="relative text-sm leading-[21px] font-bold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
            >
              {p.editDetails}
            </Link>
          </div>
        </div>

        {defaultMethod ? (
          <PaymentMethodGroups
            t={p}
            methods={methods}
            logos={logos}
            selected={method}
            onSelect={chooseMethod}
            leadMethod={defaultMethod}
          />
        ) : (
          <p className="rounded-m bg-white p-6 text-[15px] leading-normal text-muted-foreground inset-ring-1 inset-ring-border-subtle">
            {p.none}
          </p>
        )}
      </div>

      {/* Below lg the PAY button lives in a bar pinned to the bottom of the screen (the in-flow one is hidden),
          and a failed attempt's error sits right above it. */}
      <div
        data-pinned-bar
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] md:px-8 lg:hidden"
      >
        {errorText ? (
          <p ref={mobileErrorRef} tabIndex={-1} role="alert" className={errorClass}>
            {errorText}
          </p>
        ) : null}
        <div className="flex items-center gap-4">
          <p className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] leading-5 text-muted-foreground">{p.payingWith}</span>
            <span className="truncate text-sm leading-[21px] font-bold text-foreground">
              {method ? paymentMethodInfo[method].name : "—"}
            </span>
          </p>
          <Button type="submit" className="shrink-0 px-5" disabled={pending || !method}>
            {pending ? p.placing : p.pay(formatRupiah(summary.total))}
          </Button>
        </div>
      </div>

      {/* Desktop only: below lg the pinned bar holds the chosen method, the error and PAY. */}
      <div className="hidden w-full flex-col gap-3 rounded-m bg-white p-6 inset-ring-1 inset-ring-border-subtle lg:col-start-2 lg:row-start-2 lg:flex">
        <div className="flex w-full items-center justify-between gap-3 text-sm leading-[21px]">
          <span className="text-muted-foreground">{p.payingWith}</span>
          <span className="text-right font-bold text-foreground" aria-live="polite">
            {method ? paymentMethodInfo[method].name : "—"}
          </span>
        </div>
        {errorText ? (
          <p ref={desktopErrorRef} tabIndex={-1} role="alert" className={errorClass}>
            {errorText}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={pending || !method}>
          {pending ? p.placing : p.pay(formatRupiah(summary.total))}
        </Button>
      </div>
    </form>
  );
}
