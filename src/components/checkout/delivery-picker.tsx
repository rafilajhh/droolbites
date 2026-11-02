"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";
import { LoaderCircle, LocateFixed, MapPin, Route, Search } from "lucide-react";
import type { DeliveryQuote } from "@/app/actions/checkout";
import { findPlaces } from "@/app/actions/checkout";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/form-field";
import { useLocale, useMessages } from "@/i18n/client";
import { checkoutMessages } from "@/i18n/messages/checkout";
import { cn } from "@/lib/cn";
import { formatDistance, formatRupiah } from "@/lib/format";
import type { Place } from "@/lib/geocode";

export type LatLng = { lat: number; lng: number };
/** Where a pin came from; "saved" is the saved address, found by search. */
export type PinSource = "map" | "search" | "gps" | "saved";

/** The quote panel's states: nothing pinned, measuring, or the server's answer. */
export type QuoteState = { status: "idle" } | { status: "loading" } | DeliveryQuote;

const PIN_SVG =
  '<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true"><path class="fill-primary stroke-white" stroke-width="2.5" d="M18 44.5S34 28.4 34 17A16 16 0 0 0 2 17c0 11.4 16 27.5 16 27.5Z"/><circle class="fill-white" cx="18" cy="17" r="6"/></svg>';
const STORE_HTML =
  '<span class="block size-10 overflow-hidden rounded-pill bg-primary ring-[3px] ring-white"><img src="/images/site/logo-badge.png" alt="" class="size-full object-cover" /></span>';

/**
 * Where to deliver: an address search, the map with the store, its delivery range and a pin the
 * customer drops or drags, and a line with the road distance and fee. The map is OpenStreetMap via
 * Leaflet, loaded in the browser only.
 */
