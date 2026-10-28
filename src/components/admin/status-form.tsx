"use client";

import { useActionState, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { updateFulfilmentStatus, type FulfilmentState } from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { Dropdown, type DropdownOption } from "./dropdown";

/** pen: Admin / Order detail → Order status card, with the Fulfilment Options popover (IPL0N). */
export function StatusForm({
  orderNumber,
  current,
  options,
  note,
}: {
  orderNumber: string;
  current: string;
  options: DropdownOption[];
  note: { text: string; className: string };
}) {
  const t = useMessages(adminMessages).order;
  const [state, action, pending] = useActionState<FulfilmentState, FormData>(updateFulfilmentStatus, {
    status: "idle",
  });
  const [selected, setSelected] = useState(current);
  // The result message belongs to the last save; picking a new status clears it.
  const [cleared, setCleared] = useState<FulfilmentState | null>(null);
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

  return (
    <form action={action} className="flex w-full flex-col gap-4">
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
    </form>
  );
}
