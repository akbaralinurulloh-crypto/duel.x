// Pure helpers (no I/O) so they can be unit-tested.

export type Criterion = { key: string; label: string; max_points: number };

/** Pulls the first JSON object out of a model reply (it may be fenced). */
export function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Validates model output against the rubric. Every criterion must have a
 * number; values are clamped to 0..max and rounded to 0.5. Returns null when
 * the reply is unusable (the caller then saves nothing).
 */
export function normalizeScores(
  raw: unknown,
  criteria: Criterion[],
): { scores: Record<string, number>; feedback: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { scores?: unknown; feedback?: unknown };
  if (!obj.scores || typeof obj.scores !== "object") return null;
  const given = obj.scores as Record<string, unknown>;
  const scores: Record<string, number> = {};
  for (const c of criteria) {
    const v = Number(given[c.key]);
    if (!Number.isFinite(v)) return null;
    scores[c.key] = Math.round(Math.min(Math.max(v, 0), c.max_points) * 2) / 2;
  }
  const feedback = typeof obj.feedback === "string" ? obj.feedback.trim().slice(0, 4500) : "";
  return { scores, feedback };
}

export const TEXT_EXTENSIONS = ["html", "htm", "css", "js", "mjs", "ts", "tsx", "jsx", "json", "md", "txt", "csv", "py", "svg"];
