"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import {
  changeAdminPassword,
  type PasswordErrorKey,
  type PasswordField,
  type PasswordState,
} from "@/app/actions/admin/account";
import { Button } from "@/components/ui/button";
import { Field, inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminExtraMessages } from "@/i18n/messages/admin-extra";
import { cn } from "@/lib/cn";
import { Card } from "./ui";

/** Store settings → Admin account: change the signed-in admin's password. */
export function PasswordForm({ email, className }: { email: string; className?: string }) {
  const t = useMessages(adminExtraMessages).account;
  const [state, formAction, pending] = useActionState<PasswordState, FormData>(changeAdminPassword, {
    status: "idle",
    errors: {},
  });
  const formRef = useRef<HTMLFormElement>(null);

  // Saved: clear the fields. Failed: move focus to the first highlighted field.
  useEffect(() => {
    if (state.status === "saved") formRef.current?.reset();
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const err = (field: PasswordField) => {
    const key: PasswordErrorKey | undefined = state.errors[field];
    return key ? t.errors[key] : undefined;
  };

  // Submitting through a transition keeps what was typed when the action returns an error.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const message = pending ? "" : state.status === "saved" ? t.saved : state.status === "error" ? (err("form") ?? t.fix) : "";

  return (
    <Card className={cn("flex w-full min-w-0 flex-col gap-4 p-6", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-[22px] leading-[33px] font-bold">{t.title}</h2>
        <p className="text-sm leading-[21px] text-muted-foreground">{t.sub}</p>
      </div>
      <form ref={formRef} onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-4">
        {/* Lets password managers file the new password under the right account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        <div className="grid w-full gap-4 md:grid-cols-3">
          <PasswordInput
            id="admin-pw-current"
            name="current"
            label={t.current}
            autoComplete="current-password"
            error={err("current")}
            showLabel={t.show}
          />
          <PasswordInput
            id="admin-pw-new"
            name="password"
            label={t.next}
            autoComplete="new-password"
            error={err("password")}
            helper={t.nextHelp}
            showLabel={t.show}
          />
          <PasswordInput
            id="admin-pw-confirm"
            name="confirm"
            label={t.confirm}
            autoComplete="new-password"
            error={err("confirm")}
            showLabel={t.show}
          />
        </div>
        <div className="flex w-full flex-wrap items-center justify-end gap-4">
          <p
            role="status"
            className={cn(
              "min-w-0 flex-1 text-sm leading-[21px] font-semibold",
              state.status === "saved" ? "text-success" : "text-error",
            )}
          >
            {message}
          </p>
          <Button type="submit" disabled={pending} className="max-sm:w-full">
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordInput({
  id,
  name,
  label,
  autoComplete,
  error,
  helper,
  showLabel,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  error?: string;
  helper?: string;
  showLabel: string;
}) {
  const [show, setShow] = useState(false);
  const describedBy = error ? `${id}-error` : helper ? `${id}-helper` : undefined;
  return (
    <Field label={label} htmlFor={id} error={error} helper={helper}>
      <div className="relative w-full">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          maxLength={72}
          required
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(inputClasses, "pr-12")}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={showLabel}
          aria-pressed={show}
          aria-controls={id}
          className="absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center justify-center rounded-sm text-foreground after:absolute after:-inset-0.5 after:content-[''] hover:bg-card"
        >
          {show ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}
