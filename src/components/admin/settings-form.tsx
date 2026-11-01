"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { Check, Store, Truck } from "lucide-react";
import {
  saveStoreSettings,
  type SettingsErrorKey,
  type SettingsField,
  type SettingsState,
} from "@/app/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { adminMessages } from "@/i18n/messages/admin";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import { WEEK_DAYS } from "./rules";
import { Card, PageHead, Toggle } from "./ui";

export type SettingsValues = {
  storeName: string;
  city: string;
  email: string;
  phone: string;
  address: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  opensAt: string;
  closesAt: string;
  openDays: string[];
  deliveryFee: number;
  vaEnabled: boolean;
  retailEnabled: boolean;
  qrisEnabled: boolean;
  ewalletEnabled: boolean;
};

const helperClasses = "text-[13px] leading-5 text-muted-foreground";

/** pen: Admin / Store settings (j3evM). Every field maps to a store_settings column. */
export function SettingsForm({ values }: { values: SettingsValues }) {
  const t = useMessages(adminMessages).settings;
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(saveStoreSettings, {
    status: "idle",
    errors: {},
  });
  const [storeName, setStoreName] = useState(values.storeName);
  const [city, setCity] = useState(values.city);
  const [pickup, setPickup] = useState(values.pickupEnabled);
  const [delivery, setDelivery] = useState(values.deliveryEnabled);
  const [fee, setFee] = useState(String(values.deliveryFee));
  const formRef = useRef<HTMLFormElement>(null);

  // After a failed save, move focus to the first highlighted field.
  useEffect(() => {
    if (state.status === "error") formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const errors = state.errors;
  const err = (field: SettingsField) => {
    const key: SettingsErrorKey | undefined = errors[field];
    return key ? t.errors[key] : undefined;
  };
  const invalid = (field: SettingsField) =>
    errors[field] ? { "aria-invalid": true as const, "aria-describedby": `settings-${field}-error` } : {};

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const feedback =
    state.status === "saved" ? t.saved : state.status === "error" ? (err("form") ?? t.fix) : "";
  const message = pending ? "" : feedback;
  const messageTone = state.status === "saved" ? "text-success" : "text-error";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="flex w-full flex-col gap-6">
      <PageHead
        title={t.title}
        sub={t.sub}
        action={
          // Below lg the save button lives in the sticky bar at the bottom; the status stays here for screen readers.
          <div className="flex flex-wrap items-center gap-4 max-lg:contents">
            <p
              role="status"
              className={cn(message ? "text-sm leading-[21px] font-semibold max-lg:sr-only" : "sr-only", messageTone)}
            >
              {message}
            </p>
            <Button type="submit" disabled={pending} className="max-lg:hidden">
              {pending ? t.saving : t.save}
            </Button>
          </div>
        }
      />

      {/* One full-width stack: store info, the two order options side by side, hours, payments. */}
      <div className="flex w-full flex-col gap-6">
        <Card className="flex min-w-0 flex-col gap-4 p-6">
          <h2 className="font-display text-[22px] leading-[33px] font-bold">{t.info}</h2>
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <Field label={t.storeName} htmlFor="settings-storeName" error={err("storeName")} className="flex-1">
              <TextInput
                id="settings-storeName"
                name="storeName"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                maxLength={100}
                required
                {...invalid("storeName")}
              />
            </Field>
            <Field label={t.city} htmlFor="settings-city" error={err("city")} className="flex-1">
              <TextInput
                id="settings-city"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={100}
                required
                {...invalid("city")}
              />
            </Field>
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <Field label={t.email} htmlFor="settings-email" error={err("email")} className="flex-1">
              <TextInput
                id="settings-email"
                name="email"
                type="email"
                defaultValue={values.email}
                maxLength={150}
                required
                {...invalid("email")}
              />
            </Field>
            <Field label={t.phone} htmlFor="settings-phone" error={err("phone")} className="flex-1">
              <TextInput
                id="settings-phone"
                name="phone"
                type="tel"
                defaultValue={values.phone}
                maxLength={20}
                required
                {...invalid("phone")}
              />
            </Field>
          </div>
          <Field label={t.address} htmlFor="settings-address" error={err("address")}>
            <TextInput
              id="settings-address"
              name="address"
              defaultValue={values.address}
              maxLength={255}
              required
              aria-describedby={errors.address ? "settings-address-error" : "settings-address-help"}
              aria-invalid={errors.address ? true : undefined}
            />
            <p id="settings-address-help" className={helperClasses}>
              {t.addressHelp}
            </p>
          </Field>
        </Card>

        <div className="grid w-full gap-4 sm:grid-cols-2">
          <ToggleCard
            id="settings-pickup"
            name="pickupEnabled"
            icon={<Store className="size-5 text-primary" aria-hidden />}
            title={t.pickup}
            sub={t.pickupSub}
            checked={pickup}
            onChange={setPickup}
          />
          <ToggleCard
            id="settings-delivery"
            name="deliveryEnabled"
            icon={<Truck className="size-5 text-primary" aria-hidden />}
            title={t.delivery}
            sub={t.deliverySub}
            checked={delivery}
            onChange={setDelivery}
          />
          {errors.fulfilment ? (
            <p id="settings-fulfilment-error" role="alert" className="text-[13px] leading-5 text-error sm:col-span-2">
              {err("fulfilment")}
            </p>
          ) : null}
        </div>

        <Card className="flex min-w-0 flex-col gap-4 p-6">
          <h2 className="font-display text-[22px] leading-[33px] font-bold">{t.hours}</h2>
          <div className="flex w-full flex-col gap-4 sm:flex-row">
            <Field label={t.opensAt} htmlFor="settings-opensAt" error={err("opensAt")} className="flex-1">
              <TextInput
                id="settings-opensAt"
                name="opensAt"
                defaultValue={values.opensAt}
                inputMode="text"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="10:00"
                maxLength={5}
                required
                {...invalid("opensAt")}
              />
            </Field>
            <Field label={t.closesAt} htmlFor="settings-closesAt" error={err("closesAt")} className="flex-1">
              <TextInput
                id="settings-closesAt"
                name="closesAt"
                defaultValue={values.closesAt}
                inputMode="text"
                pattern="[0-2][0-9]:[0-5][0-9]"
                placeholder="21:00"
                maxLength={5}
                required
                {...invalid("closesAt")}
              />
            </Field>
            <Field label={t.deliveryFee} htmlFor="settings-deliveryFee" error={err("deliveryFee")} className="flex-1">
              <TextInput
                id="settings-deliveryFee"
                name="deliveryFee"
                inputMode="numeric"
                value={fee ? formatRupiah(Number(fee)) : ""}
                onChange={(e) => setFee(e.target.value.replace(/\D/g, "").slice(0, 8))}
                placeholder="Rp0"
                required
                {...invalid("deliveryFee")}
              />
            </Field>
          </div>
          <p className={helperClasses}>{t.hoursHelp}</p>
          <fieldset className="flex w-full flex-col gap-2" aria-describedby={errors.openDays ? "settings-openDays-error" : undefined}>
            <legend className="mb-2 text-sm leading-[18px] font-semibold">{t.openDays}</legend>
            <div className="flex flex-wrap gap-2">
              {WEEK_DAYS.map((day) => (
                <label
                  key={day}
                  className="relative cursor-pointer after:absolute after:-inset-1 after:content-['']"
                >
                  <input
                    type="checkbox"
                    name="openDays"
                    value={day}
                    defaultChecked={values.openDays.includes(day)}
                    className="peer absolute inset-0 cursor-pointer opacity-0"
                  />
                  <span className="inline-flex items-center gap-1 rounded-pill bg-oat px-3 py-1.5 text-[13px] leading-4 font-semibold text-muted-foreground transition-colors peer-checked:bg-mint peer-checked:text-foreground peer-checked:[&>svg]:block peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight">
                    <Check className="hidden size-3.5 shrink-0 stroke-[2.5]" aria-hidden />
                    {t.days[day]}
                  </span>
                </label>
              ))}
            </div>
            {errors.openDays ? (
              <p id="settings-openDays-error" role="alert" className="text-[13px] leading-5 text-error">
                {err("openDays")}
              </p>
            ) : null}
          </fieldset>
        </Card>

        <Card className="flex w-full flex-col gap-4 p-6">
          <h2 className="font-display text-[22px] leading-[33px] font-bold">{t.payments}</h2>
          <PaymentToggle id="settings-va" name="vaEnabled" title={t.va} sub={t.vaSub} defaultChecked={values.vaEnabled} />
          <PaymentToggle
            id="settings-retail"
            name="retailEnabled"
            title={t.retail}
            sub={t.retailSub}
            defaultChecked={values.retailEnabled}
          />
          <PaymentToggle
            id="settings-qris"
            name="qrisEnabled"
            title={t.qris}
            sub={t.qrisSub}
            defaultChecked={values.qrisEnabled}
          />
          <PaymentToggle
            id="settings-ewallet"
            name="ewalletEnabled"
            title={t.ewallet}
            sub={t.ewalletSub}
            defaultChecked={values.ewalletEnabled}
          />
          {errors.payments ? (
            <p role="alert" className="text-[13px] leading-5 text-error">
              {err("payments")}
            </p>
          ) : null}
        </Card>
      </div>

      <div className="sticky bottom-0 z-20 -mx-4 -mb-6 flex items-center gap-3 bg-background px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] sm:-mx-6 sm:px-6 lg:hidden">
        <p aria-hidden className={cn("min-w-0 flex-1 text-sm leading-[21px] font-semibold", messageTone)}>
          {message}
        </p>
        <Button type="submit" disabled={pending} className="shrink-0">
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}

function ToggleCard({
  id,
  name,
  icon,
  title,
  sub,
  checked,
  onChange,
}: {
  id: string;
  name: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <Card as="div" className="flex w-full gap-3.5 p-6">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-mint">{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={id} className="text-base leading-6 font-bold">
          {title}
        </label>
        <p id={`${id}-sub`} className="text-sm leading-[21px] text-muted-foreground">
          {sub}
        </p>
      </div>
      <Toggle
        id={id}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={`${id}-sub`}
      />
    </Card>
  );
}

function PaymentToggle({
  id,
  name,
  title,
  sub,
  defaultChecked,
}: {
  id: string;
  name: string;
  title: string;
  sub: string;
  defaultChecked: boolean;
}) {
  return (
    <div className="flex w-full gap-3.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <label htmlFor={id} className="text-base leading-6 font-bold">
          {title}
        </label>
        <p id={`${id}-sub`} className="text-sm leading-[21px] text-muted-foreground">
          {sub}
        </p>
      </div>
      <Toggle id={id} name={name} defaultChecked={defaultChecked} aria-describedby={`${id}-sub`} />
    </div>
  );
}
