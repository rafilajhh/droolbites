"use client";

import { createContext, useContext } from "react";
import { defaultLocale, pickMessages, type Locale, type Messages } from "./config";

const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useMessages<T>(messages: Messages<T>): T {
  return pickMessages(messages, useLocale());
}
