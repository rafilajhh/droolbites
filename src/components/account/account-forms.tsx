"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import {
  changePassword,
  updateAddress,
  updateProfile,
  type AccountState,
  type AddressField,
  type PasswordField,
  type ProfileField,
} from "@/app/actions/account";
import { requestPasswordReset, type AuthState } from "@/app/actions/auth";
import { addressAt } from "@/app/actions/checkout";
import { describedBy, FormAlert, PasswordInput, useFocusFirstError } from "@/components/auth/form-bits";
import { DeliveryPicker, type LatLng, type PinSource } from "@/components/checkout/delivery-picker";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { accountMessages } from "@/i18n/messages/account";
import type { Place } from "@/lib/geocode";
import { AccountGroup } from "./account-card";

type Messages = typeof accountMessages.en;

/** The saved address's fields (everything but the pin). */
export type AddressValues = Record<Exclude<AddressField, "pin">, string>;
/** The fields a pin fills in when they are empty or still hold what the map filled before. */
type PinFilled = "address" | "city" | "postalCode";

/**
 * Field + input with the error/aria wiring shared by both account forms.
 * When the server value changes after a save the input follows; an uncontrolled
 * input would keep the old text.
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
 * pen: Billing information card (IzCPT), now the saved delivery address as a complete form in four
 * groups: who receives it, the pin on the map (no distance or fee here: those belong to an order), the
 * address with its kecamatan from the pin, and a note for the courier. Checkout's "Use saved address"
 * fills all of it and puts its pin on the same spot. Search, tap, drag or GPS move the pin, and a pin
 * fills the address fields that are still empty (a chosen search result replaces them).
 */
