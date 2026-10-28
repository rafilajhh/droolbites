"use client";

import { useActionState, useEffect, useRef } from "react";
import { CircleCheck } from "lucide-react";
import {
  updateBilling,
  updateProfile,
  type AccountState,
  type BillingField,
  type ProfileField,
} from "@/app/actions/account";
import { describedBy, FormAlert, useFocusFirstError } from "@/components/auth/form-bits";
import { Button } from "@/components/ui/button";
import { Field, Select, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { accountMessages } from "@/i18n/messages/account";

type Messages = typeof accountMessages.en;

/**
 * Field + input with the error/aria wiring shared by both account forms.
 * Both forms show the account name, so when the server value changes (the other
 * form saved it) the input follows; an uncontrolled input would keep the old text.
 */
function AccountInput({
  name,
  label,
  error,
  helper,
  className,
  defaultValue,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "defaultValue"> & {
  name: string;
  label: string;
  error?: string;
  helper?: string;
  defaultValue: string;
}) {
  useEffect(() => {
    const input = document.getElementById(name);
    // Never overwrite text the user is typing right now.
    if (input instanceof HTMLInputElement && input !== document.activeElement) input.value = defaultValue;
  }, [name, defaultValue]);
  return (
    <Field label={label} htmlFor={name} error={error} helper={helper} className={className}>
      <TextInput
        defaultValue={defaultValue}
        id={name}
        name={name}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describedBy(name, { error, helper })}
        {...props}
      />
    </Field>
  );
}

/** Save button with the success note next to it (announced politely, no layout shift). */
function SaveRow({ label, saved, pending, variant }: { label: string; saved?: string; pending: boolean; variant: "primary" | "secondary" }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <Button type="submit" variant={variant} disabled={pending}>
        {label}
      </Button>
      <p role="status" className="flex items-center gap-2 text-sm leading-normal font-semibold text-success">
        {saved ? (
          <>
            <CircleCheck className="size-[18px]" aria-hidden />
            {saved}
          </>
        ) : null}
      </p>
    </div>
  );
}

function errorText<F extends string>(t: Messages, state: AccountState<F>, key: F) {
  const code = state.errors?.[key];
  return code ? t.errors[code] : undefined;
}

/** pen: Account information card form (biVPB). */
export function ProfileForm({ fullName, phone, email }: { fullName: string; phone: string; email: string }) {
  const t = useMessages(accountMessages);
  const [state, action, pending] = useActionState<AccountState<ProfileField>, FormData>(updateProfile, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.errors || state.formError ? state.attempt : undefined, "profile-alert");
  const err = (key: ProfileField) => errorText(t, state, key);

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-4">
        <AccountInput
          className="sm:flex-1"
          name="fullName"
          label={t.info.fullName}
          autoComplete="name"
          required
          maxLength={100}
          placeholder={t.info.fullNamePlaceholder}
          defaultValue={state.values?.fullName ?? fullName}
          error={err("fullName")}
        />
        <AccountInput
          className="sm:flex-1"
          name="phone"
          label={t.info.phone}
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          maxLength={20}
          placeholder={t.info.phonePlaceholder}
          defaultValue={state.values?.phone ?? phone}
          error={err("phone")}
        />
      </div>
      <AccountInput
        name="email"
        label={t.info.email}
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        maxLength={150}
        placeholder={t.info.emailPlaceholder}
        defaultValue={state.values?.email ?? email}
        error={err("email")}
      />
      {state.formError ? <FormAlert id="profile-alert">{t.errors[state.formError]}</FormAlert> : null}
      <SaveRow label={t.info.submit} saved={state.saved ? t.info.saved : undefined} pending={pending} variant="primary" />
    </form>
  );
}

/**
 * pen: Billing information card form (IzCPT). The schema stores one name per
 * user, so "Billing name" is users.full_name; the address is the saved
 * delivery/billing address. Droolbites only sells in Indonesia, so Country is fixed.
 */
export function BillingForm({
  billingName,
  address,
  city,
  postalCode,
}: {
  billingName: string;
  address: string;
  city: string;
  postalCode: string;
}) {
  const t = useMessages(accountMessages);
  const [state, action, pending] = useActionState<AccountState<BillingField>, FormData>(updateBilling, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.errors || state.formError ? state.attempt : undefined, "billing-alert");
  const err = (key: BillingField) => errorText(t, state, key);

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-4">
        <AccountInput
          className="sm:flex-1"
          name="billingName"
          label={t.billing.name}
          autoComplete="billing name"
          required
          maxLength={100}
          placeholder={t.billing.namePlaceholder}
          helper={t.billing.nameHelper}
          defaultValue={state.values?.billingName ?? billingName}
          error={err("billingName")}
        />
        <Field label={t.billing.country} htmlFor="country" className="sm:flex-1">
          <Select id="country" name="country" autoComplete="billing country" defaultValue="ID">
            <option value="ID">{t.billing.countryIndonesia}</option>
          </Select>
        </Field>
      </div>
      <AccountInput
        name="address"
        label={t.billing.address}
        autoComplete="billing street-address"
        required
        maxLength={255}
        placeholder={t.billing.addressPlaceholder}
        defaultValue={state.values?.address ?? address}
        error={err("address")}
      />
      <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-4">
        <AccountInput
          className="sm:flex-1"
          name="city"
          label={t.billing.city}
          autoComplete="billing address-level2"
          required
          maxLength={100}
          placeholder={t.billing.cityPlaceholder}
          defaultValue={state.values?.city ?? city}
          error={err("city")}
        />
        <AccountInput
          className="sm:flex-1"
          name="postalCode"
          label={t.billing.postalCode}
          autoComplete="billing postal-code"
          inputMode="numeric"
          required
          maxLength={5}
          placeholder={t.billing.postalCodePlaceholder}
          defaultValue={state.values?.postalCode ?? postalCode}
          error={err("postalCode")}
        />
      </div>
      {state.formError ? <FormAlert id="billing-alert">{t.errors[state.formError]}</FormAlert> : null}
      <SaveRow label={t.billing.submit} saved={state.saved ? t.billing.saved : undefined} pending={pending} variant="secondary" />
    </form>
  );
}
