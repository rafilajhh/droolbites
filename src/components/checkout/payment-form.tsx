"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { placeOrder, type PlaceOrderState } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { formatRupiah } from "@/lib/format";
import { paymentMethodInfo } from "@/lib/order-status";
import { OrderSummary, type SummaryLine } from "./order-summary";
import { PaymentMethodGroups, type PaymentLogos } from "./payment-methods";

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
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.error) errorRef.current?.focus();
  }, [state]);

  const delivery = review.fulfilment === "delivery";
  const rows = [
    { label: p.contact, value: review.email, change: p.changeContact },
    { label: delivery ? p.deliverTo : p.pickupAt, value: review.address, change: p.changeAddress },
    {
      label: p.method,
      value: delivery ? `${p.localDelivery} · ${formatRupiah(review.fee)}` : `${p.pickup} · ${p.free}`,
      change: p.changeMethod,
    },
  ];

  return (
    <form
      action={formAction}
      className="flex w-full flex-col gap-8 px-4 pt-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:px-8 lg:flex-row lg:items-start lg:gap-12 lg:px-16 lg:pt-12 lg:pb-24"
    >
      <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2 pb-3">
          <h1 className="font-display text-[40px] leading-none font-bold tracking-[-1.5px] text-foreground sm:text-[56px]">
            {p.title}
          </h1>
          <p className="text-[17px] leading-[26px] text-muted-foreground">{p.sub}</p>
        </div>

        <dl className="flex w-full flex-col rounded-m bg-white px-5 py-1 inset-ring-1 inset-ring-border-subtle sm:px-6">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 py-4 shadow-[inset_0_-1px_0_var(--border-subtle)] last:shadow-none sm:flex-nowrap"
            >
              <dt className="w-full text-sm leading-[21px] text-muted-foreground sm:w-[110px] sm:shrink-0">{row.label}</dt>
              <dd className="min-w-0 flex-1 text-[15px] leading-[23px] font-semibold break-words text-foreground">
                {row.value}
              </dd>
              <dd className="flex shrink-0">
                <Link href="/checkout" className="relative text-sm leading-[21px] font-bold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline">
                  <span aria-hidden>{p.change}</span>
                  <span className="sr-only">{row.change}</span>
                </Link>
              </dd>
            </div>
          ))}
        </dl>

        {defaultMethod ? (
          <PaymentMethodGroups t={p} methods={methods} logos={logos} selected={method} onSelect={setMethod} />
        ) : (
          <p className="rounded-m bg-white p-6 text-[15px] leading-normal text-muted-foreground inset-ring-1 inset-ring-border-subtle">
            {p.none}
          </p>
        )}
      </div>

      {/* Below lg the PAY button lives in a bar pinned to the bottom of the screen (the in-flow one is hidden). */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] md:px-8 lg:hidden">
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

      <div className="flex w-full flex-col gap-4 lg:w-[440px] lg:shrink-0">
        <OrderSummary
          t={t.summary}
          lines={summary.lines}
          itemCount={summary.itemCount}
          subtotal={summary.subtotal}
          fulfilment={review.fulfilment}
          fee={review.fee}
          total={summary.total}
        />
        <div className="flex w-full flex-col gap-3 rounded-m bg-white p-6 inset-ring-1 inset-ring-border-subtle">
          <div className="flex w-full items-center justify-between gap-3 text-sm leading-[21px]">
            <span className="text-muted-foreground">{p.payingWith}</span>
            <span className="text-right font-bold text-foreground" aria-live="polite">
              {method ? paymentMethodInfo[method].name : "—"}
            </span>
          </div>
          {state.error ? (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-sm bg-tint-salmon px-4 py-3 text-sm leading-normal text-foreground outline-hidden"
            >
              {t.errors[state.error]}{" "}
              {state.error === "cartChanged" ? (
                <Link href="/menu" className="font-bold underline">
                  {t.header.back}
                </Link>
              ) : null}
            </p>
          ) : null}
          <Button type="submit" className="hidden w-full lg:inline-flex" disabled={pending || !method}>
            {pending ? p.placing : p.pay(formatRupiah(summary.total))}
          </Button>
          <p className="flex items-center justify-center gap-2 text-[13px] leading-5 text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            {p.secure}
          </p>
        </div>
        <Link
          href="/checkout"
          className="-my-[11.5px] flex min-h-11 items-center justify-center gap-1.5 text-sm leading-[21px] font-semibold text-foreground hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {p.back}
        </Link>
      </div>
    </form>
  );
}
