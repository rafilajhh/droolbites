import "server-only";
import type { StoreSettings } from "./settings";
import { serialQueue, sharedCache } from "./throttle";

/**
 * Delivery by distance. The customer pins their spot on the map; the fee follows the road distance
 * from the store (OSRM's public router, the same street data as the map), and nothing is delivered
 * beyond the store's maximum distance. If the router can't be reached in time the straight-line
 * distance times ROAD_FACTOR stands in (marked as an estimate), so checkout never stalls on it.
 */

export type LatLng = { lat: number; lng: number };
export type DeliveryRates = Pick<
  StoreSettings,
  "deliveryFee" | "deliveryBaseKm" | "deliveryPerKm" | "deliveryMaxKm" | "storeLat" | "storeLng"
>;

/** Roads in a city run about 1.3× the straight line. */
const ROAD_FACTOR = 1.3;
const ROUTER_URL = "https://router.project-osrm.org/route/v1/driving";
const ROUTER_TIMEOUT_MS = 4000;

/** The demo router asks for about one request a second; a short queue keeps us under it. */
const routerQueue = serialQueue(1000, 6);
const routes = sharedCache<number | null>(24 * 60 * 60 * 1000, 1000);

/** Roughly Indonesia: anything outside is a bad request, not an address. */
export function isLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -11.5 &&
    lat <= 6.5 &&
    lng >= 94.5 &&
    lng <= 141.5
  );
}

/** Which store pin a distance was measured from; a moved store pin invalidates saved distances. */
export function storeKey(rates: Pick<DeliveryRates, "storeLat" | "storeLng">) {
  return `${rates.storeLat.toFixed(5)},${rates.storeLng.toFixed(5)}`;
}

/** Straight-line distance in metres. */
export function straightLineM(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** ~1 m precision is plenty; it also lets nearby repeats share one router call. */
const key = (from: LatLng, to: LatLng) => [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(",");

async function fetchRoute(from: LatLng, to: LatLng): Promise<number | null> {
  const res = await fetch(`${ROUTER_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`, {
    headers: { "User-Agent": "Droolbites/1.0 (+https://droolbites.biz.id)" },
    signal: AbortSignal.timeout(ROUTER_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`router ${res.status}`);
  const body = (await res.json()) as { code?: string; routes?: { distance?: number }[] };
  const m = body.code === "Ok" ? body.routes?.[0]?.distance : undefined;
  // No route at all (an island, the sea) is an answer worth keeping, not an error.
  return typeof m === "number" && Number.isFinite(m) ? m : null;
}

async function roadDistanceM(from: LatLng, to: LatLng): Promise<number | null> {
  try {
    return await routes(key(from, to), () => routerQueue(() => fetchRoute(from, to)));
  } catch (error) {
    console.warn("[delivery] router unavailable", (error as Error).message);
    return null;
  }
}

/** `straight`: beyond the maximum even in a straight line, so the router wasn't asked. */
export type Measured = { distanceM: number; kind: "road" | "estimated" | "straight" };

/** Distance from the store to `to`, in whole metres. */
export async function measureDelivery(rates: DeliveryRates, to: LatLng): Promise<Measured> {
  const store = { lat: rates.storeLat, lng: rates.storeLng };
  const straight = straightLineM(store, to);
  // A road is never shorter than the straight line, so far-off pins skip the router.
  if (straight > rates.deliveryMaxKm * 1000) return { distanceM: Math.round(straight), kind: "straight" };
  const road = await roadDistanceM(store, to);
  return road === null
    ? { distanceM: Math.round(straight * ROAD_FACTOR), kind: "estimated" }
    : { distanceM: Math.round(road), kind: "road" };
}

export function withinRange(rates: Pick<DeliveryRates, "deliveryMaxKm">, distanceM: number) {
  return distanceM <= rates.deliveryMaxKm * 1000;
}

/** Base fee for the first deliveryBaseKm km, then deliveryPerKm for every started km after. */
export function deliveryFeeFor(rates: Pick<DeliveryRates, "deliveryFee" | "deliveryBaseKm" | "deliveryPerKm">, distanceM: number) {
  const extraKm = Math.max(0, Math.ceil(distanceM / 1000 - rates.deliveryBaseKm - 1e-9));
  return rates.deliveryFee + extraKm * rates.deliveryPerKm;
}

export type PinQuote =
  | { status: "ok"; distanceM: number; fee: number; estimated: boolean }
  | { status: "tooFar"; distanceM: number; maxKm: number };

/** Road distance and fee for a pin, or how far beyond the delivery range it is. */
export async function quotePin(rates: DeliveryRates, to: LatLng): Promise<PinQuote> {
  const { distanceM, kind } = await measureDelivery(rates, to);
  if (!withinRange(rates, distanceM)) return { status: "tooFar", distanceM, maxKm: rates.deliveryMaxKm };
  return { status: "ok", distanceM, fee: deliveryFeeFor(rates, distanceM), estimated: kind === "estimated" };
}

/** The saved address's pin, when it has a valid one. */
export function savedPin(user: { addressLat: number | null; addressLng: number | null } | null): LatLng | null {
  return user && isLatLng(user.addressLat, user.addressLng) ? { lat: user.addressLat as number, lng: user.addressLng as number } : null;
}
