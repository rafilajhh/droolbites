"use client";

import { startTransition, useActionState, useState } from "react";
import { Ban, ChevronDown, CircleCheck, Info } from "lucide-react";
import { updateFulfilmentStatus, type FulfilmentState } from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "./confirm-dialog";
import { Dropdown, type DropdownOption } from "./dropdown";

/** pen: Admin / Order detail → Order status card, with the Fulfilment Options popover (IPL0N). */
export function StatusForm({
  orderNumber,
  current,
  options,
  note,
  paidAmount,
}: {
  orderNumber: string;
  current: string;
  options: DropdownOption[];
  note: { text: string; className: string };
  /** Set when the order is paid: cancelling it means refunding this amount. */
  paidAmount?: string;
}) {
  const t = useMessages(adminMessages).order;
  const [state, action, pending] = useActionState<FulfilmentState, FormData>(updateFulfilmentStatus, {
    status: "idle",
  });
  const [selected, setSelected] = useState(current);
  // The result message belongs to the last save; picking a new status clears it.
  const [cleared, setCleared] = useState<FulfilmentState | null>(null);
  // Completed and Cancelled close the order for good, so saving one asks first.
  const [confirming, setConfirming] = useState<FormData | null>(null);
  const locked = options.length <= 1;
  const value = options.find((o) => o.value === selected) ?? options[0];
  const messages: Record<FulfilmentState["status"], string> = {
    idle: "",
    saved: t.saved,
    unchanged: t.unchanged,
    invalid: t.invalid,
    busy: t.busy,
  };
  const message = state === cleared ? "" : messages[state.status];
  const finalStatus = value.value === "completed" || value.value === "cancelled";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    if (finalStatus && value.value !== current) setConfirming(data);
    else startTransition(() => action(data));
  };
  const confirm = () => {
    const data = confirming;
    setConfirming(null);
    if (data) startTransition(() => action(data));
  };
  const cancelling = value.value === "cancelled";

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-4">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="status" value={value.value} />
      <div className="flex w-full flex-col gap-2">
        <span id="fulfilment-label" className="text-sm leading-[18px] font-semibold">
          {t.update}
        </span>
        <Dropdown
          label={t.update}
          options={options}
          value={value.value}
          labelledBy="fulfilment-label"
          onChange={(next) => {
            setSelected(next);
            setCleared(state);
          }}
          disabled={locked || pending}
          triggerClassName={cn(inputClasses, "flex items-center gap-2.5 text-left")}
          panelClassName="w-full"
          trigger={
            <>
              <span className="flex-1">{value.label}</span>
              <ChevronDown className="size-[18px] shrink-0" aria-hidden />
            </>
          }
        />
      </div>
      <p className={cn("flex w-full gap-2 rounded-sm p-3 text-[13px] leading-5 font-semibold", note.className)}>
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="flex-1">{locked ? `${note.text} ${t.finalNote}` : note.text}</span>
      </p>
      <Button type="submit" disabled={locked || pending} className="w-full">
        {pending ? t.saving : t.save}
      </Button>
      {/* Always mounted so screen readers announce the result; sr-only (out of flow) while empty. */}
      <p
        role="status"
        className={cn(
          message ? "-mt-1 text-[13px] leading-5" : "sr-only",
          state.status === "saved" ? "text-success" : "text-error",
        )}
      >
        {message}
      </p>
      <ConfirmDialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        icon={cancelling ? Ban : CircleCheck}
        tone={cancelling ? "danger" : "neutral"}
        title={cancelling ? t.confirmCancelTitle(orderNumber) : t.confirmCompleteTitle(orderNumber)}
        body={
          <>
            <p>{cancelling ? t.confirmCancelBody : t.confirmCompleteBody}</p>
            {cancelling && paidAmount ? (
              <p className="font-semibold text-foreground">{t.confirmCancelRefund(paidAmount)}</p>
            ) : null}
          </>
        }
        cancelLabel={t.goBack}
        confirmLabel={cancelling ? t.confirmCancel : t.confirmComplete}
        onConfirm={confirm}
      />
    </form>
  );
}
