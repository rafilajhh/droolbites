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
