/**
 * Bilingual setup: English is the default, Indonesian is the switch.
 * The choice lives in the `lang` cookie; URLs stay the same for both.
 *
 * Messages are grouped per area in src/i18n/messages/<area>.ts, each written
 * with defineMessages({ en: {...}, id: {...} }). The `id` object must have the
 * same shape as `en`; TypeScript enforces it.
 *
 * Server components:  const t = await getMessages(checkoutMessages)
 * Client components:  const t = useMessages(checkoutMessages)
 */
export const locales = ["en", "id"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "id";
}

type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { [K in keyof T]: Widen<T[K]> }
        : T;

export type Messages<T> = { en: T; id: Widen<T> };

export function defineMessages<const T>(messages: { en: T; id: Widen<T> }): Messages<T> {
  return messages;
}

export function pickMessages<T>(messages: Messages<T>, locale: Locale): T {
  return (locale === "id" ? messages.id : messages.en) as T;
}
