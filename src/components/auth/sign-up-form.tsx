"use client";

import { useActionState, useRef } from "react";
import { signUp, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { authMessages } from "@/i18n/messages/auth";
import { describedBy, FormAlert, PasswordInput, useFocusFirstError } from "./form-bits";

export function SignUpForm({ next }: { next?: string }) {
  const t = useMessages(authMessages);
  const f = t.fields;
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt, "sign-up-alert");

  const err = (key: "fullName" | "email" | "password" | "confirm") => {
    const code = state.errors?.[key];
    return code ? t.errors[code] : undefined;
  };

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Field label={f.fullName} htmlFor="fullName" error={err("fullName")}>
        <TextInput
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          maxLength={100}
          placeholder={f.fullNamePlaceholder}
          defaultValue={state.values?.fullName}
          aria-invalid={Boolean(err("fullName")) || undefined}
          aria-describedby={describedBy("fullName", { error: err("fullName") })}
        />
      </Field>
      <Field label={f.email} htmlFor="email" error={err("email")}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={150}
          placeholder={f.emailPlaceholder}
          defaultValue={state.values?.email}
          aria-invalid={Boolean(err("email")) || undefined}
          aria-describedby={describedBy("email", { error: err("email") })}
        />
      </Field>
      <Field label={f.password} htmlFor="password" error={err("password")} helper={f.passwordHelper}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={72}
          placeholder={f.createPasswordPlaceholder}
          showLabel={f.showPassword}
          aria-invalid={Boolean(err("password")) || undefined}
          aria-describedby={describedBy("password", { error: err("password"), helper: f.passwordHelper })}
        />
      </Field>
      <Field label={f.confirmPassword} htmlFor="confirm" error={err("confirm")}>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          maxLength={72}
          placeholder={f.confirmPasswordPlaceholder}
          showLabel={f.showPassword}
          aria-invalid={Boolean(err("confirm")) || undefined}
          aria-describedby={describedBy("confirm", { error: err("confirm") })}
        />
      </Field>
      {state.formError ? <FormAlert id="sign-up-alert">{t.errors[state.formError]}</FormAlert> : null}
      <Button type="submit" disabled={pending} className="w-full">
        {t.signUp.submit}
      </Button>
    </form>
  );
}
