import { halfHourBefore } from "@/components/content/hours";

/**
 * When the shop takes orders, in Surabaya time (WIB: UTC+7, no daylight saving). Orders are taken on the
 * open days from opening time until the last order, half an hour before closing: the same cut-off as
 * pickup orders (halfHourBefore, shown on /location). A shop that closes at 23:59 runs to midnight with no
 * cut-off, since the settings can't say 24:00 (00:00–23:59 every day = round the clock).
 *
 * Pure (the clock is passed in), so scripts/store-hours.test.ts runs it without a server.
 */

export const WEEK = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Hours = { opensAt: string; closesAt: string; openDays: string };

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const MIDNIGHT = 24 * 60;

function minutesOf(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[2])];
  return h < 24 && min < 60 ? h * 60 + min : null;
}

/** The weekday (0 = Monday, as in WEEK) and the minute of the day in WIB. */
export function wibClock(now: Date) {
  const t = new Date(now.getTime() + WIB_OFFSET_MS);
  return { day: (t.getUTCDay() + 6) % 7, minute: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** The minutes orders open and stop, or null when the times can't be read or don't make a day. */
function orderWindow(settings: Hours) {
  const opens = minutesOf(settings.opensAt);
  const closes = minutesOf(settings.closesAt);
  if (opens === null || closes === null || closes <= opens) return null;
  const lastOrder = closes >= MIDNIGHT - 1 ? MIDNIGHT : minutesOf(halfHourBefore(settings))!;
  return { opens, lastOrder };
}

const openDaysOf = (settings: Hours) => new Set(settings.openDays.split(",").map((d) => d.trim()));

/** Whether an order can be placed at `now`. Times that can't be read never block checkout. */
export function storeOpenNow(settings: Hours, now: Date): boolean {
  const window = orderWindow(settings);
  if (!window) return true;
  const { day, minute } = wibClock(now);
  return openDaysOf(settings).has(WEEK[day]) && minute >= window.opens && minute < window.lastOrder;
}

/**
 * The next time orders open after `now`: in how many days (0 = later today), the weekday (0 = Monday) and
 * the opening time. Null when no day is open or the times can't be read.
 */
export function nextOpening(settings: Hours, now: Date): { inDays: number; day: number; time: string } | null {
  const window = orderWindow(settings);
  if (!window) return null;
  const days = openDaysOf(settings);
  const { day, minute } = wibClock(now);
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7;
    // Today counts only before it opens; once it has opened (or closed) the next open day does.
    if (!days.has(WEEK[d]) || (i === 0 && minute >= window.opens)) continue;
    return { inDays: i, day: d, time: settings.opensAt };
  }
  return null;
}

/** Why checkout is closed, for the notice: when orders open again, the opening hours and the last order. */
export type StoreClosed = {
  reopens: { inDays: number; day: number; time: string } | null;
  opens: string;
  closes: string;
  lastOrder: string;
};

/**
 * Null while the shop takes orders, else when it opens again. STORE_HOURS_ALWAYS_OPEN="on" keeps checkout
 * open around the clock (testing only: never on the live store).
 */
export function checkoutClosed(settings: Hours, now = new Date(), alwaysOpen = process.env.STORE_HOURS_ALWAYS_OPEN === "on"): StoreClosed | null {
  if (alwaysOpen || storeOpenNow(settings, now)) return null;
  const window = orderWindow(settings)!;
  return {
    reopens: nextOpening(settings, now),
    opens: settings.opensAt,
    closes: settings.closesAt,
    lastOrder: window.lastOrder >= MIDNIGHT ? settings.closesAt : halfHourBefore(settings),
  };
}
