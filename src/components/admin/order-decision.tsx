"use client";

import { startTransition, useActionState, useState } from "react";
import { Ban, Info } from "lucide-react";
import { decideOrder, type DecisionState } from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { CANCEL_REASONS } from "@/lib/order-status";
import { ConfirmDialog } from "./confirm-dialog";

type Reason = (typeof CANCEL_REASONS)[number] | "other";

/**
 * A paid order the store hasn't confirmed yet: accept it (it goes to Baking) or decline it with a
 * reason the customer sees (it's cancelled and the payment is owed back). Replaces the status
 * dropdown until the store decides.
 */
export function OrderDecision({ orderNumber, note, paidAmount }: { orderNumber: string; note: string; paidAmount: string }) {
  const t = useMessages(adminMessages).order;
  const d = t.decision;
  const [state, action, pending] = useActionState<DecisionState, FormData>(decideOrder, { status: "idle" });
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState<Reason>("sold_out");
  const [other, setOther] = useState("");
  const [missing, setMissing] = useState(false);

  const send = (decision: "accept" | "decline") => {
    const data = new FormData();
    data.set("orderNumber", orderNumber);
    data.set("decision", decision);
    if (decision === "decline") {
      data.set("reason", reason);
      data.set("other", other);
    }
    startTransition(() => action(data));
  };
  const confirmDecline = () => {
    if (reason === "other" && other.trim().length < 3) return setMissing(true);
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
      <p className="flex w-full gap-2 rounded-sm bg-mint p-3 text-[13px] leading-5 font-semibold">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="flex-1">{note}</span>
      </p>
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
            <p>{d.declineBody(paidAmount)}</p>
            <fieldset className="flex flex-col gap-2">
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
                    name="decline-reason"
                    value={key}
                    checked={reason === key}
                    onChange={() => {
                      setReason(key);
                      setMissing(false);
                    }}
                    className="size-4 accent-(--primary)"
                  />
                  {key === "other" ? d.other : d.reasons[key]}
                </label>
              ))}
              {reason === "other" ? (
                <input
                  aria-label={d.other}
                  value={other}
                  onChange={(e) => {
                    setOther(e.target.value.slice(0, 200));
                    setMissing(false);
                  }}
                  placeholder={d.otherPlaceholder}
                  maxLength={200}
                  autoFocus
                  aria-invalid={missing ? true : undefined}
                  className={cn(inputClasses, "mt-1")}
                />
              ) : null}
            </fieldset>
          </div>
        }
        error={missing ? d.otherMissing : undefined}
        cancelLabel={d.back}
        confirmLabel={pending ? d.declining : d.confirmDecline}
        onConfirm={confirmDecline}
        pending={pending}
      />
    </div>
  );
}
