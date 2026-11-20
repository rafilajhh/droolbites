"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Store, Truck } from "lucide-react";
import { addressAt, findPlaces, quoteDelivery, saveCheckoutDetails, type DeliveryQuote, type DetailsState } from "@/app/actions/checkout";
import { OptionTile } from "@/components/ui/choice-tiles";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/form-field";
import { useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";
import { formatRupiah } from "@/lib/format";
import type { Place } from "@/lib/geocode";
import { CheckoutColumns, CheckoutHeading, CheckoutSection, TotalEcho } from "./checkout-section";
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
  /** Kecamatan at the pin; read-only, it follows the pin. */
  district: string;
  city: string;
  postal: string;
  /** Empty: the contact receives it. */
  recipientName: string;
  recipientPhone: string;
  /** Landmark or note for the courier. */
  note: string;
};

/** The saved address "Use saved address" fills in. */
export type SavedAddress = Pick<
  DetailsValues,
  "street" | "apartment" | "district" | "city" | "postal" | "recipientName" | "recipientPhone" | "note"
> & { pin: LatLng | null };

type TextKey = Exclude<keyof DetailsValues, "fulfilment">;
type AddressKey = "street" | "city" | "postal";

const initialState: DetailsState = { errors: {}, attempt: 0 };

/**
 * Checkout · Details, after pen frame PPHfX with the owner-approved simpler
 * flow: 1 Contact (email, name, phone) and 2 Delivery or pickup (the two
 * tiles, then the delivery pin on the map with its distance and fee, the
 * address with its kecamatan from the pin, a note for the courier and who
 * receives it, or the store's pickup details). No country/province selects,
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
  saved: SavedAddress | null;
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
  // What the last submit sent: a field's server error stands only while the field still holds that value.
  const [submitted, setSubmitted] = useState(initial);
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
   * Fill the address from the pin. A chosen search result replaces the whole address (the customer
   * picked that place), so a field the result has no value for is cleared rather than left from the
   * old address; a tap, drag or GPS fix only fills fields that are empty or still hold what the map
   * filled before, and clears those when the new spot has no value for them.
   */
  const fillAddress = (place: Pick<Place, AddressKey | "district">, replace = false) =>
    setValues((v) => {
      // The kecamatan always follows the pin.
      const next = { ...v, district: place.district };
      for (const key of ["street", "city", "postal"] as const) {
        const value = place[key];
        const ours = v[key].trim() === "" || v[key] === autoFilled.current[key];
        if (!replace && !ours) continue;
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
    // A tapped, dragged or located pin looks its kecamatan up below; until then the old one is wrong.
    if (source === "map" || source === "gps") setValues((v) => ({ ...v, district: "" }));
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

  const set = (key: TextKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const err = (key: keyof DetailsState["errors"]) => {
    const code = state.errors[key];
    if (!code) return undefined;
    // A pin error is answered by moving the pin; the next submit checks again.
    if (key === "lat" && pinMovedAt === state.attempt) return undefined;
    // An edited field (or a newly chosen option) drops its error at once; untouched fields keep theirs.
    if (key in values && values[key as keyof DetailsValues] !== submitted[key as keyof DetailsValues]) return undefined;
    return t.errors[code];
  };

  const input = (key: TextKey, { "aria-describedby": help, ...extra }: React.InputHTMLAttributes<HTMLInputElement> = {}) => {
    const error = err(key);
    return (
      <TextInput
        id={`checkout-${key}`}
        name={key}
        value={values[key]}
        onChange={set(key)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `checkout-${key}-error` : help}
        {...extra}
      />
    );
  };

  const delivery = values.fulfilment === "delivery";
  // Delivery has no price until the pin is placed and measured.
  const fee = delivery ? (quote.status === "ok" ? quote.fee : null) : 0;
  const closed = !options.delivery && !options.pickup;

  const total = summary.subtotal + (fee ?? 0);
  const linkClass =
    "relative text-sm leading-normal font-semibold text-primary after:absolute after:-inset-x-2 after:-inset-y-3 after:content-[''] hover:underline";

  return (
    <CheckoutColumns
      summaryFirst
      // Below lg the Continue bar is pinned to the bottom of the screen, so the page keeps room for it.
      className="pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-24"
      summary={
        <SummaryToggle id="checkout-summary" labels={t.summary} total={formatRupiah(total)}>
          <OrderSummary
            t={t.summary}
            lines={summary.lines}
            itemCount={summary.itemCount}
            subtotal={summary.subtotal}
            fulfilment={values.fulfilment}
            fee={fee}
            total={total}
          />
        </SummaryToggle>
      }
    >
      <form
        ref={formRef}
        action={formAction}
        onSubmit={() => setSubmitted(values)}
        noValidate
        className="flex w-full flex-col gap-8"
      >
        <CheckoutHeading title={d.title} />

        <CheckoutSection
          id="checkout-contact"
          title={d.contact}
          meta={
            signInHref ? (
              <Link href={signInHref} className={linkClass}>
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
                maxLength: 24,
              })}
            </Field>
          </div>
        </CheckoutSection>

        {/* The fieldset takes its name from this heading, so the section itself stays unnamed. */}
        <CheckoutSection
          id="checkout-receive"
          title={d.receive}
          named={false}
          meta={
            delivery && saved ? (
              <button type="button" onClick={() => void applySavedAddress()} className={cn(linkClass, "whitespace-nowrap")}>
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
                aria-labelledby="checkout-receive"
                aria-invalid={err("fulfilment") ? true : undefined}
                aria-describedby={err("fulfilment") ? "checkout-fulfilment-error" : undefined}
              >
                <div className="grid w-full gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-1 xl:grid-cols-2">
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
                      className="min-w-0 items-start"
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
                      className="min-w-0 items-start"
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
                  {/* Sized to the column, not the screen: one row of three from 544px, else the kecamatan
                      on its own row over City and Postal code (the column is ~500px beside the summary at lg). */}
                  <div className="@container w-full">
                    <div className="grid w-full gap-5 @md:grid-cols-2 @md:gap-4 @[34rem]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,11.5rem)]">
                      {/* The kecamatan comes from the pin, so it reads but can't be typed. */}
                      <Field label={d.district} htmlFor="checkout-district" helper={d.districtHelp} className="@md:col-span-2 @[34rem]:col-span-1">
                        {input("district", {
                          readOnly: true,
                          // OpenStreetMap doesn't know every kecamatan; the field then stays empty, which is fine.
                          placeholder: pin && quote.status !== "loading" ? d.districtUnknown : d.districtEmpty,
                          className: "bg-card text-ellipsis",
                          "aria-describedby": "checkout-district-helper",
                        })}
                      </Field>
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
                  </div>
                  <Field label={d.note} htmlFor="checkout-note" error={err("note")}>
                    <TextArea
                      id="checkout-note"
                      name="note"
                      rows={2}
                      maxLength={200}
                      value={values.note}
                      onChange={set("note")}
                      placeholder={d.notePlaceholder}
                      aria-invalid={err("note") ? true : undefined}
                      className="min-h-[88px]"
                    />
                  </Field>
                  {/* Who receives it: empty fields fall back to the contact above (on the server too). */}
                  <div className="flex w-full flex-col gap-2">
                    <div className="grid w-full gap-5 sm:grid-cols-2 sm:gap-4">
                      <Field label={d.recipientName} htmlFor="checkout-recipientName" error={err("recipientName")}>
                        {input("recipientName", {
                          autoComplete: "shipping name",
                          placeholder: values.fullName.trim() || d.fullNamePlaceholder,
                          maxLength: 100,
                          "aria-describedby": "checkout-recipient-help",
                        })}
                      </Field>
                      <Field label={d.recipientPhone} htmlFor="checkout-recipientPhone" error={err("recipientPhone")}>
                        {input("recipientPhone", {
                          type: "tel",
                          inputMode: "tel",
                          autoComplete: "shipping tel",
                          placeholder: values.phone.trim() || d.phonePlaceholder,
                          maxLength: 24,
                          "aria-describedby": "checkout-recipient-help",
                        })}
                      </Field>
                    </div>
                    <p id="checkout-recipient-help" className="text-[13px] leading-5 text-muted-foreground">
                      {d.recipientHelp}
                    </p>
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

        {/* The end of the form: the total it leads to and the way on. From lg it closes the column under a
            hairline; below lg the same bar is pinned to the bottom of the screen, like PAY on the payment step. */}
        <div className="flex w-full flex-col gap-5 lg:pt-8 lg:shadow-[inset_0_1px_0_var(--border-subtle)]">
          <div
            data-pinned-bar
            className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-4 bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[inset_0_1px_0_var(--border-subtle)] md:px-8 lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:shadow-none"
          >
            <TotalEcho
              label={fee === null ? t.summary.subtotal : t.summary.total}
              note={fee === null ? `${t.summary.delivery}: ${t.summary.pinFirst}` : undefined}
              amount={formatRupiah(total)}
            />
            {/* Under 360px the full label leaves the total no room, so the button says just "Continue". */}
            <Button type="submit" className="shrink-0 px-5 sm:px-7" disabled={pending || closed}>
              {pending ? (
                d.saving
              ) : (
                <>
                  <span className="max-[359px]:hidden">{d.continue}</span>
                  <span className="min-[360px]:hidden">{d.continueShort}</span>
                </>
              )}
            </Button>
          </div>
          <div className="flex items-center justify-center gap-6 lg:justify-end">
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
    </CheckoutColumns>
  );
}
