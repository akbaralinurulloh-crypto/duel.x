import type { Locale } from "../config";
import { en, type Dict } from "./en";
import { uz } from "./uz";

export type { Dict };

const DICTIONARIES: Record<Locale, Dict> = { en, uz };

export function getDictionary(locale: Locale): Dict {
  return DICTIONARIES[locale];
}
