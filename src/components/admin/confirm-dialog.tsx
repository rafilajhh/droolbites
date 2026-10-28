"use client";

import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import { useModal } from "@/components/layout/shop-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * The Delete Dialog look (pen IBiDA) as a reusable confirm step: round icon,
 * title, body and a cancel / confirm pair. Without onConfirm it shows a single
 * close button.
 */
export function ConfirmDialog({
  open,
  onClose,
  icon: Icon,
  tone = "danger",
  title,
  body,
  error,
  cancelLabel,
  confirmLabel,
  onConfirm,
  pending = false,
  danger = tone === "danger",
}: {
  open: boolean;
  onClose: () => void;
  icon: LucideIcon;
  /** Icon badge color: crimson for destructive steps, mint for the rest. */
  tone?: "danger" | "neutral";
  title: React.ReactNode;
  body: React.ReactNode;
  error?: string;
  cancelLabel: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  pending?: boolean;
  /** Crimson confirm button (defaults to the tone). */
  danger?: boolean;
}) {
  const id = useId();
  const panelRef = useModal(open, onClose);

  if (!open) return null;

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
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-pill",
            tone === "danger" ? "bg-error/12" : "bg-mint",
          )}
        >
          <Icon className={cn("size-6", tone === "danger" ? "text-error" : "text-primary")} aria-hidden />
        </span>
        <div className="flex w-full flex-col gap-2">
          <h2 id={`${id}-title`} className="font-display text-[28px] leading-[31px] font-bold">
            {title}
          </h2>
          <div id={`${id}-body`} className="flex flex-col gap-2 text-[15px] leading-[22px] text-muted-foreground">
            {body}
          </div>
          {error ? (
            <p role="alert" className="text-sm leading-[21px] text-error">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex w-full gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="min-w-0 flex-1 px-4" data-autofocus>
            {cancelLabel}
          </Button>
          {onConfirm ? (
            <Button
              disabled={pending}
              onClick={onConfirm}
              className={cn("min-w-0 flex-1 px-4", danger && "bg-error hover:bg-error/85")}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
