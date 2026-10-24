import { setLocale } from "@/app/locale-actions";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/config";

// Plain forms, so switching language works without JavaScript too.
export function LanguageSwitcher({ locale, label }: { locale: Locale; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 text-sm">
      {LOCALES.map((l) => (
        <form key={l} action={setLocale}>
          <input type="hidden" name="locale" value={l} />
          <button
            type="submit"
            lang={l}
            title={LOCALE_NAMES[l]}
            aria-pressed={l === locale}
            className={`rounded-md px-2.5 py-1.5 font-medium uppercase transition-colors ${
              l === locale
                ? "bg-surface text-text ring-1 ring-line"
                : "text-muted hover:text-text"
            }`}
          >
            {l}
          </button>
        </form>
      ))}
    </div>
  );
}