export function AddressForm({
  initial,
  pin: savedPin,
  store,
}: {
  initial: AddressValues;
  pin: LatLng | null;
  store: { lat: number; lng: number; maxKm: number };
}) {
  const t = useMessages(accountMessages);
  const a = t.address;
  const [state, action, pending] = useActionState<AccountState<AddressField>, FormData>(updateAddress, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.errors || state.formError ? state.attempt : undefined, "address-alert");
  const err = (key: AddressField) => errorText(t, state, key);

  const [values, setValues] = useState(initial);
  const [pin, setPin] = useState<LatLng | null>(savedPin);
  const [pinLabel, setPinLabel] = useState<string | undefined>(undefined);
  // The pin's address lookup is running: saving waits for it, so the pin and what it fills are saved together.
  const [looking, setLooking] = useState(false);
  // The save the form changed after: its "saved" note and pin error no longer describe what's shown.
  const [changedAt, setChangedAt] = useState(-1);
  const [pinMovedAt, setPinMovedAt] = useState(-1);
  // The address was retyped by hand after the pin was placed: the pin may still be at the old place.
  const [retyped, setRetyped] = useState(false);
  const pinSeq = useRef(0);
  // What the map last filled in: a field still holding it (or empty) follows the next pin.
  const autoFilled = useRef<Partial<Record<PinFilled, string>>>({});

  const fill = (place: Pick<Place, "street" | "district" | "city" | "postal">, replace = false) =>
    setValues((v) => {
      // The kecamatan always follows the pin.
      const next = { ...v, district: place.district };
      const pairs = [
        ["address", place.street],
        ["city", place.city],
        ["postalCode", place.postal],
      ] as const;
      for (const [key, value] of pairs) {
        const ours = v[key].trim() === "" || v[key] === autoFilled.current[key];
        if ((!replace && !ours) || (!value && !ours)) continue;
        next[key] = value;
        autoFilled.current[key] = value;
      }
      return next;
    });

  const movePin = async (at: LatLng, source: PinSource, label?: string) => {
    const seq = ++pinSeq.current;
    setPin(at);
    setPinLabel(label);
    setPinMovedAt(state.attempt ?? 0);
    setChangedAt(state.attempt ?? 0);
    setRetyped(false);
    // A search result already carries its address; a tap, drag or GPS fix is looked up.
    if (source !== "map" && source !== "gps") return;
    setValues((v) => ({ ...v, district: "" }));
    setLooking(true);
    const place = await addressAt(at.lat, at.lng).catch(() => null);
    if (seq !== pinSeq.current) return;
    setLooking(false);
    if (place) {
      fill(place);
      setPinLabel(place.label);
    }
  };

  const change = (name: keyof AddressValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setValues((v) => ({ ...v, [name]: value }));
    setChangedAt(state.attempt ?? 0);
    if (pin && (name === "address" || name === "city") && value !== autoFilled.current[name]) setRetyped(true);
  };

  const input = (name: keyof AddressValues, extra: React.InputHTMLAttributes<HTMLInputElement>) => {
    const error = err(name);
    return (
      <TextInput
        id={name}
        name={name}
        value={values[name]}
        onChange={change(name)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, { error, helper: extra["aria-describedby"] })}
        {...extra}
      />
    );
  };

  const twoUp = "grid w-full gap-6 sm:grid-cols-2 sm:gap-4";

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col">
      <AccountGroup id="address-recipient" title={a.recipient}>
        <div className={twoUp}>
          <Field label={a.recipientName} htmlFor="recipientName" error={err("recipientName")}>
            {input("recipientName", { autoComplete: "shipping name", required: true, maxLength: 100, placeholder: t.info.fullNamePlaceholder })}
          </Field>
          <Field label={a.recipientPhone} htmlFor="recipientPhone" error={err("recipientPhone")}>
            {input("recipientPhone", {
              type: "tel",
              inputMode: "tel",
              autoComplete: "shipping tel",
              required: true,
              maxLength: 20,
              placeholder: t.info.phonePlaceholder,
            })}
          </Field>
        </div>
      </AccountGroup>

      <AccountGroup id="address-location" title={a.location}>
        <DeliveryPicker
          store={{ lat: store.lat, lng: store.lng }}
          maxKm={store.maxKm}
          pin={pin}
          pinLabel={pinLabel}
          quote={{ status: "idle" }}
          showQuote={false}
          error={pinMovedAt === (state.attempt ?? 0) ? undefined : err("pin")}
          onPin={(at, source) => void movePin(at, source)}
          onPlace={(place) => {
            fill(place, true);
            void movePin({ lat: place.lat, lng: place.lng }, "search", place.label);
          }}
        />
        {retyped ? (
          <p role="status" className="rounded-sm bg-tint-mustard px-4 py-3 text-sm leading-[21px] font-semibold text-foreground">
            {a.checkPin}
          </p>
        ) : null}
        <input type="hidden" name="lat" value={pin?.lat ?? ""} />
        <input type="hidden" name="lng" value={pin?.lng ?? ""} />
      </AccountGroup>

      <AccountGroup id="address-details" title={a.details}>
        <Field label={a.street} htmlFor="address" error={err("address")}>
          {input("address", { autoComplete: "street-address", required: true, maxLength: 255, placeholder: a.streetPlaceholder })}
        </Field>
        <Field label={a.detail} htmlFor="addressDetail" error={err("addressDetail")}>
          {input("addressDetail", { autoComplete: "address-line2", maxLength: 70, placeholder: a.detailPlaceholder })}
        </Field>
        <div className="grid w-full gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,11.5rem)] sm:gap-4">
          {/* The kecamatan comes from the pin, so it reads but can't be typed. */}
          <Field label={a.district} htmlFor="district" helper={a.districtHelp}>
            {input("district", {
              readOnly: true,
              // OpenStreetMap doesn't know every kecamatan; the field then stays empty, which is fine.
              placeholder: pin && !looking ? a.districtUnknown : a.districtEmpty,
              className: "bg-card text-ellipsis",
              "aria-describedby": "district-helper",
            })}
          </Field>
          <Field label={a.city} htmlFor="city" error={err("city")}>
            {input("city", { autoComplete: "address-level2", required: true, maxLength: 100 })}
          </Field>
          <Field label={a.postalCode} htmlFor="postalCode" error={err("postalCode")}>
            {input("postalCode", {
              autoComplete: "postal-code",
              inputMode: "numeric",
              required: true,
              maxLength: 5,
              placeholder: a.postalCodePlaceholder,
            })}
          </Field>
        </div>
      </AccountGroup>

      <AccountGroup id="address-courier" title={a.courier}>
        <Field label={a.note} htmlFor="note" error={err("note")}>
          <TextArea
            id="note"
            name="note"
            rows={2}
            maxLength={200}
            value={values.note}
            onChange={change("note")}
            placeholder={a.notePlaceholder}
            aria-invalid={err("note") ? true : undefined}
            className="min-h-[88px]"
          />
        </Field>
        {state.formError ? <FormAlert id="address-alert">{t.errors[state.formError]}</FormAlert> : null}
        <SaveRow
          label={a.submit}
          saved={state.saved && changedAt !== state.attempt ? a.saved : undefined}
          pending={pending || looking}
          variant="primary"
        />
      </AccountGroup>
    </form>
  );
}

