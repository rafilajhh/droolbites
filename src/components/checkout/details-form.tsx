"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Store, Truck } from "lucide-react";
import { saveCheckoutDetails, type DetailsState } from "@/app/actions/checkout";
import { OptionTile } from "@/components/ui/choice-tiles";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { formatRupiah } from "@/lib/format";
import { CheckoutSection } from "./checkout-section";
import { OrderSummary, type SummaryLine } from "./order-summary";
import { SummaryToggle } from "./summary-toggle";

export type DetailsValues = {
  email: string;
  fulfilment: "delivery" | "pickup";
  fullName: string;
  phone: string;
  street: string;
  apartment: string;
  city: string;
  postal: string;
};

type TextKey = Exclude<keyof DetailsValues, "fulfilment">;

const initialState: DetailsState = { errors: {}, attempt: 0 };

/**
 * Checkout · Details, after pen frame PPHfX with the owner-approved simpler
 * flow: 1 Contact (email, name, phone) and 2 Delivery or pickup (the two
 * tiles, then the Surabaya address or the store's pickup details). No
 * country/province selects, single delivery-method card or billing address.
 */
export function DetailsForm({
  initial,
  saved,
  signInHref,
  options,
  store,
  summary,
}: {
  initial: DetailsValues;
  saved: Pick<DetailsValues, "street" | "apartment" | "city" | "postal"> | null;
  signInHref: string | null;
  options: { delivery: boolean; pickup: boolean };
  store: { city: string; shortAddress: string; fullAddress: string; opensAt: string; closesAt: string; deliveryFee: number };
  summary: { lines: SummaryLine[]; itemCount: number; subtotal: number };
}) {
  const t = useMessages(checkoutMessages);
  const d = t.details;
  const [state, formAction, pending] = useActionState(saveCheckoutDetails, initialState);
  const [values, setValues] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);

  // Move focus to the first field with an error after each failed submit.
  useEffect(() => {
    if (state.attempt === 0) return;
    const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    first?.focus();
  }, [state]);

  const set = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const err = (key: keyof DetailsState["errors"]) => {
    const code = state.errors[key];
    return code ? t.errors[code] : undefined;
  };

  const input = (key: TextKey, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const error = err(key);
    return (
      <TextInput
        id={`checkout-${key}`}
        name={key}
        value={values[key]}
        onChange={set(key)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `checkout-${key}-error` : undefined}
        {...extra}
      />
    );
  };

  const delivery = values.fulfilment === "delivery";
  const fee = delivery ? store.deliveryFee : 0;
  const closed = !options.delivery && !options.pickup;

  return (
    // Below lg the Continue button is pinned to the bottom of the screen, so the page keeps room for it.
    <div className="flex w-full flex-col gap-8 px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-8 lg:flex-row lg:items-start lg:gap-12 lg:px-16 lg:pt-12 lg:pb-24">
      <form
        ref={formRef}
        action={formAction}
        noValidate
        className="flex w-full min-w-0 flex-1 flex-col gap-5"
      >
        <h1 className="type-checkout pb-3 font-display font-bold text-foreground">{d.title}</h1>

        <CheckoutSection
          id="checkout-contact"
          title={d.contact}
          meta={
            signInHref ? (
              <Link href={signInHref} className="relative text-sm leading-normal font-semibold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline">
                {d.signIn}
              </Link>
            ) : null
          }
        >
          <Field label={d.email} htmlFor="checkout-email" error={err("email")}>
            {input("email", {
              type: "email",
              autoComplete: "email",
              placeholder: d.emailPlaceholder,
              required: true,
              maxLength: 150,
            })}
          </Field>
          <div className="grid w-full gap-5 sm:grid-cols-2 sm:gap-4">
            <Field label={d.fullName} htmlFor="checkout-fullName" error={err("fullName")}>
              {input("fullName", {
                autoComplete: "name",
                placeholder: d.fullNamePlaceholder,
                required: true,
                maxLength: 100,
              })}
            </Field>
            <Field label={d.phone} htmlFor="checkout-phone" helper={d.phoneHelper} error={err("phone")}>
              {input("phone", {
                type: "tel",
                inputMode: "tel",
                autoComplete: "tel",
                placeholder: d.phonePlaceholder,
                required: true,
                maxLength: 20,
              })}
            </Field>
          </div>
        </CheckoutSection>

        <CheckoutSection
          id="checkout-receive"
          title={d.receive}
          meta={
            delivery && saved ? (
              <button
                type="button"
                onClick={() => setValues((v) => ({ ...v, ...saved }))}
                className="relative text-sm leading-normal font-semibold whitespace-nowrap text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline"
              >
                {d.useSaved}
              </button>
            ) : null
          }
        >
          {closed ? (
            <p className="text-[15px] leading-normal text-muted-foreground">{d.paused}</p>
          ) : (
            <>
              <fieldset
                className="flex w-full flex-col gap-3"
                aria-invalid={state.errors.fulfilment ? true : undefined}
                aria-describedby={state.errors.fulfilment ? "checkout-fulfilment-error" : undefined}
              >
                <legend className="sr-only">{d.receive}</legend>
                <div className="flex w-full flex-col gap-4 sm:flex-row">
                  {options.delivery ? (
                    <OptionTile
                      name="fulfilment"
                      value="delivery"
                      checked={delivery}
                      onChange={() => setValues((v) => ({ ...v, fulfilment: "delivery" }))}
                      icon={Truck}
                      title={<span className="block leading-[21px]">{d.delivery}</span>}
                      sub={<span className="block leading-5">{d.deliverySub(store.city)}</span>}
                      meta={<span className="block leading-[21px]">{formatRupiah(store.deliveryFee)}</span>}
                      className="flex-1"
                    />
                  ) : null}
                  {options.pickup ? (
                    <OptionTile
                      name="fulfilment"
                      value="pickup"
                      checked={!delivery}
                      onChange={() => setValues((v) => ({ ...v, fulfilment: "pickup" }))}
                      icon={Store}
                      title={<span className="block leading-[21px]">{d.pickup}</span>}
                      sub={<span className="block leading-5">{store.shortAddress}</span>}
                      meta={<span className="block leading-[21px] text-primary">{d.free}</span>}
                      className="flex-1"
                    />
                  ) : null}
                </div>
                {err("fulfilment") ? (
                  <p id="checkout-fulfilment-error" role="alert" className="text-[13px] leading-normal text-error">
                    {err("fulfilment")}
                  </p>
                ) : null}
              </fieldset>

              {delivery ? (
                <>
                  <Field label={d.street} htmlFor="checkout-street" error={err("street")}>
                    {input("street", {
                      autoComplete: "address-line1",
                      placeholder: d.streetPlaceholder,
                      required: true,
                      maxLength: 180,
                    })}
                  </Field>
                  <Field label={d.apartment} htmlFor="checkout-apartment" error={err("apartment")}>
                    {input("apartment", {
                      autoComplete: "address-line2",
                      placeholder: d.apartmentPlaceholder,
                      maxLength: 70,
                    })}
                  </Field>
                  <div className="grid w-full gap-5 sm:grid-cols-2 sm:gap-4">
                    <Field label={d.city} htmlFor="checkout-city" error={err("city")}>
                      {/* We only deliver within Surabaya, so the city is fixed (the server enforces it too). */}
                      {input("city", { autoComplete: "address-level2", readOnly: true, className: "bg-oat text-muted-foreground" })}
                    </Field>
                    <Field label={d.postal} htmlFor="checkout-postal" error={err("postal")}>
                      {input("postal", {
                        inputMode: "numeric",
                        autoComplete: "postal-code",
                        placeholder: d.postalPlaceholder,
                        required: true,
                        maxLength: 5,
                      })}
                    </Field>
                  </div>
                </>
              ) : (
                <p className="text-[15px] leading-normal text-muted-foreground">
                  {d.pickupNote(store.fullAddress, store.opensAt, store.closesAt)}
                </p>
              )}
            </>
          )}
        </CheckoutSection>

        <div className="flex w-full flex-col items-center gap-4 pt-2 lg:flex-row lg:gap-6">
          {/* Below lg this bar is pinned to the bottom of the screen, like the PAY bar on the payment step. */}
          <div className="fixed inset-x-0 bottom-0 z-30 flex bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] md:px-8 lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:shadow-none">
            <Button type="submit" className="w-full lg:w-auto" disabled={pending || closed}>
              {pending ? d.saving : d.continue}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6">
            <Link
              href="/shipping-policy"
              className="relative text-sm leading-normal font-semibold text-muted-foreground after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:text-foreground"
            >
              {d.shipping}
            </Link>
            <Link
              href="/privacy-policy"
              className="relative text-sm leading-normal font-semibold text-muted-foreground after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:text-foreground"
            >
              {d.privacy}
            </Link>
          </div>
        </div>
      </form>

      {/* Below lg the summary moves above the form behind a toggle bar; at lg it is the right column. */}
      <SummaryToggle
        id="checkout-summary"
        labels={t.summary}
        total={formatRupiah(summary.subtotal + fee)}
        className="order-first lg:order-none lg:w-[440px] lg:shrink-0"
      >
        <OrderSummary
          t={t.summary}
          lines={summary.lines}
          itemCount={summary.itemCount}
          subtotal={summary.subtotal}
          fulfilment={values.fulfilment}
          fee={fee}
          total={summary.subtotal + fee}
        />
      </SummaryToggle>
    </div>
  );
}
