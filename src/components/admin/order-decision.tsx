"use client";

import { startTransition, useActionState, useState } from "react";
import { Ban } from "lucide-react";
import { decideOrder, type DecisionState } from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { CANCEL_REASONS } from "@/lib/order-status";
import { ConfirmDialog } from "./confirm-dialog";

export type CancelReason = (typeof CANCEL_REASONS)[number] | "other";

/**
 * A paid order the store hasn't confirmed yet: accept it (it goes to Baking) or decline it with a
 * reason the customer sees (it's cancelled and the payment is owed back). Replaces the status
 * dropdown until the store decides.
 */
export function OrderDecision({
  orderNumber,
  paidAmount,
}: {
  orderNumber: string;
  /** What the customer paid, owed back on a decline; null for a demo payment (nothing to refund). */
  paidAmount: string | null;
}) {
  const t = useMessages(adminMessages).order;
  const d = t.decision;
  const [state, action, pending] = useActionState<DecisionState, FormData>(decideOrder, { status: "idle" });
  const [declining, setDeclining] = useState(false);
  // Nothing preselected: the customer reads this reason, so the store picks it.
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [other, setOther] = useState("");
  const [missing, setMissing] = useState(false);

  const send = (decision: "accept" | "decline") => {
    const data = new FormData();
    data.set("orderNumber", orderNumber);
    data.set("decision", decision);
    if (decision === "decline" && reason) {
      data.set("reason", reason);
      data.set("other", other);
    }
    startTransition(() => action(data));
  };
  const confirmDecline = () => {
    if (!reason || (reason === "other" && other.trim().length < 3)) return setMissing(true);
    setDeclining(false);
    send("decline");
  };

  const message = state.status === "changed" || state.status === "reason" ? (state.status === "reason" ? d.otherMissing : d.changed) : "";

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-base leading-6 font-bold">{d.title}</p>
        <p className="text-sm leading-[21px] text-muted-foreground">{d.sub}</p>
      </div>
      <Button onClick={() => send("accept")} disabled={pending} className="w-full">
        {pending ? d.accepting : d.accept}
      </Button>
      <Button
        variant="secondary"
        onClick={() => {
          setMissing(false);
          setDeclining(true);
        }}
        disabled={pending}
        className="w-full text-error inset-ring-error/60 hover:bg-tint-salmon"
      >
        {d.decline}
      </Button>
      <p role="status" className={cn(message ? "-mt-1 text-[13px] leading-5 text-error" : "sr-only")}>
        {message}
      </p>

      <ConfirmDialog
        open={declining}
        onClose={() => setDeclining(false)}
        icon={Ban}
        tone="danger"
        title={d.declineTitle(orderNumber)}
        body={
          <div className="flex flex-col gap-4 text-left">
            <p>{paidAmount === null ? t.demo.declineBody : d.declineBody(paidAmount)}</p>
            <CancelReasonFields
              reason={reason}
              other={other}
              missing={missing}
              onReason={(key) => {
                setReason(key);
                setMissing(false);
              }}
              onOther={(text) => {
                setOther(text);
                setMissing(false);
              }}
            />
          </div>
        }
        error={missing ? (reason ? d.otherMissing : d.reasonMissing) : undefined}
        cancelLabel={d.back}
        confirmLabel={pending ? d.declining : d.confirmDecline}
        onConfirm={confirmDecline}
        pending={pending}
      />
    </div>
  );
}

/**
 * The reason the customer sees when the store declines or cancels a paid order: the preset reasons as
 * radio rows plus "Another reason" with a short text field. Used in the decline dialog and in the
 * status form's cancel dialog.
 */
export function CancelReasonFields({
  reason,
  other,
  missing,
  onReason,
  onOther,
}: {
  reason: CancelReason | null;
  other: string;
  missing: boolean;
  onReason: (reason: CancelReason) => void;
  onOther: (text: string) => void;
}) {
  const d = useMessages(adminMessages).order.decision;
  return (
    <fieldset className="flex flex-col gap-2" aria-invalid={missing && !reason ? true : undefined}>
      <legend className="mb-1 text-sm leading-[18px] font-semibold text-foreground">{d.reasonLabel}</legend>
      {[...CANCEL_REASONS, "other" as const].map((key) => (
        <label
          key={key}
          className={cn(
            "flex min-h-11 cursor-pointer items-center gap-3 rounded-sm px-3.5 py-2.5 text-[15px] leading-[21px] text-foreground transition-colors",
            reason === key ? "bg-mint inset-ring-[1.5px] inset-ring-primary" : "bg-white inset-ring-[1.25px] inset-ring-border-subtle hover:bg-card",
          )}
        >
          <input
            type="radio"
            name="cancel-reason"
            value={key}
            checked={reason === key}
            onChange={() => onReason(key)}
            className="size-4 accent-(--primary)"
          />
          {key === "other" ? d.other : d.reasons[key]}
        </label>
      ))}
      {reason === "other" ? (
        <input
          aria-label={d.other}
          value={other}
          onChange={(e) => onOther(e.target.value.slice(0, 200))}
          placeholder={d.otherPlaceholder}
          maxLength={200}
          autoFocus
          aria-invalid={missing ? true : undefined}
          className={cn(inputClasses, "mt-1")}
        />
      ) : null}
    </fieldset>
  );
}
