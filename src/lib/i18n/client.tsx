"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Dict } from "./dictionaries";

type Value = { locale: Locale; d: Dict };
const I18nContext = createContext<Value | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dict;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, d: dict }}>{children}</I18nContext.Provider>;
}

/** Locale and dictionary for client components. */
export function useI18n(): Value {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>.");
  return value;
}
