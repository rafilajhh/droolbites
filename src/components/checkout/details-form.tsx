"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Store, Truck } from "lucide-react";
import { addressAt, findPlaces, quoteDelivery, saveCheckoutDetails, type DeliveryQuote, type DetailsState } from "@/app/actions/checkout";
import { OptionTile } from "@/components/ui/choice-tiles";
import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { formatRupiah } from "@/lib/format";
import type { Place } from "@/lib/geocode";
import { CheckoutSection } from "./checkout-section";
import { DeliveryPicker, type LatLng, type PinSource, type QuoteState } from "./delivery-picker";
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
type AddressKey = "street" | "city" | "postal";

const initialState: DetailsState = { errors: {}, attempt: 0 };

/**
 * Checkout · Details, after pen frame PPHfX with the owner-approved simpler
 * flow: 1 Contact (email, name, phone) and 2 Delivery or pickup (the two
 * tiles, then the delivery pin on the map with its distance and fee, and the
 * address, or the store's pickup details). No country/province selects,
 * single delivery-method card or billing address.
 */
export function DetailsForm({
  initial,
  initialPin,
  initialQuote,
  saved,
  signInHref,
  options,
  store,
  summary,
}: {
  initial: DetailsValues;
  initialPin: LatLng | null;
  initialQuote: DeliveryQuote | null;
  saved: (Pick<DetailsValues, "street" | "apartment" | "city" | "postal"> & { pin: LatLng | null }) | null;
  signInHref: string | null;
  options: { delivery: boolean; pickup: boolean };
  store: {
    city: string;
    shortAddress: string;
    fullAddress: string;
    opensAt: string;
    closesAt: string;
    /** Fee for the first km; the real fee follows the pin's road distance. */
    baseFee: number;
    maxKm: number;
    lat: number;
    lng: number;
  };
  summary: { lines: SummaryLine[]; itemCount: number; subtotal: number };
}) {
  const t = useMessages(checkoutMessages);
  const d = t.details;
  const [state, formAction, pending] = useActionState(saveCheckoutDetails, initialState);
  const [values, setValues] = useState(initial);
  const [pin, setPin] = useState<LatLng | null>(initialPin);
  const [quote, setQuote] = useState<QuoteState>(initialQuote ?? { status: "idle" });
  const [pinLabel, setPinLabel] = useState<string | undefined>(undefined);
  // The failed submit after which the pin moved: its "pin your address" error no longer applies.
  const [pinMovedAt, setPinMovedAt] = useState(-1);
  const formRef = useRef<HTMLFormElement>(null);
  // Only the latest pin's answers count when the customer moves it quickly.
  const pinSeq = useRef(0);
  // What the map last filled in: a field still holding it (or empty) follows the next pin.
  const autoFilled = useRef<Partial<Record<AddressKey, string>>>({});

  /**
   * Fill the address from the pin. A chosen search result replaces the address (the customer picked
   * that place); a tap, drag or GPS fix only fills fields that are empty or still hold what the map
   * filled before, and clears those when the new spot has no value for them.
   */
  const fillAddress = (place: Pick<Place, AddressKey>, replace = false) =>
    setValues((v) => {
      const next = { ...v };
      for (const key of ["street", "city", "postal"] as const) {
        const value = place[key];
        const ours = v[key].trim() === "" || v[key] === autoFilled.current[key];
        if (!replace && !ours) continue;
        if (!value && !ours) continue;
        next[key] = value;
        autoFilled.current[key] = value;
      }
      return next;
    });

  const movePin = async (at: LatLng, source: PinSource, label?: string) => {
    const seq = ++pinSeq.current;
    setPin(at);
    setPinMovedAt(state.attempt);
    setPinLabel(label);
    setQuote({ status: "loading" });
    const [q, place] = await Promise.all([
      quoteDelivery(at.lat, at.lng).catch((): DeliveryQuote => ({ status: "busy" })),
      // A search result (or the saved address) already carries its address.
      source === "map" || source === "gps" ? addressAt(at.lat, at.lng).catch(() => null) : Promise.resolve(null),
    ]);
    if (seq !== pinSeq.current) return;
    setQuote(q);
    if (place) {
      fillAddress(place);
      setPinLabel(place.label);
    }
  };

  const choosePlace = (place: Place) => {
    fillAddress(place, true);
    void movePin({ lat: place.lat, lng: place.lng }, "search", place.label);
  };

  const applySavedAddress = async () => {
    if (!saved) return;
    const { pin: savedAt, ...address } = saved;
    setValues((v) => ({ ...v, ...address }));
    autoFilled.current = {};
    // Move the pin to the saved address too, so the fee is for where the order goes: its own pin when
    // it was saved with one, else found by search (the customer fine-tunes it on the map). Not found:
    // the pin stays and the label shows where it is.
    if (savedAt) return void movePin(savedAt, "saved");
    const found = await findPlaces(`${saved.street}, ${saved.city}`).catch(() => null);
    const first = found && "places" in found ? found.places[0] : undefined;
    if (first) void movePin({ lat: first.lat, lng: first.lng }, "saved", first.label);
  };

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
    // A pin error is answered by moving the pin; the next submit checks again.
    if (key === "lat" && pinMovedAt === state.attempt) return undefined;
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
  // Delivery has no price until the pin is placed and measured.
  const fee = delivery ? (quote.status === "ok" ? quote.fee : null) : 0;
  const closed = !options.delivery && !options.pickup;

  return (
    // Below lg the Continue button is pinned to the bottom of the screen, so the page keeps room for it.
    <div className="flex w-full flex-col gap-8 px-4 pt-8 pb-[calc(7rem+env(safe-area-inset-bottom))] md:px-8 lg:flex-row lg:items-start lg:gap-12 lg:px-16 lg:pt-12 lg:pb-24">
      {/* First in reading order: below lg it is a toggle bar above the form; at lg it moves to the right column. */}
      <SummaryToggle
        id="checkout-summary"
        labels={t.summary}
        total={formatRupiah(summary.subtotal + (fee ?? 0))}
        className="lg:order-last lg:w-[440px] lg:shrink-0"
      >
        <OrderSummary
          t={t.summary}
          lines={summary.lines}
          itemCount={summary.itemCount}
          subtotal={summary.subtotal}
          fulfilment={values.fulfilment}
          fee={fee}
          total={summary.subtotal + (fee ?? 0)}
        />
      </SummaryToggle>
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
            <Field label={d.phone} htmlFor="checkout-phone" error={err("phone")}>
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
                onClick={() => void applySavedAddress()}
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
                <div className="flex w-full flex-col gap-4 md:flex-row lg:flex-col xl:flex-row">
                  {options.delivery ? (
                    <OptionTile
                      name="fulfilment"
                      value="delivery"
                      checked={delivery}
                      onChange={() => setValues((v) => ({ ...v, fulfilment: "delivery" }))}
                      icon={Truck}
                      metaPlacement="header"
                      title={<span className="block leading-[21px]">{d.delivery}</span>}
                      sub={<span className="block leading-5">{d.deliverySub(store.maxKm)}</span>}
                      meta={
                        <span className="block leading-[21px]">
                          {quote.status === "ok" ? formatRupiah(quote.fee) : d.feeFrom(formatRupiah(store.baseFee))}
                        </span>
                      }
                      className="min-w-0 flex-1 items-start"
                    />
                  ) : null}
                  {options.pickup ? (
                    <OptionTile
                      name="fulfilment"
                      value="pickup"
                      checked={!delivery}
                      onChange={() => setValues((v) => ({ ...v, fulfilment: "pickup" }))}
                      icon={Store}
                      metaPlacement="header"
                      title={<span className="block leading-[21px]">{d.pickup}</span>}
                      sub={<span className="block leading-5">{store.shortAddress}</span>}
                      meta={<span className="block leading-[21px] text-primary">{d.free}</span>}
                      className="min-w-0 flex-1 items-start"
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
                  <input type="hidden" name="lat" value={pin ? pin.lat.toFixed(6) : ""} />
                  <input type="hidden" name="lng" value={pin ? pin.lng.toFixed(6) : ""} />
                  <DeliveryPicker
                    store={{ lat: store.lat, lng: store.lng }}
                    maxKm={store.maxKm}
                    pin={pin}
                    pinLabel={pinLabel}
                    quote={quote}
                    error={err("lat")}
                    onPin={(at, source) => void movePin(at, source)}
                    onPlace={choosePlace}
                    onSwitchToPickup={options.pickup ? () => setValues((v) => ({ ...v, fulfilment: "pickup" })) : undefined}
                  />
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
                      {input("city", { autoComplete: "address-level2", placeholder: d.cityPlaceholder, required: true, maxLength: 100 })}
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
          <div data-pinned-bar className="fixed inset-x-0 bottom-0 z-30 flex bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] md:px-8 lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:shadow-none">
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

    </div>
  );
}
