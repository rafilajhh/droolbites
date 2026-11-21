"use client";

import { useActionState, useRef } from "react";
import { MailCheck } from "lucide-react";
import { findOrder, type FindOrderState } from "@/app/actions/find-order";
import { describedBy, FormAlert, useFocusFirstError } from "@/components/auth/form-bits";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { findOrderMessages } from "@/i18n/messages/pages/find-order";

/** /orders/find: order number + checkout email; a match emails the order's link there (the answer is the same either way). */
export function FindOrderForm() {
  const t = useMessages(findOrderMessages);
  const [state, action, pending] = useActionState<FindOrderState, FormData>(findOrder, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt, "find-order-alert");

  const numberError = state.errors?.orderNumber && t.errors.orderNumber;
  const emailError = state.errors?.email && t.errors.email;

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-5">
      <Field label={t.orderNumber} htmlFor="find-order-number" error={numberError || undefined} helper={t.orderNumberHelper}>
        <TextInput
          id="find-order-number"
          name="orderNumber"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          required
          maxLength={20}
          placeholder={t.orderNumberPlaceholder}
          defaultValue={state.values?.orderNumber}
          aria-invalid={Boolean(numberError) || undefined}
          aria-describedby={describedBy("find-order-number", { error: numberError, helper: t.orderNumberHelper })}
        />
      </Field>
      <Field label={t.email} htmlFor="find-order-email" error={emailError || undefined}>
        <TextInput
          id="find-order-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={150}
          placeholder={t.emailPlaceholder}
          defaultValue={state.values?.email}
          aria-invalid={Boolean(emailError) || undefined}
          aria-describedby={describedBy("find-order-email", { error: emailError })}
        />
      </Field>
      {state.formError ? <FormAlert id="find-order-alert">{t.errors[state.formError]}</FormAlert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.pending : state.sent ? t.resend : t.submit}
      </Button>
      <div role="status" className="empty:-mt-5">
        {state.sent ? (
          <p id="find-order-sent" className="flex w-full items-start gap-3 rounded-sm bg-mint p-4 text-sm leading-normal text-foreground">
            <MailCheck className="size-5 shrink-0 text-primary" aria-hidden />
            <span className="flex-1">{t.sent}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}
