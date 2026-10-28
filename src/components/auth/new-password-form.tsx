"use client";

import { useActionState, useEffect, useRef } from "react";
import { resetPassword, type AuthState } from "@/app/actions/auth";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { authMessages } from "@/i18n/messages/auth";
import { AuthHead, AuthSwitch } from "./auth-bits";
import { describedBy, PasswordInput, useFocusFirstError } from "./form-bits";

/** pen: Set new password (y7fayf), plus the expired-link state when the token stops working. */
export function NewPasswordForm({ token, initiallyInvalid }: { token: string; initiallyInvalid: boolean }) {
  const t = useMessages(authMessages);
  const f = t.fields;
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.attempt);

  const invalid = initiallyInvalid || state.tokenInvalid;
  useEffect(() => {
    // The page swaps to the expired-link message after a submit: move focus to its heading.
    if (state.tokenInvalid) document.getElementById("new-password-title")?.focus();
  }, [state.tokenInvalid, state.attempt]);

  if (invalid) {
    return (
      <>
        <AuthHead
          titleId="new-password-title"
          eyebrow={t.newPassword.eyebrow}
          title={t.newPassword.invalidTitle}
          sub={t.newPassword.invalidSub}
        />
        <ButtonLink href="/reset-password" className="w-full">
          {t.newPassword.invalidCta}
        </ButtonLink>
        <AuthSwitch href="/sign-in" linkLabel={t.newPassword.back} />
      </>
    );
  }

  const err = (key: "password" | "confirm") => {
    const code = state.errors?.[key];
    return code ? t.errors[code] : undefined;
  };

  return (
    <>
      <AuthHead
        titleId="new-password-title"
        eyebrow={t.newPassword.eyebrow}
        title={t.newPassword.title}
        sub={t.newPassword.sub}
      />
      <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-5">
        <input type="hidden" name="token" value={token} />
        <Field label={f.newPassword} htmlFor="password" error={err("password")} helper={f.passwordHelper}>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
            placeholder={f.newPasswordPlaceholder}
            showLabel={f.showPassword}
            aria-invalid={Boolean(err("password")) || undefined}
            aria-describedby={describedBy("password", { error: err("password"), helper: f.passwordHelper })}
          />
        </Field>
        <Field label={f.confirmNewPassword} htmlFor="confirm" error={err("confirm")}>
          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            required
            maxLength={72}
            placeholder={f.confirmNewPasswordPlaceholder}
            showLabel={f.showPassword}
            aria-invalid={Boolean(err("confirm")) || undefined}
            aria-describedby={describedBy("confirm", { error: err("confirm") })}
          />
        </Field>
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t.newPassword.pending : t.newPassword.submit}
        </Button>
      </form>
      <AuthSwitch href="/sign-in" linkLabel={t.newPassword.back} />
    </>
  );
}
