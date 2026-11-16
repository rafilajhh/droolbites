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
import { CheckoutColumns, CheckoutHeading, ReviewRows } from "./checkout-section";
import { OrderSummary, type SummaryLine } from "./order-summary";
import { PaymentMethodGroups, type PaymentLogos } from "./payment-methods";
import { SummaryToggle } from "./summary-toggle";

const initialState: PlaceOrderState = { attempt: 0 };

/** pen: Checkout · Payment (D75ET6), recomposed in code: the review rows, the methods and PAY in one column beside the sticky summary. */
export function PaymentForm({
  review,
  methods,
  logos,
  defaultMethod,
  summary,
}: {
  review: { email: string; fulfilment: "delivery" | "pickup"; address: string; distance: string | null; fee: number };
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
  // One copy of the error, in the PAY bar (pinned below lg, at the end of the column from lg).
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);

  const errorText = error ? (
    <>
      {t.errors[error]}{" "}
      {error === "stock" && state.short?.length ? (
        <>
          {state.short.map((item) => (item.left === 0 ? t.stock.soldOut(item.name) : t.stock.left(item.name, item.left))).join(", ")}.{" "}
        </>
      ) : null}
      {error === "cartChanged" ? (
        <Link href="/menu" className="font-bold underline">
          {t.header.back}
        </Link>
      ) : error === "stock" ? (
        // The menu opens the cart drawer, where those lines are marked.
        <Link href="/menu?cart=open" className="font-bold underline">
          {t.stock.fix}
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
    {
      label: p.method,
      value: delivery
        ? [p.localDelivery, review.distance, formatRupiah(review.fee)].filter(Boolean).join(" · ")
        : `${p.pickup} · ${p.free}`,
    },
  ];

  return (
    <CheckoutColumns
      summaryFirst
      // Below lg the PAY bar is pinned to the bottom of the screen (with a failed attempt's error above it).
      className={cn("pb-[calc(9rem+env(safe-area-inset-bottom))] lg:pb-24", error && "pb-[calc(16rem+env(safe-area-inset-bottom))]")}
      summary={
        <SummaryToggle id="payment-summary" labels={t.summary} total={formatRupiah(summary.total)}>
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
      }
    >
      <form action={formAction} className="flex w-full flex-col gap-8">
        {/* The delivery fee shown here; if the store's rates changed since, the order asks first. */}
        <input type="hidden" name="fee" value={review.fee} />
        <CheckoutHeading title={p.title} sub={p.sub} />

        {/* One way back to the details step: every row here comes from it. */}
        <div className="flex w-full flex-col">
          <ReviewRows rows={rows} />
          <div className="flex justify-end pt-3.5">
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
          <p className="pt-8 text-[15px] leading-normal text-muted-foreground shadow-[inset_0_1px_0_var(--border-subtle)]">{p.none}</p>
        )}

        {/* The end of the step: the chosen method and PAY. From lg it closes the column under a hairline;
            below lg the same bar is pinned to the bottom of the screen, with a failed attempt's error above it. */}
        <div className="flex w-full flex-col lg:pt-8 lg:shadow-[inset_0_1px_0_var(--border-subtle)]">
          <div
            data-pinned-bar
            className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-3 bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] md:px-8 lg:static lg:z-auto lg:gap-4 lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            {errorText ? (
              <p ref={errorRef} tabIndex={-1} role="alert" className={errorClass}>
                {errorText}
              </p>
            ) : null}
            <div className="flex items-center gap-4">
              <p className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] leading-5 text-muted-foreground lg:text-sm lg:leading-[21px]">{p.payingWith}</span>
                <span
                  className="truncate text-sm leading-[21px] font-bold text-foreground lg:font-display lg:text-[22px] lg:leading-7"
                  aria-live="polite"
                >
                  {method ? paymentMethodInfo[method].name : "—"}
                </span>
              </p>
              <Button type="submit" className="shrink-0 px-5 sm:px-7" disabled={pending || !method}>
                {pending ? p.placing : p.pay(formatRupiah(summary.total))}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </CheckoutColumns>
  );
}