/**
 * Change the password of an email-and-password account (current, new, confirm). Saving clears the
 * fields; what was typed survives a failed save.
 */
export function PasswordForm({ email }: { email: string }) {
  const t = useMessages(accountMessages);
  const s = t.signIn;
  const [state, action, pending] = useActionState<AccountState<PasswordField>, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.errors || state.formError ? state.attempt : undefined, "password-alert");
  useEffect(() => {
    if (state.saved) formRef.current?.reset();
  }, [state]);
  const err = (key: PasswordField) => errorText(t, state, key);

  // Submitting through a transition keeps what was typed when the action returns an error.
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => action(data));
  };

  const password = (name: PasswordField, label: string, autoComplete: string, helper?: string) => (
    <Field label={label} htmlFor={`account-pw-${name}`} error={err(name)} helper={helper}>
      <PasswordInput
        id={`account-pw-${name}`}
        name={name}
        autoComplete={autoComplete}
        maxLength={72}
        required
        showLabel={s.show}
        aria-invalid={err(name) ? true : undefined}
        aria-describedby={describedBy(`account-pw-${name}`, { error: err(name), helper })}
      />
    </Field>
  );

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="account-pw-title"
      className="flex w-full flex-col gap-5 pt-1"
    >
      <h4 id="account-pw-title" className="text-sm leading-[18px] font-bold text-foreground">
        {s.change}
      </h4>
      {/* Lets password managers file the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      {password("current", s.current, "current-password")}
      <div className="grid w-full gap-6 sm:grid-cols-2 sm:gap-4">
        {password("password", s.next, "new-password", s.nextHelp)}
        {password("confirm", s.confirm, "new-password")}
      </div>
      {state.formError ? <FormAlert id="password-alert">{t.errors[state.formError]}</FormAlert> : null}
      <SaveRow label={pending ? s.saving : s.submit} saved={state.saved ? s.saved : undefined} pending={pending} variant="secondary" />
    </form>
  );
}

/**
 * A Google account without a password: the reset email sets one (the same link and page as "Forgot
 * password"), so the customer can also sign in with email and password.
 */
export function SetPasswordLink({ email }: { email: string }) {
  const s = useMessages(accountMessages).signIn;
  const [state, action, pending] = useActionState<AuthState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="flex w-full flex-col items-start gap-3">
      <input type="hidden" name="email" value={email} />
      <p className="text-[15px] leading-[23px] text-foreground">{s.noPassword}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? s.sending : s.sendLink}
        </Button>
        <p role="status" className="flex items-center gap-2 text-sm leading-normal font-semibold text-success">
          {state.sent && !pending ? (
            <>
              <CircleCheck className="size-[18px]" aria-hidden />
              {s.linkSent(email)}
            </>
          ) : null}
        </p>
      </div>
    </form>
  );
}
