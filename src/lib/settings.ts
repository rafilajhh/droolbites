import "server-only";
import { cache } from "react";
import { db } from "./db";

export const getStoreSettings = cache(async () => {
  const settings = await db.storeSettings.findUnique({ where: { id: 1 } });
  if (settings) return settings;
  // Fallback if the seed has not run yet.
  return db.storeSettings.create({
    data: {
      id: 1,
      storeName: "Droolbites",
      city: "Surabaya",
      email: "hello@droolbites.biz.id",
      phone: "+62 896 7562 4486",
      address: "Jl. Palem Sememi Raya F16, Sememi, Benowo, Surabaya",
    },
  });
});

export type StoreSettings = Awaited<ReturnType<typeof getStoreSettings>>;

/** Is the shop open right now (Surabaya time)? */
export function isOpenNow(settings: Pick<StoreSettings, "opensAt" | "closesAt" | "openDays">, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).formatToParts(now);
  const day = parts.find((p) => p.type === "weekday")!.value.toLowerCase().slice(0, 3);
  const time = `${parts.find((p) => p.type === "hour")!.value}:${parts.find((p) => p.type === "minute")!.value}`;
  return settings.openDays.split(",").includes(day) && time >= settings.opensAt && time < settings.closesAt;
}
