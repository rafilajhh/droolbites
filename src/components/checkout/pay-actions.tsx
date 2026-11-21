"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CircleX, FlaskConical } from "lucide-react";
import {
  cancelOrder,
  checkPaymentStatus,
  simulatePayment,
  skipPaymentDemo,
  type CancelOrderState,
  type PayCheckState,
} from "@/app/actions/checkout";
import { Button, buttonClasses } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";

const initialState: PayCheckState = { attempt: 0 };
const initialCancel: CancelOrderState = { attempt: 0 };

/**
 * "I've paid — check status" and, while the order can still be cancelled, "Cancel order" (KKqcJ
 * Actions). Cancel asks first in place of the two buttons: what cancelling does, then "Yes, cancel"
 * or "Keep order", which brings the buttons back.
 */
export function PayActions({ orderNumber, token, cancellable = false }: { orderNumber: string; token: string; cancellable?: boolean }) {
  const t = useMessages(checkoutMessages).pay;
  const [state, formAction, pending] = useActionState(checkPaymentStatus, initialState);
  const [cancelState, cancelAction, cancelling] = useActionState(cancelOrder, initialCancel);
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLParagraphElement>(null);
  // Moves focus with the swap: onto the question when it opens, back to Cancel order when kept.
  const opened = useRef(false);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (opened.current) cancelRef.current?.focus();
    opened.current = confirming;
  }, [confirming]);

  const hidden = (
    <>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
    </>
  );

  if (cancellable && confirming) {
    return (
      <div className="flex w-full flex-col gap-4 rounded-m bg-tint-salmon p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CircleX className="mt-0.5 size-5 shrink-0 text-error" aria-hidden />
          <div className="flex min-w-0 flex-col gap-1">
            <p ref={confirmRef} tabIndex={-1} className="text-base leading-6 font-bold text-foreground outline-hidden">
              {t.cancelConfirmTitle(orderNumber)}
            </p>
            <p className="text-[15px] leading-[23px] text-pretty text-foreground">{t.cancelConfirmBody}</p>
          </div>
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <form action={cancelAction} className="flex">
            {hidden}
            <button type="submit" disabled={cancelling} className={buttonClasses("primary", "w-full")}>
              {cancelling ? t.cancelling : t.cancelConfirm}
            </button>
          </form>
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={cancelling}>
            {t.cancelKeep}
          </Button>
        </div>
        {cancelState.error ? (
          <p key={cancelState.attempt} role="alert" className="text-sm leading-[21px] text-error">
            {t.cancelBusy}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <form action={formAction} className="flex">
          {hidden}
          <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
            {pending ? t.checking : t.checkStatus}
          </button>
        </form>
        {cancellable ? (
          <button ref={cancelRef} type="button" onClick={() => setConfirming(true)} className={buttonClasses("secondary")}>
            {t.cancelOrder}
          </button>
        ) : null}
      </div>
      <p aria-live="polite" className="text-sm leading-[21px] text-muted-foreground empty:hidden">
        {state.result === "awaiting" ? t.notYet : ""}
      </p>
    </div>
  );
}

/**
 * Polls the payment status every few seconds while the tab is visible (and
 * once when it becomes visible again). Paid → success page; the payment or
 * order expired → re-render the pay page.
 */
export function PaymentWatcher({ statusUrl, successHref }: { statusUrl: string; successHref: string }) {
  const router = useRouter();

  useEffect(() => {
    let stopped = false;
    let busy = false;
    const check = async () => {
      if (stopped || busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const res = await fetch(statusUrl, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { status?: string; payment?: string | null };
        if (data.status === "paid") {
          stopped = true;
          router.replace(successHref);
        } else if (data.status === "expired" || data.payment !== "awaiting") {
          stopped = true;
          router.refresh();
        }
      } catch {
        // Offline for a moment: the next tick tries again.
      } finally {
        busy = false;
      }
    };
    const id = window.setInterval(check, 5000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [statusUrl, successHref, router]);

  return null;
}

/**
 * Demo / sandbox box: no real money moves, so let the visitor pay the order. "mock" and "sandbox"
 * simulate the gateway's payment; "demo" (DEMO_PAYMENTS on, a gateway that can't simulate) marks the
 * order paid in demo mode instead.
 */
export function SimulatePayment({ orderNumber, token, mode }: { orderNumber: string; token: string; mode: "mock" | "sandbox" | "demo" }) {
  const t = useMessages(checkoutMessages).pay;
  const copy =
    mode === "demo"
      ? { title: t.demoModeTitle, body: t.demoModeBody, label: t.demoSkip, pending: t.demoSkipping }
      : mode === "sandbox"
        ? { title: t.sandboxTitle, body: t.sandboxBody, label: t.simulate, pending: t.simulating }
        : { title: t.demoTitle, body: t.demoBody, label: t.simulate, pending: t.simulating };
  return (
    <form
      id="simulate"
      action={mode === "demo" ? skipPaymentDemo : simulatePayment}
      className="flex w-full flex-col gap-3 pt-6 shadow-[inset_0_1px_0_var(--border-subtle)] sm:flex-row sm:items-center sm:justify-between"
    >
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-[13px] leading-5 text-pretty text-muted-foreground">
          <span className="font-bold text-foreground">{copy.title}.</span> {copy.body}
        </p>
      </div>
      <SimulateButton label={copy.label} pendingLabel={copy.pending} />
    </form>
  );
}

function SimulateButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 shrink-0 rounded-sm px-4 py-2.5 text-sm leading-[21px] font-bold text-foreground inset-ring-[1.25px] inset-ring-border transition-colors hover:bg-card disabled:opacity-50"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
