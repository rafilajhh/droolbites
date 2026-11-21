// Store hours (checkout opens and closes with the shop), pure logic:  npx tsx scripts/store-hours.test.ts
// No database or server: every check passes its own clock. Times are WIB (UTC+7); `wib()` builds one.
import { checkoutClosed, nextOpening, storeOpenNow, wibClock } from "../src/lib/store-hours";

let failed = 0;
function check(name: string, fn: () => string | void) {
  try {
    const evidence = fn();
    console.log(`PASS  ${name}${evidence ? `  -- ${evidence}` : ""}`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}  -- ${e instanceof Error ? e.message : String(e)}`);
  }
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** A moment in WIB: 2026-11-21 is a Saturday, 2026-11-22 a Sunday, 2026-11-23 a Monday. */
const wib = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`);
const EVERY_DAY = "mon,tue,wed,thu,fri,sat,sun";
const shop = { opensAt: "07:00", closesAt: "21:00", openDays: EVERY_DAY };

check("WIB clock: Saturday 20:29 WIB is Saturday 13:29 UTC", () => {
  const c = wibClock(new Date("2026-11-21T13:29:00Z"));
  assert(c.day === 5 && c.minute === 20 * 60 + 29, JSON.stringify(c));
  return JSON.stringify(c);
});

check("WIB clock: 23:30 UTC Friday is already Saturday 06:30 WIB", () => {
  const c = wibClock(new Date("2026-11-20T23:30:00Z"));
  assert(c.day === 5 && c.minute === 6 * 60 + 30, JSON.stringify(c));
});

check("Open in the middle of the day", () => {
  assert(storeOpenNow(shop, wib("2026-11-21", "12:00")), "closed at 12:00");
});

check("Edge minutes: 06:59 closed, 07:00 open, 20:29 open, 20:30 closed (last order 30 min before 21:00)", () => {
  const at = (t: string) => storeOpenNow(shop, wib("2026-11-21", t));
  assert(!at("06:59"), "open at 06:59");
  assert(at("07:00"), "closed at 07:00");
  assert(at("20:29"), "closed at 20:29");
  assert(!at("20:30"), "open at 20:30");
  assert(!at("21:00") && !at("23:59") && !at("00:00"), "open after closing");
});

check("Seconds don't matter: 20:29:59 is still open", () => {
  assert(storeOpenNow(shop, new Date("2026-11-21T20:29:59+07:00")), "closed at 20:29:59");
});

check("Closed day: open Mon–Sat, Sunday noon is closed", () => {
  const monSat = { ...shop, openDays: "mon,tue,wed,thu,fri,sat" };
  assert(storeOpenNow(monSat, wib("2026-11-21", "12:00")), "Saturday noon closed");
  assert(!storeOpenNow(monSat, wib("2026-11-22", "12:00")), "Sunday noon open");
});

check("Next opening: before opening it's today", () => {
  const n = nextOpening(shop, wib("2026-11-21", "05:00"));
  assert(eq(n, { inDays: 0, day: 5, time: "07:00" }), JSON.stringify(n));
  return JSON.stringify(n);
});

check("Next opening: after the last order it's tomorrow (Sunday)", () => {
  const n = nextOpening(shop, wib("2026-11-21", "20:45"));
  assert(eq(n, { inDays: 1, day: 6, time: "07:00" }), JSON.stringify(n));
});

check("Next opening: just past midnight it's later the same day", () => {
  const n = nextOpening(shop, wib("2026-11-22", "00:10"));
  assert(eq(n, { inDays: 0, day: 6, time: "07:00" }), JSON.stringify(n));
});

check("Next opening skips closed days: Saturday night with Sunday closed -> Monday, in 2 days", () => {
  const n = nextOpening({ ...shop, openDays: "mon,tue,wed,thu,fri,sat" }, wib("2026-11-21", "22:00"));
  assert(eq(n, { inDays: 2, day: 0, time: "07:00" }), JSON.stringify(n));
});

check("Next opening across the week: only Saturdays open, Saturday evening -> next Saturday (7 days)", () => {
  const n = nextOpening({ ...shop, openDays: "sat" }, wib("2026-11-21", "21:30"));
  assert(eq(n, { inDays: 7, day: 5, time: "07:00" }), JSON.stringify(n));
});

check("Next opening: only Mondays open, Sunday morning -> tomorrow", () => {
  const n = nextOpening({ ...shop, openDays: "mon" }, wib("2026-11-22", "09:00"));
  assert(eq(n, { inDays: 1, day: 0, time: "07:00" }), JSON.stringify(n));
});

check("No open day at all: always closed, no next opening", () => {
  const none = { ...shop, openDays: "" };
  assert(!storeOpenNow(none, wib("2026-11-21", "12:00")), "open with no open days");
  assert(nextOpening(none, wib("2026-11-21", "12:00")) === null, "next opening found");
});

check("00:00–23:59 every day is round the clock (no 23:29 cut-off)", () => {
  const always = { opensAt: "00:00", closesAt: "23:59", openDays: EVERY_DAY };
  for (const t of ["00:00", "06:00", "23:29", "23:45", "23:59"]) assert(storeOpenNow(always, wib("2026-11-21", t)), `closed at ${t}`);
});

check("Closing at 23:59 on some days: closed days still closed, open from opening time", () => {
  const late = { opensAt: "10:00", closesAt: "23:59", openDays: "sat" };
  assert(storeOpenNow(late, wib("2026-11-21", "23:50")), "Saturday 23:50 closed");
  assert(!storeOpenNow(late, wib("2026-11-21", "09:59")), "Saturday 09:59 open");
  assert(!storeOpenNow(late, wib("2026-11-22", "00:30")), "Sunday 00:30 open");
});

check("Unreadable or inverted times never block checkout", () => {
  assert(storeOpenNow({ ...shop, opensAt: "7am" }, wib("2026-11-21", "03:00")), "blocked on '7am'");
  assert(storeOpenNow({ ...shop, opensAt: "22:00", closesAt: "21:00" }, wib("2026-11-21", "03:00")), "blocked on inverted times");
});

check("Short day: closing 20 minutes after opening leaves no ordering time", () => {
  const short = { opensAt: "10:00", closesAt: "10:20", openDays: EVERY_DAY };
  assert(!storeOpenNow(short, wib("2026-11-21", "10:05")), "open at 10:05");
});

check("checkoutClosed: null while open, the notice facts when closed", () => {
  assert(checkoutClosed(shop, wib("2026-11-21", "12:00"), false) === null, "closed at noon");
  const c = checkoutClosed(shop, wib("2026-11-21", "20:45"), false);
  assert(eq(c, { reopens: { inDays: 1, day: 6, time: "07:00" }, opens: "07:00", closes: "21:00", lastOrder: "20:30" }), JSON.stringify(c));
  return JSON.stringify(c);
});

check("checkoutClosed: the testing switch (STORE_HOURS_ALWAYS_OPEN) keeps it open", () => {
  assert(checkoutClosed(shop, wib("2026-11-21", "03:00"), true) === null, "closed with the switch on");
});

check("checkoutClosed on a 23:59 closing day names 23:59 as the last order", () => {
  const c = checkoutClosed({ opensAt: "10:00", closesAt: "23:59", openDays: "sat" }, wib("2026-11-21", "08:00"), false);
  assert(c?.lastOrder === "23:59" && c.reopens?.inDays === 0, JSON.stringify(c));
});

if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log("all passed");
