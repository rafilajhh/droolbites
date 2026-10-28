"use client";

import { useId, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProduct, hideProduct } from "@/app/actions/admin/products";
import { useModal } from "@/components/layout/shop-ui";
import { Button } from "@/components/ui/button";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";

/**
 * pen: Delete Dialog (IBiDA). Products whose sizes appear in past orders
 * cannot be deleted (order_items keeps a foreign key), so the dialog offers
 * to hide them from the menu instead.
 */
export function DeleteDialog({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: { id: string; name: string; sizes: number; tray: boolean; hasOrders: boolean; isAvailable: boolean };
}) {
  const t = useMessages(adminMessages).remove;
  const id = useId();
  const panelRef = useModal(open, onClose);
  const [pending, startTransition] = useTransition();
  const [locked, setLocked] = useState(product.hasOrders);
  const [failed, setFailed] = useState(false);

  if (!open) return null;

  const run = (action: (id: string) => Promise<{ status: string }>) =>
    startTransition(async () => {
      setFailed(false);
      const result = await action(product.id);
      if (result.status === "in-use") setLocked(true);
      else if (result.status === "failed") setFailed(true);
    });

  const alreadyHidden = locked && !product.isAvailable;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div aria-hidden className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="relative flex w-full max-w-[440px] flex-col gap-5 rounded-m bg-background p-6 sm:p-8"
      >
        <span className="flex size-12 items-center justify-center rounded-pill bg-error/12">
          <Trash2 className="size-6 text-error" aria-hidden />
        </span>
        <div className="flex w-full flex-col gap-2">
          <h2 id={`${id}-title`} className="font-display text-[28px] leading-[31px] font-bold">
            {locked ? t.lockedTitle(product.name) : t.title(product.name)}
          </h2>
          <p id={`${id}-body`} className="text-[15px] leading-[22px] text-muted-foreground">
            {locked
              ? alreadyHidden
                ? t.lockedHiddenBody
                : t.lockedBody
              : t.body(t.sizes(product.sizes, product.tray))}
          </p>
          {failed ? (
            <p role="alert" className="text-sm leading-[21px] text-error">
              {t.failed}
            </p>
          ) : null}
        </div>
        <div className="flex w-full gap-3 pt-1">
          {alreadyHidden ? (
            <Button variant="secondary" onClick={onClose} className="flex-1 px-4" data-autofocus>
              {t.close}
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={onClose} className="min-w-0 flex-1 px-4" data-autofocus>
                {t.cancel}
              </Button>
              <Button
                disabled={pending}
                onClick={() => run(locked ? hideProduct : deleteProduct)}
                className={cn("min-w-0 flex-1 px-4", !locked && "bg-error hover:bg-error/85")}
              >
                {pending ? t.deleting : locked ? t.hide : t.confirm}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
