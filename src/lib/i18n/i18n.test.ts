import { describe, expect, it } from "vitest";
import {
  LOCALES,
  fmt,
  formatUtc,
  pickFromAcceptLanguage,
  resolveLocale,
  splitLocalePrefix,
} from "./config";
import { getDictionary } from "./dictionaries";

type Tree = { [k: string]: string | Tree };

function leaves(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(tree)) {
    if (typeof v === "string") out.set(prefix + k, v);
    else for (const [kk, vv] of leaves(v, `${prefix}${k}.`)) out.set(kk, vv);
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("dictionaries", () => {
  const en = leaves(getDictionary("en") as unknown as Tree);
  const uz = leaves(getDictionary("uz") as unknown as Tree);

  it("have the same keys", () => {
    const missing = [...en.keys()].filter((k) => !uz.has(k));
    expect(missing).toEqual([]);
    const extra = [...uz.keys()].filter((k) => !en.has(k) && !k.startsWith("categories."));
    expect(extra).toEqual([]);
  });

  it("use the same placeholders in both languages", () => {
    for (const [key, value] of en) {
      const other = uz.get(key);
      if (other === undefined) continue;
      expect({ key, p: placeholders(other) }).toEqual({ key, p: placeholders(value) });
    }
  });

  it("have no empty Uzbek text where English has text (category overrides excepted)", () => {
    const empty = [...en.entries()]
      .filter(([k, v]) => v.trim() !== "" && !k.startsWith("categories."))
      .filter(([k]) => (uz.get(k) ?? "").trim() === "")
      .map(([k]) => k);
    expect(empty).toEqual([]);
  });
});

describe("locale helpers", () => {
  it("supports exactly English and Uzbek", () => {
    expect([...LOCALES]).toEqual(["en", "uz"]);
  });
  it("picks a language from Accept-Language, defaulting to English", () => {
    expect(pickFromAcceptLanguage("uz-UZ,uz;q=0.9,en;q=0.5")).toBe("uz");
    expect(pickFromAcceptLanguage("ru-RU,ru;q=0.9,en;q=0.5")).toBe("en");
    expect(pickFromAcceptLanguage("fr")).toBe("en");
    expect(pickFromAcceptLanguage(null)).toBe("en");
  });
  it("prefers a valid cookie over the header", () => {
    expect(resolveLocale("uz", "en")).toBe("uz");
    expect(resolveLocale("xx", "uz")).toBe("uz");
  });
  it("splits only supported locale prefixes", () => {
    expect(splitLocalePrefix("/uz/challenges")).toEqual({ locale: "uz", rest: "/challenges" });
    expect(splitLocalePrefix("/en")).toEqual({ locale: "en", rest: "/" });
    expect(splitLocalePrefix("/ru/x")).toBeNull();
    expect(splitLocalePrefix("/challenges")).toBeNull();
  });
  it("fills placeholders and keeps unknown ones visible", () => {
    expect(fmt("{a} of {b}", { a: 1, b: 2 })).toBe("1 of 2");
    expect(fmt("{a} {x}", { a: 1 })).toBe("1 {x}");
  });
  it("formats dates in UTC for both languages", () => {
    expect(formatUtc("2026-11-01T09:30:00Z", "en")).toContain("UTC");
    expect(formatUtc("2026-11-01T09:30:00Z", "uz")).toContain("UTC");
  });
});
