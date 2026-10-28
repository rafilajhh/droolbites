"use client";

import Link from "next/link";
import { useActionState, useRef } from "react";
import { signIn, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { authMessages } from "@/i18n/messages/auth";
import { describedBy, FormAlert, PasswordInput, useFocusFirstError } from "./form-bits";

export function SignInForm({ next }: { next?: string }) {
  const t = useMessages(authMessages);
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt, "sign-in-alert");

  const emailError = state.errors?.email && t.errors[state.errors.email];
  const passwordError = state.errors?.password && t.errors[state.errors.password];

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
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
      <Field label={t.fields.password} htmlFor="password" error={passwordError}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          placeholder={t.fields.passwordPlaceholder}
          showLabel={t.fields.showPassword}
          aria-invalid={Boolean(passwordError) || undefined}
          aria-describedby={describedBy("password", { error: passwordError })}
        />
      </Field>
      <div className="flex w-full justify-end">
        <Link
          href="/reset-password"
          className="relative text-sm leading-normal font-semibold text-foreground underline-offset-4 after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
        >
          {t.signIn.forgot}
        </Link>
      </div>
      {state.formError ? <FormAlert id="sign-in-alert">{t.errors[state.formError]}</FormAlert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.signIn.pending : t.signIn.submit}
      </Button>
    </form>
  );
}
