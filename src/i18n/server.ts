import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { defaultLocale, isLocale, LOCALE_COOKIE, pickMessages, type Locale, type Messages } from "./config";

export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
});

export async function getMessages<T>(messages: Messages<T>): Promise<T> {
  return pickMessages(messages, await getLocale());
}
