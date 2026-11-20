"use client";

import { startTransition, useActionState, useState } from "react";
import { FlaskConical } from "lucide-react";
import { markPaidDemo, type DemoPaidState } from "@/app/actions/admin/orders";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Demo mode only (DEMO_PAYMENTS="on"): "Mark paid (demo)" under Cancel order, for an unpaid open
 * order. Rendered whatever the order's state while the flag is on, so its result line stays after
 * the page refreshes into the paid order (the button itself only shows while `eligible`).
 */
export function DemoPay({ orderNumber, eligible }: { orderNumber: string; eligible: boolean }) {
  const t = useMessages(adminMessages).order;
  const d = t.demo;
  const [state, action, pending] = useActionState<DemoPaidState, FormData>(markPaidDemo, { status: "idle" });
  const [confirming, setConfirming] = useState(false);

  const confirm = () => {
    setConfirming(false);
    const data = new FormData();
    data.set("orderNumber", orderNumber);
    startTransition(() => action(data));
  };
  const messages: Record<DemoPaidState["status"], string> = {
    idle: "",
    paid: d.paid,
    real: d.real,
    off: d.off,
    invalid: d.invalid,
    busy: t.busy,
    gateway: d.gateway,
  };
  const message = messages[state.status];
  if (!eligible && !message) return null;

  return (
    <div className="flex w-full flex-col gap-4">
      {eligible ? (
        <Button variant="secondary" onClick={() => setConfirming(true)} disabled={pending} className="w-full">
          {pending ? d.marking : d.button}
        </Button>
      ) : null}
      <p
        role="status"
        className={cn(
          message ? "text-[13px] leading-5" : "sr-only",
          eligible && message && "-mt-1",
          state.status === "paid" ? "text-success" : state.status === "real" ? "text-foreground" : "text-error",
        )}
      >
        {message}
      </p>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        icon={FlaskConical}
        tone="neutral"
        title={d.confirmTitle(orderNumber)}
        body={
          <>
            <p>{d.confirmBody}</p>
            <p>{d.confirmEffect}</p>
          </>
        }
        cancelLabel={t.goBack}
        confirmLabel={d.confirm}
        onConfirm={confirm}
        pending={pending}
      />
    </div>
  );
}
