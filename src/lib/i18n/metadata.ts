import "server-only";
import type { Metadata } from "next";
import { isLocale } from "./config";
import { getDictionary, type Dict } from "./dictionaries";

/** Per-page metadata in the language of the [lang] route param. */
export async function localizedMetadata(
  params: Promise<{ lang: string }>,
  pick: (d: Dict) => Metadata,
): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return pick(getDictionary(lang));
}
