import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { getDictionary, type Dict } from "./dictionaries";

/** Language and dictionary from the [lang] route param (validated in the layout). */
export async function langFromParams(
  params: Promise<{ lang: string }>,
): Promise<{ lang: Locale; d: Dict }> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : DEFAULT_LOCALE;
  return { lang: locale, d: getDictionary(locale) };
}
