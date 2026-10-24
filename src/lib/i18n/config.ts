// Locale configuration. Pure (safe in the proxy, server and client).

export const LOCALES = ["en", "uz"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "locale";

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  uz: "O‘zbekcha",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** First supported language in an Accept-Language header, else the default. */
export function pickFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const tags = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim().toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .filter((t) => t.tag && Number.isFinite(t.q) && t.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of tags) {
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Locale in a cookie value, else Accept-Language, else the default. */
export function resolveLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  return isLocale(cookieValue) ? cookieValue : pickFromAcceptLanguage(acceptLanguage);
}

/** "/uz/challenges" → { locale: "uz", rest: "/challenges" }; no prefix → null. */
export function splitLocalePrefix(pathname: string): { locale: Locale; rest: string } | null {
  const m = /^\/([a-z]{2})(\/.*)?$/.exec(pathname);
  if (!m || !isLocale(m[1])) return null;
  return { locale: m[1], rest: m[2] ?? "/" };
}

/** Replaces {name} placeholders. Missing values are left visible, never dropped. */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    Object.hasOwn(vars, key) ? String(vars[key]) : whole,
  );
}

const INTL_LOCALE: Record<Locale, string> = { en: "en-GB", uz: "uz-UZ" };

/** Fixed-zone formatting, so server and client always agree. */
export function formatUtc(iso: string, locale: Locale): string {
  const text = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
  return `${text} UTC`;
}

export function formatDateUtc(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(iso));
}
