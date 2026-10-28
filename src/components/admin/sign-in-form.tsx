"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { adminSignIn, type AdminSignInState } from "@/app/actions/admin/auth";
import { Button } from "@/components/ui/button";
import { Field, inputClasses } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";

export function AdminSignInForm({ helpEmail }: { helpEmail: string }) {
  const t = useMessages(adminMessages).signIn;
  const [state, action, pending] = useActionState<AdminSignInState, FormData>(adminSignIn, { error: null, email: "" });
  const [show, setShow] = useState(false);
  const error = state.error ? t[state.error] : null;

  return (
    <form action={action} className="flex w-full flex-col gap-5" noValidate>
      <Field label={t.email} htmlFor="admin-email">
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          placeholder={t.emailPlaceholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "admin-signin-error" : undefined}
          className={inputClasses}
        />
      </Field>
      <Field label={t.password} htmlFor="admin-password">
        <div className="relative w-full">
          <input
            id="admin-password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder={t.passwordPlaceholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "admin-signin-error" : undefined}
            className={cn(inputClasses, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={t.showPassword}
            aria-pressed={show}
            className="absolute top-1/2 right-1.5 flex size-10 -translate-y-1/2 items-center after:absolute after:-inset-0.5 after:content-[''] justify-center rounded-sm text-foreground hover:bg-card"
          >
            {show ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
          </button>
        </div>
      </Field>
      {error ? (
        <p id="admin-signin-error" role="alert" className="text-sm leading-[21px] text-error">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? t.submitting : t.submit}
      </Button>
      <div className="flex w-full flex-wrap items-start justify-between gap-2 text-sm leading-[21px]">
        <a href={`mailto:${helpEmail}`} className="text-muted-foreground underline-offset-2 hover:underline">
          {t.help}
        </a>
        <Link href="/" className="font-bold text-foreground underline-offset-2 hover:underline">
          {t.storefront}
        </Link>
      </div>
    </form>
  );
}
