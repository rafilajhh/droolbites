"use client";

import { startTransition, useActionState, useState } from "react";
import { Undo2 } from "lucide-react";
import { markRefunded, type RefundState } from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * "Mark as refunded" in the refund-needed alert: once the store has sent the money back, it says so
 * here (with an optional note only the store sees). Asks first in the in-page dialog; the page then
 * turns the alert into a quiet "Refunded … on …" line and the customer gets the refund email.
 */
export function MarkRefunded({ orderNumber, amount }: { orderNumber: string; amount: string }) {
  const t = useMessages(adminMessages).order.refund;
  const [state, action, pending] = useActionState<RefundState, FormData>(markRefunded, { status: "idle" });
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");

  const confirm = () => {
    setOpen(false);
    const data = new FormData();
    data.set("orderNumber", orderNumber);
    data.set("note", note);
    startTransition(() => action(data));
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={() => setOpen(true)} disabled={pending} className="min-h-11 bg-white px-5 py-3">
        {pending ? t.saving : t.mark}
      </Button>
      <p role="status" className={cn(state.status === "invalid" ? "text-[13px] leading-5 text-error" : "sr-only")}>
        {state.status === "invalid" ? t.invalid : ""}
      </p>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        icon={Undo2}
        tone="neutral"
        title={t.title(orderNumber)}
        body={
          <div className="flex flex-col gap-4 text-left">
            <p>{t.body(amount)}</p>
            <label className="flex flex-col gap-2">
              <span className="text-sm leading-[18px] font-semibold text-foreground">{t.noteLabel}</span>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder={t.notePlaceholder}
                maxLength={200}
                className={inputClasses}
              />
            </label>
          </div>
        }
        cancelLabel={t.back}
        confirmLabel={pending ? t.saving : t.confirm}
        onConfirm={confirm}
        pending={pending}
      />
    </div>
  );
}
