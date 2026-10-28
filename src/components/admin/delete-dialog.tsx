"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteProduct, hideProduct } from "@/app/actions/admin/products";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { ConfirmDialog } from "./confirm-dialog";

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
  const [pending, startTransition] = useTransition();
  const [locked, setLocked] = useState(product.hasOrders);
  const [failed, setFailed] = useState(false);

  const run = (action: (id: string) => Promise<{ status: string }>) =>
    startTransition(async () => {
      setFailed(false);
      const result = await action(product.id);
      if (result.status === "in-use") setLocked(true);
      else if (result.status === "failed") setFailed(true);
    });

  const alreadyHidden = locked && !product.isAvailable;

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      icon={Trash2}
      title={locked ? t.lockedTitle(product.name) : t.title(product.name)}
      body={locked ? (alreadyHidden ? t.lockedHiddenBody : t.lockedBody) : t.body(t.sizes(product.sizes, product.tray))}
      error={failed ? t.failed : undefined}
      cancelLabel={alreadyHidden ? t.close : t.cancel}
      confirmLabel={pending ? (locked ? t.hiding : t.deleting) : locked ? t.hide : t.confirm}
      onConfirm={alreadyHidden ? undefined : () => run(locked ? hideProduct : deleteProduct)}
      pending={pending}
      danger={!locked}
    />
  );
}
