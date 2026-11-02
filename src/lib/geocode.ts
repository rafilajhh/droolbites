import "server-only";
import type { LatLng } from "./delivery";
import { serialQueue, sharedCache } from "./throttle";

/**
 * Address search and pin → address for the checkout map, via OpenStreetMap's Nominatim. Its usage
 * policy asks for an identifying User-Agent, at most one request a second and no search-as-you-type,
 * so calls go out one at a time from here (a short queue; when it's full the lookup reports busy),
 * results are cached, and the form only searches on submit.
 */

const NOMINATIM = "https://nominatim.openstreetmap.org";
const TIMEOUT_MS = 5000;

const queue = serialQueue(1100, 8);
const cache = sharedCache<unknown>(24 * 60 * 60 * 1000, 500);
const cached = <T,>(key: string, load: () => Promise<T>) => cache(key, () => queue(load)) as Promise<T>;

export type Place = {
  lat: number;
  lng: number;
  /** One line for the result list: "Jalan Raya Darmo, Wonokromo, Surabaya". */
  label: string;
  street: string;
  city: string;
  postal: string;
};

type NominatimAddress = Partial<
  Record<
    | "road"
    | "house_number"
    | "neighbourhood"
    | "hamlet"
    | "suburb"
    | "village"
    | "quarter"
    | "city_district"
    | "city"
    | "town"
    | "municipality"
    | "county"
    | "regency"
    | "postcode",
    string
  >
>;
type NominatimPlace = { lat: string; lon: string; name?: string; display_name?: string; address?: NominatimAddress };

async function get(path: string, params: Record<string, string>, lang: string): Promise<unknown> {
  const url = `${NOMINATIM}${path}?${new URLSearchParams({ format: "jsonv2", addressdetails: "1", ...params })}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Droolbites/1.0 (+https://droolbites.biz.id)", "Accept-Language": lang },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

const clean = (s: string | undefined) => (s ?? "").replace(/^(Kota|Kabupaten)\s+/i, "").trim();

function toPlace(p: NominatimPlace): Place | null {
  const lat = Number(p.lat);
  const lng = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const a = p.address ?? {};
  const road = [a.road, a.house_number].filter(Boolean).join(" ");
  const area = a.suburb ?? a.village ?? a.quarter ?? a.neighbourhood ?? a.hamlet ?? a.city_district ?? "";
  const city = clean(a.city ?? a.town ?? a.municipality ?? a.regency ?? a.county);
  // A named place (a mall, a campus) leads, so the courier and the result list both see it.
  const landmark = p.name && p.name !== a.road && p.name !== area && p.name !== city ? p.name : "";
  const street = [landmark, road, area].filter(Boolean).join(", ");
  const postal = /^\d{5}$/.test(a.postcode ?? "") ? a.postcode! : "";
  const label = [street, city].filter(Boolean).join(", ") || p.display_name || "";
  return { lat, lng, label, street: street.slice(0, 180), city: city.slice(0, 100), postal };
}

/** Up to 5 places in Indonesia for `query`, nearest the store first. */
export async function searchPlaces(query: string, near: LatLng, lang: string): Promise<Place[]> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 120);
  if (q.length < 3) return [];
  // A box ~45 km around the store to rank local matches first (not a hard limit).
  const d = 0.4;
  const viewbox = [near.lng - d, near.lat + d, near.lng + d, near.lat - d].map((n) => n.toFixed(4)).join(",");
  return cached(`s:${lang}:${q.toLowerCase()}`, async () => {
    const body = await get("/search", { q, countrycodes: "id", limit: "5", viewbox }, lang);
    return (Array.isArray(body) ? (body as NominatimPlace[]) : []).map(toPlace).filter((p): p is Place => p !== null);
  });
}

/** The address at a pin, to fill the form. */
export async function placeAt(at: LatLng, lang: string): Promise<Place | null> {
  const lat = at.lat.toFixed(5);
  const lng = at.lng.toFixed(5);
  return cached(`r:${lang}:${lat},${lng}`, async () => {
    const body = (await get("/reverse", { lat, lon: lng, zoom: "18" }, lang)) as NominatimPlace & { error?: string };
    return body && !body.error ? toPlace(body) : null;
  });
}
