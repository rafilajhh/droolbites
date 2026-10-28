"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { FlaskConical } from "lucide-react";
import { checkPaymentStatus, simulatePayment, type PayCheckState } from "@/app/actions/checkout";
import { buttonClasses, ButtonLink } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";

const initialState: PayCheckState = { attempt: 0 };

/** "I've paid — check status" + "Pay later · view order" (KKqcJ Actions). */
export function PayActions({ orderNumber, token, orderHref }: { orderNumber: string; token: string; orderHref: string }) {
  const t = useMessages(checkoutMessages).pay;
  const [state, formAction, pending] = useActionState(checkPaymentStatus, initialState);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <form action={formAction} className="flex">
          <input type="hidden" name="orderNumber" value={orderNumber} />
          <input type="hidden" name="t" value={token} />
          <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
            {pending ? t.checking : t.checkStatus}
          </button>
        </form>
        <ButtonLink href={orderHref} variant="secondary">
          {t.payLater}
        </ButtonLink>
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

/** Demo / sandbox box: no real money moves, so let the visitor pay the order. */
export function SimulatePayment({ orderNumber, token, sandbox = false }: { orderNumber: string; token: string; sandbox?: boolean }) {
  const t = useMessages(checkoutMessages).pay;
  return (
    <form
      id="simulate"
      action={simulatePayment}
      className="flex w-full flex-col gap-3 rounded-m border border-dashed border-border-subtle px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
      <div className="flex items-start gap-3">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-[13px] leading-5 text-muted-foreground">
          <span className="font-bold text-foreground">{sandbox ? t.sandboxTitle : t.demoTitle}.</span> {sandbox ? t.sandboxBody : t.demoBody}
        </p>
      </div>
      <SimulateButton label={t.simulate} pendingLabel={t.simulating} />
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
