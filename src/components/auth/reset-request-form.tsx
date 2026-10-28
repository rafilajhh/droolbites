"use client";

import { useActionState, useRef } from "react";
import { MailCheck } from "lucide-react";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { authMessages } from "@/i18n/messages/auth";
import { describedBy, useFocusFirstError } from "./form-bits";

export function ResetRequestForm() {
  const t = useMessages(authMessages);
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt);

  const emailError = state.errors?.email && t.errors[state.errors.email];

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-5">
      <Field label={t.fields.email} htmlFor="email" error={emailError}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder={t.fields.emailPlaceholder}
          defaultValue={state.values?.email}
          aria-invalid={Boolean(emailError) || undefined}
          aria-describedby={describedBy("email", { error: emailError })}
        />
      </Field>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.reset.pending : state.sent ? t.reset.resend : t.reset.submit}
      </Button>
      <div role="status" className="empty:-mt-5">
        {state.sent ? (
          <p className="flex w-full items-start gap-3 rounded-sm bg-mint p-4 text-sm leading-normal text-foreground">
            <MailCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="flex-1">{t.reset.notice}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}
