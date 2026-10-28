"use client";

import { useActionState } from "react";
import { reorder, type ReorderState } from "@/app/actions/checkout";
import { buttonClasses } from "@/components/ui/button";

const initialState: ReorderState = { attempt: 0 };

/** "ORDER AGAIN": refills the cart with this order's items and opens checkout. */
export function ReorderButton({
  orderNumber,
  token,
  label,
  pendingLabel,
  failedLabel,
}: {
  orderNumber: string;
  token: string;
  label: string;
  pendingLabel: string;
  failedLabel: string;
}) {
  const [state, formAction, pending] = useActionState(reorder, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
      <button type="submit" disabled={pending} className={buttonClasses("primary", "w-full")}>
        {pending ? pendingLabel : label}
      </button>
      {state.failed ? (
        <p role="alert" className="text-[13px] leading-5 text-error">
          {failedLabel}
        </p>
      ) : null}
    </form>
  );
}
