import "server-only";
import type { StoreSettings } from "./settings";

/**
 * Delivery by distance. The customer pins their spot on the map; the fee follows the road distance
 * from the store (OSRM's public router, the same street data as the map), and nothing is delivered
 * beyond the store's maximum distance. If the router can't be reached the straight-line distance
 * times ROAD_FACTOR stands in, so checkout never stalls on it.
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
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX = 1000;

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

/** Straight-line distance in metres. */
export function straightLineM(a: LatLng, b: LatLng) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(h)));
}

const routes = new Map<string, { m: number; at: number }>();

/** ~1 m precision is plenty; it also lets nearby repeats share one router call. */
const key = (from: LatLng, to: LatLng) =>
  [from.lat, from.lng, to.lat, to.lng].map((n) => n.toFixed(5)).join(",");

async function roadDistanceM(from: LatLng, to: LatLng): Promise<number | null> {
  const k = key(from, to);
  const hit = routes.get(k);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.m;
  try {
    const res = await fetch(`${ROUTER_URL}/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`, {
      headers: { "User-Agent": "Droolbites/1.0 (+https://droolbites.biz.id)" },
      signal: AbortSignal.timeout(ROUTER_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { code?: string; routes?: { distance?: number }[] };
    const m = body.code === "Ok" ? body.routes?.[0]?.distance : undefined;
    if (typeof m !== "number" || !Number.isFinite(m)) return null;
    if (routes.size >= CACHE_MAX) routes.delete(routes.keys().next().value!);
    routes.set(k, { m, at: Date.now() });
    return m;
  } catch (error) {
    console.warn("[delivery] router unavailable", (error as Error).name);
    return null;
  }
}

export type Measured = { distanceM: number; estimated: boolean };

/** Road distance from the store to `to`, in whole metres. */
export async function measureDelivery(rates: DeliveryRates, to: LatLng): Promise<Measured> {
  const store = { lat: rates.storeLat, lng: rates.storeLng };
  const straight = straightLineM(store, to);
  // A road is never shorter than the straight line, so far-off pins skip the router.
  if (straight > rates.deliveryMaxKm * 1000) return { distanceM: Math.round(straight), estimated: false };
  const road = await roadDistanceM(store, to);
  return road === null
    ? { distanceM: Math.round(straight * ROAD_FACTOR), estimated: true }
    : { distanceM: Math.round(road), estimated: false };
}

export function withinRange(rates: Pick<DeliveryRates, "deliveryMaxKm">, distanceM: number) {
  return distanceM <= rates.deliveryMaxKm * 1000;
}

/** Base fee for the first deliveryBaseKm km, then deliveryPerKm for every started km after. */
export function deliveryFeeFor(rates: Pick<DeliveryRates, "deliveryFee" | "deliveryBaseKm" | "deliveryPerKm">, distanceM: number) {
  const extraKm = Math.max(0, Math.ceil(distanceM / 1000 - rates.deliveryBaseKm - 1e-9));
  return rates.deliveryFee + extraKm * rates.deliveryPerKm;
}
