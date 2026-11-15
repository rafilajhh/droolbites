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
  /** Kecamatan, when OpenStreetMap knows it ("Genteng"); else "". */
  district: string;
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
    | "district"
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

/**
 * The kecamatan of a result. Indonesian OpenStreetMap files it as city_district, district or
 * municipality (Surabaya: "village": "Ketabang" is the kelurahan, "municipality": "Genteng" the
 * kecamatan); suburb and village are the kelurahan, already part of the street line.
 */
function districtOf(a: NominatimAddress, city: string): string {
  const found = a.city_district ?? a.district ?? a.municipality ?? "";
  const name = found.replace(/^(Kecamatan|Kec\.)\s+/i, "").trim();
  // A municipality tag that is really the city (or empty) says nothing more.
  return name && comparable(name) !== comparable(city) ? name.slice(0, 100) : "";
}

/** "Kota Malang" → "Malang", "KABUPATEN MALANG" → "Malang". */
function cleanCity(s: string) {
  const name = s.replace(/^(Kota|Kabupaten|Kab\.)\s+/i, "").trim();
  return name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (c) => c.toUpperCase()) : name;
}

const comparable = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * The city or regency of a result: city, town, municipality, regency, then county. A city/town/
 * municipality tag that is also the result's kelurahan is skipped: OpenStreetMap sometimes files a
 * kelurahan as the city (Alun-Alun Bundar Malang comes back with "city": "Kiduldalem"). Kecamatan
 * names are not compared, because many regencies share their name with a kecamatan (Kec. Sidoarjo
 * in Kab. Sidoarjo), and a regency or county is always trusted. Then a "Kota …" or "Kabupaten …"
 * part of the full address is used, else null (unknown).
 */
function cityOf(p: NominatimPlace): string | null {
  const a = p.address ?? {};
  const kelurahan = new Set(
    [a.suburb, a.village, a.quarter, a.neighbourhood, a.hamlet]
      .filter((s): s is string => Boolean(s))
      .map(comparable),
  );
  for (const [tagged, trusted] of [
    [a.city, false],
    [a.town, false],
    [a.municipality, false],
    [a.regency, true],
    [a.county, true],
  ] as const) {
    if (!tagged) continue;
    const city = cleanCity(tagged);
    if (city && (trusted || !kelurahan.has(comparable(tagged)))) return city;
  }
  const named = (p.display_name ?? "")
    .split(",")
    .map((part) => part.trim())
    .find((part) => /^(Kota|Kabupaten|Kab\.)\s+\S/i.test(part));
  return named ? cleanCity(named) : null;
}

function toPlace(p: NominatimPlace, city: string): Place | null {
  const lat = Number(p.lat);
  const lng = Number(p.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const a = p.address ?? {};
  const road = [a.road, a.house_number].filter(Boolean).join(" ");
  const area = a.suburb ?? a.village ?? a.quarter ?? a.neighbourhood ?? a.hamlet ?? a.city_district ?? "";
  // A named place (a mall, a campus) leads, so the courier and the result list both see it.
  const landmark = p.name && p.name !== a.road && p.name !== area && p.name !== city ? p.name : "";
  const street = [landmark, road, area].filter(Boolean).join(", ");
  const postal = /^\d{5}$/.test(a.postcode ?? "") ? a.postcode! : "";
  const label = [street, city].filter(Boolean).join(", ") || p.display_name || "";
  return { lat, lng, label, street: street.slice(0, 180), district: districtOf(a, city), city: city.slice(0, 100), postal };
}

/** A result with its city; when the result doesn't say, the city at its point (a coarse reverse lookup). */
async function resolvePlace(p: NominatimPlace, lang: string): Promise<Place | null> {
  const city = cityOf(p);
  if (city !== null) return toPlace(p, city);
  // Zoom 10 is city level, so a ~1 km grid is plenty and lets nearby results share one lookup.
  const lat = Number(p.lat).toFixed(2);
  const lon = Number(p.lon).toFixed(2);
  const around = await cached(`c:${lang}:${lat},${lon}`, () => get("/reverse", { lat, lon, zoom: "10" }, lang)).catch(
    () => null,
  );
  const found = around && typeof around === "object" && !("error" in around) ? cityOf(around as NominatimPlace) : null;
  return toPlace(p, found ?? "");
}

/**
 * Looser versions of an address for when the exact one finds nothing: OpenStreetMap rarely knows
 * house numbers in Indonesia, so "Jl. Raya Darmo No. 50, Wonokromo, Surabaya" becomes
 * "Jl. Raya Darmo, Wonokromo, Surabaya", then "Wonokromo, Surabaya".
 */
function looser(query: string): string[] {
  const parts = (s: string) => s.split(",").map((p) => p.trim()).filter(Boolean);
  const noNumbers = parts(
    query
      .replace(/\b(no|nomor|blok|kav|rt|rw)\.?\s*[\w/-]+/gi, "")
      .replace(/\b[a-z]?\d+[a-z]?\b/gi, ""),
  ).join(", ");
  const tail = parts(noNumbers).slice(-2).join(", ");
  return [...new Set([noNumbers, tail])].filter((q) => q.length >= 3 && q !== query);
}

/** Up to 5 places in Indonesia for `query`, nearest the store first; looser tries if none match. */
export async function searchPlaces(query: string, near: LatLng, lang: string): Promise<Place[]> {
  const q = query.trim().replace(/\s+/g, " ").slice(0, 120);
  if (q.length < 3) return [];
  for (const attempt of [q, ...looser(q)]) {
    const found = await searchExact(attempt, near, lang);
    if (found.length > 0) return found;
  }
  return [];
}

async function searchExact(q: string, near: LatLng, lang: string): Promise<Place[]> {
  // A box ~45 km around the store to rank local matches first (not a hard limit).
  const d = 0.4;
  const viewbox = [near.lng - d, near.lat + d, near.lng + d, near.lat - d].map((n) => n.toFixed(4)).join(",");
  const body = await cached(`s:${lang}:${q.toLowerCase()}`, () =>
    get("/search", { q, countrycodes: "id", limit: "5", viewbox }, lang),
  );
  // Resolved after the queued search, not inside it: a city lookup queued from inside would wait on its caller.
  const places = await Promise.all((Array.isArray(body) ? (body as NominatimPlace[]) : []).map((p) => resolvePlace(p, lang)));
  return places.filter((p): p is Place => p !== null);
}

/** The address at a pin, to fill the form. */
export async function placeAt(at: LatLng, lang: string): Promise<Place | null> {
  const lat = at.lat.toFixed(5);
  const lng = at.lng.toFixed(5);
  const body = (await cached(`r:${lang}:${lat},${lng}`, () =>
    get("/reverse", { lat, lon: lng, zoom: "18" }, lang),
  )) as (NominatimPlace & { error?: string }) | null;
  return body && !body.error ? resolvePlace(body, lang) : null;
}
