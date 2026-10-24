import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  challengeSchema,
  parseRubricText,
  parseScores,
  parseUtcLocal,
  slugify,
  toUtcLocal,
} from "./parse";

const d = getDictionary("en");

const base = {
  title: "Prompt Duel #1",
  slug: "",
  categorySlug: "prompt-engineering",
  summary: "",
  description: "",
  instructions: "Read the brief\n\n  Write a prompt  \n",
  difficulty: "beginner",
  evaluationMethod: "rubric",
  startsAt: "2026-11-01T10:00",
  endsAt: "2026-11-08T10:00",
  maxParticipants: "",
  maxSubmissions: "",
};

describe("slugify", () => {
  it("builds clean slugs", () => {
    expect(slugify("Prompt Duel #1!")).toBe("prompt-duel-1");
    expect(slugify("  Café  ñandú ")).toBe("cafe-nandu");
    expect(slugify("***")).toBe("");
    expect(slugify("a".repeat(150))).toHaveLength(100);
  });
});

describe("parseUtcLocal / toUtcLocal", () => {
  it("reads datetime-local as UTC and rejects invalid dates", () => {
    expect(parseUtcLocal("2026-11-01T10:30")).toBe("2026-11-01T10:30:00.000Z");
    expect(parseUtcLocal("2026-02-30T10:00")).toBeNull();
    expect(parseUtcLocal("2026-11-01")).toBeNull();
    expect(parseUtcLocal("")).toBeNull();
  });
  it("round-trips", () => {
    expect(toUtcLocal("2026-11-01T10:30:00.000Z")).toBe("2026-11-01T10:30");
  });
});

describe("challengeSchema", () => {
  it("accepts a valid input and fills defaults", () => {
    const r = challengeSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.slug).toBe("prompt-duel-1");
      expect(r.data.instructions).toEqual(["Read the brief", "Write a prompt"]);
      expect(r.data.maxSubmissions).toBe(3);
      expect(r.data.maxParticipants).toBeNull();
      expect(r.data.startsAt).toBe("2026-11-01T10:00:00.000Z");
    }
  });
  it("rejects end before start, bad numbers and bad enums", () => {
    const bad = (o: object) => challengeSchema.safeParse({ ...base, ...o });
    expect(bad({ endsAt: "2026-10-01T10:00" }).success).toBe(false);
    expect(bad({ maxParticipants: "0" }).success).toBe(false);
    expect(bad({ maxParticipants: "2.5" }).success).toBe(false);
    expect(bad({ maxSubmissions: "21" }).success).toBe(false);
    expect(bad({ difficulty: "extreme" }).success).toBe(false);
    expect(bad({ evaluationMethod: "magic" }).success).toBe(false);
    expect(bad({ slug: "Bad Slug" }).success).toBe(false);
    expect(bad({ title: " " }).success).toBe(false);
    expect(bad({ instructions: Array(31).fill("x").join("\n") }).success).toBe(false);
  });
});

describe("parseRubricText", () => {
  it("parses well-formed lines", () => {
    const r = parseRubricText("clarity | Clarity | 10\nresult|Result quality|20.5", d);
    expect(r).toEqual({
      ok: true,
      criteria: [
        { key: "clarity", label: "Clarity", max_points: 10 },
        { key: "result", label: "Result quality", max_points: 20.5 },
      ],
    });
  });
  it("reports the first problem with a line number", () => {
    expect(parseRubricText("", d)).toMatchObject({ ok: false });
    expect(parseRubricText("a | A", d)).toMatchObject({ ok: false, error: expect.stringContaining("Line 1") });
    expect(parseRubricText("Bad Key | A | 5", d)).toMatchObject({ ok: false });
    expect(parseRubricText("a | A | 0", d)).toMatchObject({ ok: false });
    expect(parseRubricText("a | A | x", d)).toMatchObject({ ok: false });
    expect(parseRubricText("a | A | 5\na | B | 5", d)).toMatchObject({ ok: false, error: expect.stringContaining("duplicate") });
  });
});

describe("parseScores", () => {
  const criteria = [
    { key: "a", label: "A", max_points: 10 },
    { key: "b", label: "B", max_points: 5 },
  ];
  const getter = (m: Record<string, string>) => (n: string) => m[n] ?? "";
  it("accepts scores within range", () => {
    expect(parseScores(getter({ score_a: "7.5", score_b: "0" }), criteria, d)).toEqual({
      ok: true,
      scores: { a: 7.5, b: 0 },
    });
  });
  it("rejects missing, negative, too-high and non-numeric scores", () => {
    expect(parseScores(getter({ score_a: "1" }), criteria, d).ok).toBe(false);
    expect(parseScores(getter({ score_a: "-1", score_b: "1" }), criteria, d).ok).toBe(false);
    expect(parseScores(getter({ score_a: "11", score_b: "1" }), criteria, d).ok).toBe(false);
    expect(parseScores(getter({ score_a: "x", score_b: "1" }), criteria, d).ok).toBe(false);
  });
});
