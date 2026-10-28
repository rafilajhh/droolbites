"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { TextInput } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";

/**
 * After a failed submit, move focus to the first invalid field (or the given
 * fallback, e.g. a form-level alert) so keyboard and screen-reader users land
 * on the problem. `attempt` changes on every server response.
 */
export function useFocusFirstError(
  formRef: React.RefObject<HTMLFormElement | null>,
  attempt: number | undefined,
  fallbackId?: string,
) {
  useEffect(() => {
    if (!attempt || !formRef.current) return;
    const invalid = formRef.current.querySelector<HTMLElement>('[aria-invalid="true"]');
    const target = invalid ?? (fallbackId ? document.getElementById(fallbackId) : null);
    target?.focus();
  }, [attempt, formRef, fallbackId]);
}

/** Text input wired to a Field: aria-invalid + aria-describedby for the error/helper line. */
export function describedBy(id: string, { error, helper }: { error?: unknown; helper?: unknown }) {
  if (error) return `${id}-error`;
  if (helper) return `${id}-helper`;
  return undefined;
}

/** pen: Form Field with the trailing eye icon; the icon toggles visibility. */
export function PasswordInput({
  showLabel,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { showLabel: string }) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <div className="relative w-full">
      <TextInput type={visible ? "text" : "password"} className={cn("pr-12", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={showLabel}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute top-1/2 right-[3px] flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-foreground outline-hidden focus-visible:inset-ring-2 focus-visible:inset-ring-primary"
      >
        <Icon className="size-[18px]" aria-hidden />
      </button>
    </div>
  );
}

/** Form-level message (wrong credentials, server error). */
export function FormAlert({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      tabIndex={-1}
      className="w-full rounded-sm bg-tint-salmon px-4 py-3 text-sm leading-normal text-foreground outline-hidden"
    >
      {children}
    </p>
  );
}
