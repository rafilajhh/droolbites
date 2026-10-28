"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { changePaymentMethod, type ChangeMethodState } from "@/app/actions/checkout";
import { Button, ButtonLink } from "@/components/ui/button";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { PaymentMethodGroups, type PaymentLogos } from "./payment-methods";

/**
 * Pay page with ?change=1, or an order without a live payment (the gateway
 * refused the first method, or the payment expired before the order did):
 * pick a method for the same unpaid order.
 */
export function ChangeMethodForm({
  orderNumber,
  token,
  current,
  methods,
  logos,
  cancelHref,
  initialError,
}: {
  orderNumber: string;
  token: string;
  current: PaymentMethod | null;
  methods: PaymentMethod[];
  logos: PaymentLogos;
  /** Null when there is no live payment to go back to. */
  cancelHref: string | null;
  initialError?: ChangeMethodState["error"];
}) {
  const t = useMessages(checkoutMessages);
  const c = t.pay.change;
  const [state, formAction, pending] = useActionState(changePaymentMethod, { attempt: 0, error: initialError });
  const [method, setMethod] = useState<PaymentMethod | null>(current && methods.includes(current) ? current : null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (state.attempt > 0 && state.error) errorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
      {/* Without a live payment the page heading already asks for a method. */}
      {cancelHref ? (
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-[22px] leading-[25px] font-bold text-foreground">{c.title}</h2>
          <p className="text-[15px] leading-[23px] text-muted-foreground">{c.sub}</p>
        </div>
      ) : null}
      {state.error ? (
        <p
          ref={errorRef}
          tabIndex={-1}
          role="alert"
          className="rounded-sm bg-tint-salmon px-4 py-3 text-sm leading-[21px] text-foreground outline-hidden"
        >
          {t.errors[state.error]}
        </p>
      ) : null}
      <PaymentMethodGroups t={t.payment} methods={methods} logos={logos} selected={method} onSelect={setMethod} />
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Button type="submit" disabled={pending || !method}>
          {pending ? c.saving : c.confirm}
        </Button>
        {cancelHref ? (
          <ButtonLink href={cancelHref} variant="secondary">
            {c.cancel}
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );
}
