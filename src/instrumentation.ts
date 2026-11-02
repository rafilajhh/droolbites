/**
 * Runs once when the server starts. Every few minutes the app calls its own housekeeping route,
 * which closes unpaid orders past their deadline and emails those customers (app/api/cron/orders).
 */
const FIRST_RUN_MS = 60_000;
const EVERY_MS = 5 * 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const flag = globalThis as typeof globalThis & { __droolbitesCron?: boolean };
  if (flag.__droolbitesCron) return;
  flag.__droolbitesCron = true;

  const { cronKey } = await import("./lib/cron");
  const key = cronKey();
  if (!key) return;
  const url = `http://127.0.0.1:${process.env.PORT ?? 3000}/api/cron/orders`;

  const run = async () => {
    try {
      const res = await fetch(url, { method: "POST", headers: { "x-cron-key": key } });
      if (!res.ok) console.warn(`[cron] orders: HTTP ${res.status}`);
    } catch (error) {
      console.warn("[cron] orders: could not reach the app", error instanceof Error ? error.message : error);
    }
  };
  setTimeout(() => {
    void run();
    setInterval(() => void run(), EVERY_MS).unref();
  }, FIRST_RUN_MS).unref();
}
