"use client";

import { useActionState } from "react";
import { reorder, type ReorderState } from "@/app/actions/checkout";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const initialState: ReorderState = { attempt: 0 };

/**
 * "ORDER AGAIN": refills the cart with this order's items and opens checkout. The link variant is the
 * quieter text action used in order history rows.
 */
export function ReorderButton({
  orderNumber,
  token,
  label,
  pendingLabel,
  failedLabel,
  variant = "button",
}: {
  orderNumber: string;
  token: string;
  label: string;
  pendingLabel: string;
  failedLabel: string;
  variant?: "button" | "link";
}) {
  const [state, formAction, pending] = useActionState(reorder, initialState);
  return (
    <form action={formAction} className={cn("flex flex-col gap-2", variant === "link" && "items-end")}>
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="t" value={token} />
      <button
        type="submit"
        disabled={pending}
        className={
          variant === "link"
            ? "relative cursor-pointer pb-1 font-display text-[15px] leading-[1.2] font-semibold text-primary shadow-[inset_0_-1.25px_0_var(--border)] after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] disabled:cursor-not-allowed disabled:opacity-50"
            : buttonClasses("primary", "w-full")
        }
      >
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
