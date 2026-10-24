import "server-only";
import { cookies, headers } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./config";
import { getDictionary, type Dict } from "./dictionaries";

/**
 * Locale of the current request, for server actions and route handlers
 * (pages get it from the [lang] route param instead). Reads runtime data, so
 * never call it while rendering a prerendered page.
 */
export async function getRequestLocale(): Promise<Locale> {
  const [jar, h] = await Promise.all([cookies(), headers()]);
  return resolveLocale(jar.get(LOCALE_COOKIE)?.value, h.get("accept-language"));
}

export async function getRequestDict(): Promise<{ locale: Locale; d: Dict }> {
  const locale = await getRequestLocale();
  return { locale, d: getDictionary(locale) };
}
