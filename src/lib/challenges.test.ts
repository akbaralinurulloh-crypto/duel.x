import { describe, expect, it } from "vitest";
import {
  JOIN_GENERIC_ERROR,
  catalogHref,
  descriptionParagraphs,
  formatUtc,
  instructionSteps,
  joinErrorMessage,
  parseCatalogParams,
  statusLabel,
} from "./challenges";

describe("parseCatalogParams", () => {
  it("accepts valid filters", () => {
    expect(
      parseCatalogParams({
        category: "data-analysis",
        status: "open",
        difficulty: "advanced",
        page: "3",
      }),
    ).toEqual({
      category: "data-analysis",
      status: "open",
      difficulty: "advanced",
      page: 3,
    });
  });

  it("ignores unknown or hostile values", () => {
    const r = parseCatalogParams({
      category: "Robert'); DROP TABLE x;--",
      status: "draft",
      difficulty: "godlike",
      page: "-4",
    });
    expect(r).toEqual({
      category: undefined,
      status: undefined,
      difficulty: undefined,
      page: 1,
    });
  });

  it("never lets a prototype key through as a status", () => {
    expect(parseCatalogParams({ status: "constructor" }).status).toBeUndefined();
    expect(parseCatalogParams({ status: "__proto__" }).status).toBeUndefined();
  });

  it("clamps bad pages and takes the first of repeated params", () => {
    expect(parseCatalogParams({ page: "abc" }).page).toBe(1);
    expect(parseCatalogParams({ page: "99999" }).page).toBe(1);
    expect(parseCatalogParams({ page: ["2", "5"] }).page).toBe(2);
  });
});

describe("catalogHref", () => {
  it("omits defaults and encodes filters", () => {
    expect(catalogHref({})).toBe("/challenges");
    expect(catalogHref({ page: 1 })).toBe("/challenges");
    expect(catalogHref({ category: "ai-automation", page: 2 })).toBe(
      "/challenges?category=ai-automation&page=2",
    );
  });
});

describe("labels and formatting", () => {
  it("maps statuses to reader-facing words", () => {
    expect(statusLabel("published")).toBe("Upcoming");
    expect(statusLabel("active")).toBe("Open");
    expect(statusLabel("weird")).toBe("weird");
  });

  it("formats dates in UTC regardless of the machine zone", () => {
    expect(formatUtc("2026-11-01T09:30:00Z")).toBe("1 Nov 2026, 09:30 UTC");
  });

  it("keeps only non-empty string instruction steps", () => {
    expect(instructionSteps(["a", "", 3, null, " b "])).toEqual(["a", " b "]);
    expect(instructionSteps({ not: "an array" })).toEqual([]);
  });

  it("splits descriptions into paragraphs", () => {
    expect(descriptionParagraphs("One.\n\nTwo.\n\n\n\nThree.")).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
    expect(descriptionParagraphs(null)).toEqual([]);
  });
});

describe("joinErrorMessage", () => {
  it("translates each code raised by join_challenge()", () => {
    expect(joinErrorMessage("challenge_full")).toMatch(/full/);
    expect(joinErrorMessage("challenge_not_open")).toMatch(/not open/);
    expect(joinErrorMessage("not_authenticated")).toMatch(/Log in/);
    expect(joinErrorMessage("category_inactive")).toMatch(/category/);
  });

  it("hides anything unexpected", () => {
    expect(joinErrorMessage("pg: relation does not exist")).toBe(JOIN_GENERIC_ERROR);
    expect(joinErrorMessage(undefined)).toBe(JOIN_GENERIC_ERROR);
  });
});
