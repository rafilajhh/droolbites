"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import {
  updateAddress,
  updateProfile,
  type AccountState,
  type AddressField,
  type ProfileField,
} from "@/app/actions/account";
import { addressAt, quoteDelivery, type DeliveryQuote } from "@/app/actions/checkout";
import { describedBy, FormAlert, useFocusFirstError } from "@/components/auth/form-bits";
import { DeliveryPicker, type LatLng, type PinSource, type QuoteState } from "@/components/checkout/delivery-picker";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { accountMessages } from "@/i18n/messages/account";
import type { Place } from "@/lib/geocode";

type Messages = typeof accountMessages.en;

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
 * pen: Billing information card (IzCPT), now the saved delivery address with its map pin. Checkout's
 * "Use saved address" fills these fields and puts its pin on the same spot, so the fee is measured
 * from where the customer actually lives. The map works like checkout's: search, tap, drag or GPS
 * move the pin, and a pin fills the fields that are still empty (a chosen search result replaces them).
 */
export function AddressForm({
  address,
  city,
  postalCode,
  pin: savedPin,
  quote: savedQuote,
  store,
}: {
  address: string;
  city: string;
  postalCode: string;
  pin: LatLng | null;
  quote: DeliveryQuote | null;
  store: { lat: number; lng: number; maxKm: number };
}) {
  const t = useMessages(accountMessages);
  const [state, action, pending] = useActionState<AccountState<AddressField>, FormData>(updateAddress, {});
  const formRef = useRef<HTMLFormElement>(null);
  useFocusFirstError(formRef, state.errors || state.formError ? state.attempt : undefined, "address-alert");
  const err = (key: AddressField) => errorText(t, state, key);

  const [values, setValues] = useState({ address, city, postalCode });
  const [pin, setPin] = useState<LatLng | null>(savedPin);
  const [quote, setQuote] = useState<QuoteState>(savedQuote ?? { status: "idle" });
  const [pinLabel, setPinLabel] = useState<string | undefined>(undefined);
  const pinSeq = useRef(0);
  // What the map last filled in: a field still holding it (or empty) follows the next pin.
  const autoFilled = useRef<Partial<Record<keyof typeof values, string>>>({});

  const fill = (place: Pick<Place, "street" | "city" | "postal">, replace = false) =>
    setValues((v) => {
      const next = { ...v };
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
    setQuote({ status: "loading" });
    const [q, place] = await Promise.all([
      quoteDelivery(at.lat, at.lng).catch((): DeliveryQuote => ({ status: "busy" })),
      source === "map" || source === "gps" ? addressAt(at.lat, at.lng).catch(() => null) : Promise.resolve(null),
    ]);
    if (seq !== pinSeq.current) return;
    setQuote(q);
    if (place) {
      fill(place);
      setPinLabel(place.label);
    }
  };

  const input = (name: keyof typeof values, extra: React.InputHTMLAttributes<HTMLInputElement>) => {
    const error = err(name);
    return (
      <TextInput
        id={name}
        name={name}
        value={values[name]}
        onChange={(e) => setValues((v) => ({ ...v, [name]: e.target.value }))}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(name, { error })}
        {...extra}
      />
    );
  };

  return (
    <form ref={formRef} action={action} noValidate className="flex w-full flex-col gap-6">
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-[15px] leading-[23px] font-bold text-foreground">{t.address.pinTitle}</p>
          <p className="text-sm leading-[21px] text-muted-foreground">{t.address.pinSub}</p>
        </div>
        <DeliveryPicker
          store={{ lat: store.lat, lng: store.lng }}
          maxKm={store.maxKm}
          pin={pin}
          pinLabel={pinLabel}
          quote={quote}
          error={err("pin")}
          onPin={(at, source) => void movePin(at, source)}
          onPlace={(place) => {
            fill(place, true);
            void movePin({ lat: place.lat, lng: place.lng }, "search", place.label);
          }}
        />
        <input type="hidden" name="lat" value={pin?.lat ?? ""} />
        <input type="hidden" name="lng" value={pin?.lng ?? ""} />
      </div>
      <Field label={t.address.street} htmlFor="address" error={err("address")}>
        {input("address", { autoComplete: "street-address", required: true, maxLength: 255, placeholder: t.address.streetPlaceholder })}
      </Field>
      <div className="flex w-full flex-col gap-6 sm:flex-row sm:gap-4">
        <Field label={t.address.city} htmlFor="city" error={err("city")} className="sm:flex-1">
          {input("city", { autoComplete: "address-level2", required: true, maxLength: 100 })}
        </Field>
        <Field label={t.address.postalCode} htmlFor="postalCode" error={err("postalCode")} className="sm:flex-1">
          {input("postalCode", {
            autoComplete: "postal-code",
            inputMode: "numeric",
            required: true,
            maxLength: 5,
            placeholder: t.address.postalCodePlaceholder,
          })}
        </Field>
      </div>
      {state.formError ? <FormAlert id="address-alert">{t.errors[state.formError]}</FormAlert> : null}
      <SaveRow label={t.address.submit} saved={state.saved ? t.address.saved : undefined} pending={pending} variant="primary" />
    </form>
  );
}
