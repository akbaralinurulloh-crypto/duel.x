import { describe, expect, it } from "vitest";
import { extractJson, normalizeScores } from "./scoring";

const criteria = [
  { key: "idea", label: "Idea", max_points: 20 },
  { key: "video", label: "Video", max_points: 10 },
];

describe("extractJson", () => {
  it("reads fenced JSON", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it("returns null for junk", () => {
    expect(extractJson("no json")).toBeNull();
    expect(extractJson("{broken")).toBeNull();
  });
});

describe("normalizeScores", () => {
  it("clamps and rounds to half points", () => {
    const r = normalizeScores({ scores: { idea: 25, video: 7.3 }, feedback: " ok " }, criteria);
    expect(r).toEqual({ scores: { idea: 20, video: 7.5 }, feedback: "ok" });
  });
  it("rejects a missing criterion", () => {
    expect(normalizeScores({ scores: { idea: 5 } }, criteria)).toBeNull();
  });
  it("rejects non-numeric scores and bad input", () => {
    expect(normalizeScores({ scores: { idea: "x", video: 1 } }, criteria)).toBeNull();
    expect(normalizeScores(null, criteria)).toBeNull();
  });
});