export function DeliveryPicker({
  store,
  maxKm,
  pin,
  pinLabel,
  quote,
  error,
  onPin,
  onPlace,
  onSwitchToPickup,
}: {
  store: LatLng;
  maxKm: number;
  pin: LatLng | null;
  /** What's at the pin, so the customer can check it against the address they typed. */
  pinLabel?: string;
  quote: QuoteState;
  error?: string;
  onPin: (pin: LatLng, source: PinSource) => void;
  /** A search result was chosen: the form takes its address and moves the pin there. */
  onPlace: (place: Place) => void;
  onSwitchToPickup?: () => void;
}) {
  const d = useMessages(checkoutMessages).details;
  const locale = useLocale();

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;
  // The latest pin, for the map's async setup (a GPS or saved pin can land before Leaflet loads).
  const pinRef = useRef(pin);
  pinRef.current = pin;
  // The pin moved by the map itself (click or drag) doesn't refit the view.
  const fromMap = useRef(false);

  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<
    { status: "idle" } | { status: "loading" } | { status: "done"; places: Place[] } | { status: "busy" }
  >({ status: "idle" });
  const [locating, setLocating] = useState<"idle" | "busy" | "failed">("idle");

  // Build the map once.
  useEffect(() => {
    let cancelled = false;
    let range: Circle | null = null;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapEl.current, {
        center: [store.lat, store.lng],
        zoom: 11,
        // The page scrolls past the map; zoom is the buttons, pinch or double click.
        scrollWheelZoom: false,
      });
      map.attributionControl.setPrefix(false);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      range = L.circle([store.lat, store.lng], {
        radius: maxKm * 1000,
        className: "drool-range",
        weight: 1.5,
        dashArray: "6 6",
        fillOpacity: 0.05,
        interactive: false,
      }).addTo(map);
      L.marker([store.lat, store.lng], {
        icon: L.divIcon({ html: STORE_HTML, className: "", iconSize: [40, 40], iconAnchor: [20, 20] }),
        title: d.storePin,
        alt: d.storePin,
        keyboard: false,
        zIndexOffset: -100,
      }).addTo(map);
      map.on("click", (e) => {
        fromMap.current = true;
        onPinRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }, "map");
      });
      map.getContainer().setAttribute("aria-label", d.mapLabel);
      mapRef.current = map;
      // Fit the whole range on first view so the 30 km limit is visible.
      map.fitBounds(range.getBounds(), { padding: [8, 8], animate: false });
      // Restore a pin from an earlier visit, or one placed while the map was loading.
      if (pinRef.current) placeMarker(pinRef.current, true);
    })();
    return () => {
      cancelled = true;
      // Stop any pan/zoom first: Leaflet's zoom animation finishes on a timer and would read the
      // removed map panes if the customer moves on (e.g. Continue) mid-animation.
      const map = mapRef.current;
      if (map) {
        map.stop();
        // A zoom (the + button, a double tap) ends on a 250 ms timer that returns early when this
        // flag is off; Leaflet has no public way to cancel it.
        (map as unknown as { _animatingZoom: boolean })._animatingZoom = false;
        map.off();
        map.remove();
      }
      mapRef.current = null;
      markerRef.current = null;
      range = null;
    };
    // The store and range are fixed for the page's life.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function placeMarker(at: LatLng, refit: boolean) {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!markerRef.current) {
      const marker = L.marker([at.lat, at.lng], {
        icon: L.divIcon({ html: PIN_SVG, className: "", iconSize: [36, 46], iconAnchor: [18, 45] }),
        draggable: true,
        autoPan: true,
        title: d.yourPin,
        alt: d.yourPin,
        zIndexOffset: 100,
      }).addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLatLng();
        fromMap.current = true;
        onPinRef.current({ lat: ll.lat, lng: ll.lng }, "map");
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng([at.lat, at.lng]);
    }
    if (refit) {
      // Jump, don't animate: the form may leave the page right after (see the cleanup above).
      map.fitBounds(L.latLngBounds([store.lat, store.lng], [at.lat, at.lng]), { padding: [48, 48], maxZoom: 16, animate: false });
    }
    fromMap.current = false;
  }

  // Follow the pin from the form (search result, GPS, saved address).
  useEffect(() => {
    if (!pin) return;
    placeMarker(pin, !fromMap.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin?.lat, pin?.lng]);

  async function runSearch() {
    const q = query.trim();
    if (q.length < 3 || search.status === "loading") return;
    setSearch({ status: "loading" });
    const result = await findPlaces(q);
    setSearch("error" in result ? { status: "busy" } : { status: "done", places: result.places });
  }

  function choose(place: Place) {
    setSearch({ status: "idle" });
    // The form fills the address and moves the pin to the place.
    onPlace(place);
  }

  function locate() {
    if (!("geolocation" in navigator)) return setLocating("failed");
    setLocating("busy");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating("idle");
        onPin({ lat: pos.coords.latitude, lng: pos.coords.longitude }, "gps");
      },
      () => setLocating("failed"),
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  const km = (m: number) => formatDistance(m, locale);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p id="checkout-location-label" className="text-sm leading-[18px] font-semibold text-foreground">
          {d.location}
        </p>
        <p className="text-[13px] leading-5 text-muted-foreground">{d.locationHelp}</p>
      </div>

      <div role="search" className="flex w-full gap-2">
        <label htmlFor="checkout-place-search" className="sr-only">
          {d.searchLabel}
        </label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground" aria-hidden />
          <TextInput
            id="checkout-place-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              // Enter searches here instead of submitting the checkout form.
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder={d.searchPlaceholder}
            maxLength={120}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "checkout-location-error" : undefined}
            className="pl-11 text-ellipsis"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => void runSearch()}
          disabled={search.status === "loading"}
          className="shrink-0 px-5"
        >
          {search.status === "loading" ? d.searching : d.search}
        </Button>
      </div>

      {search.status === "done" && search.places.length > 0 ? (
        <ul
          aria-label={d.results}
          className="flex w-full flex-col overflow-hidden rounded-sm bg-white inset-ring-[1.25px] inset-ring-border-subtle"
        >
          {search.places.map((p, i) => (
            <li key={`${p.lat},${p.lng}`} className={cn(i > 0 && "shadow-[inset_0_1px_0_var(--border-subtle)]")}>
              <button
                type="button"
                onClick={() => choose(p)}
                className="flex min-h-12 w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-card focus-visible:bg-card"
              >
                <MapPin className="mt-0.5 size-[18px] shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 text-[15px] leading-[21px] text-foreground">{p.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : search.status === "done" || search.status === "busy" ? (
        <p role="status" className="text-[13px] leading-5 text-muted-foreground">
          {search.status === "busy" ? d.searchBusy : d.noResults}
        </p>
      ) : null}

      <div className="relative isolate z-0 h-[300px] w-full overflow-hidden rounded-sm bg-card lg:h-[340px]">
        <div
          ref={mapEl}
          role="application"
          aria-labelledby="checkout-location-label"
          className="size-full font-sans [&_.drool-range]:fill-primary [&_.drool-range]:stroke-primary [&_.leaflet-control-attribution]:text-[11px] [&_.leaflet-control-zoom]:border-0! [&_.leaflet-control-zoom]:shadow-[0_4px_12px_rgb(31_42_20/0.15)] [&_.leaflet-control-zoom_a]:text-foreground"
        />
        {/* The pen's input stroke, drawn over the tiles. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 z-[1001] rounded-sm inset-ring-[1.25px] inset-ring-border-subtle" />
        <button
          type="button"
          onClick={locate}
          disabled={locating === "busy"}
          className="absolute right-3 bottom-8 z-[1002] inline-flex h-11 items-center gap-2 rounded-pill bg-white pr-4 pl-3 text-sm leading-[18px] font-semibold text-foreground shadow-[0_4px_12px_rgb(31_42_20/0.15)] transition-colors duration-150 hover:bg-card disabled:cursor-progress"
        >
          {locating === "busy" ? (
            <LoaderCircle className="size-[18px] animate-spin text-primary motion-reduce:animate-none" aria-hidden />
          ) : (
            <LocateFixed className="size-[18px] text-primary" aria-hidden />
          )}
          {locating === "busy" ? d.locating : d.locate}
        </button>
      </div>
      {locating === "failed" ? (
        <p role="status" className="text-[13px] leading-5 text-muted-foreground">
          {d.locateFailed}
        </p>
      ) : null}

      <QuotePanel quote={quote} km={km} maxKm={maxKm} pinLabel={pinLabel} onSwitchToPickup={onSwitchToPickup} />

      {error ? (
        <p id="checkout-location-error" role="alert" className="text-[13px] leading-normal text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function QuotePanel({
  quote,
  km,
  maxKm,
  pinLabel,
  onSwitchToPickup,
}: {
  quote: QuoteState;
  km: (m: number) => string;
  maxKm: number;
  pinLabel?: string;
  onSwitchToPickup?: () => void;
}) {
  const d = useMessages(checkoutMessages).details;
  const tooFar = quote.status === "tooFar";
  return (
    <div
      aria-live="polite"
      className={cn(
        "flex w-full flex-wrap items-center gap-x-3 gap-y-3 rounded-sm px-4 py-3.5 transition-colors duration-200",
        tooFar ? "bg-tint-salmon" : quote.status === "ok" ? "bg-mint" : "bg-card",
      )}
    >
      {quote.status === "loading" ? (
        <LoaderCircle className="size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none" aria-hidden />
      ) : (
        <Route className={cn("size-5 shrink-0", quote.status === "ok" || tooFar ? "text-primary" : "text-muted-foreground")} aria-hidden />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p
          className={cn(
            "text-[15px] leading-[22px]",
            quote.status === "ok" || tooFar ? "font-semibold text-foreground" : "text-muted-foreground",
          )}
        >
          {quote.status === "ok"
            ? quote.estimated
              ? d.quoteEstimate(km(quote.distanceM))
              : d.quoteRoad(km(quote.distanceM))
            : tooFar
              ? d.tooFar(km(quote.distanceM), maxKm)
              : quote.status === "loading"
                ? d.quoteLoading
                : quote.status === "idle"
                  ? d.quoteIdle
                  : quote.status === "invalid"
                    ? d.quoteInvalid
                    : d.quoteBusy}
        </p>
        {pinLabel && (quote.status === "ok" || tooFar) ? (
          <p className="text-[13px] leading-5 text-muted-foreground">{d.pinNear(pinLabel)}</p>
        ) : null}
      </div>
      {quote.status === "ok" ? (
        <span className="font-display text-[22px] leading-7 font-bold text-foreground tabular-nums">{formatRupiah(quote.fee)}</span>
      ) : null}
      {tooFar && onSwitchToPickup ? (
        <Button variant="secondary" onClick={onSwitchToPickup} className="w-full bg-white py-3 sm:w-auto">
          {d.switchPickup}
        </Button>
      ) : null}
    </div>
  );
}
