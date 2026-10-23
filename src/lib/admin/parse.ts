import { z } from "zod";
import { DIFFICULTIES } from "@/lib/challenges";
import type { RubricCriterion } from "@/lib/submissions";

/** "My Great Challenge!" -> "my-great-challenge" (max 100 chars). */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

/** <input type="datetime-local"> value, interpreted as UTC -> ISO string. */
export function parseUtcLocal(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d ||
    date.getUTCHours() !== h
  ) {
    return null;
  }
  return date.toISOString();
}

/** ISO string -> value for <input type="datetime-local"> (UTC). */
export function toUtcLocal(iso: string): string {
  return iso.slice(0, 16);
}

export function parseInstructionLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

export const MAX_INSTRUCTIONS = 30;

export const challengeSchema = z
  .object({
    title: z.string().trim().min(1, "Enter a title.").max(160, "Title must be at most 160 characters."),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(100)
      .regex(/^([a-z0-9]+(-[a-z0-9]+)*)?$/, "Use lowercase letters, numbers and hyphens."),
    categorySlug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Choose a category."),
    summary: z.string().trim().max(300, "Summary must be at most 300 characters."),
    description: z.string().trim().max(20000, "Description is too long."),
    instructions: z.string().max(20000),
    difficulty: z.enum(DIFFICULTIES, { error: "Choose a level." }),
    evaluationMethod: z.enum(["automated", "rubric", "hybrid"], { error: "Choose a method." }),
    startsAt: z.string(),
    endsAt: z.string(),
    maxParticipants: z.string().trim(),
    maxSubmissions: z.string().trim(),
  })
  .transform((v, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: "custom", path: [path], message });

    const startsAt = parseUtcLocal(v.startsAt);
    const endsAt = parseUtcLocal(v.endsAt);
    if (!startsAt) issue("startsAt", "Enter a valid start time (UTC).");
    if (!endsAt) issue("endsAt", "Enter a valid end time (UTC).");
    if (startsAt && endsAt && endsAt <= startsAt) issue("endsAt", "The end must be after the start.");

    let maxParticipants: number | null = null;
    if (v.maxParticipants) {
      const n = Number(v.maxParticipants);
      if (!Number.isInteger(n) || n < 1 || n > 1_000_000) issue("maxParticipants", "Enter a whole number of 1 or more, or leave empty.");
      else maxParticipants = n;
    }

    const subs = v.maxSubmissions ? Number(v.maxSubmissions) : 3;
    if (!Number.isInteger(subs) || subs < 1 || subs > 20) issue("maxSubmissions", "Enter a whole number from 1 to 20.");

    const instructions = parseInstructionLines(v.instructions);
    if (instructions.length > MAX_INSTRUCTIONS) issue("instructions", `Use at most ${MAX_INSTRUCTIONS} steps.`);
    if (instructions.some((s) => s.length > 500)) issue("instructions", "Each step must be at most 500 characters.");

    const slug = v.slug || slugify(v.title);
    if (!slug) issue("slug", "Could not build a URL name from the title.");

    return {
      title: v.title,
      slug,
      categorySlug: v.categorySlug,
      summary: v.summary || null,
      description: v.description || null,
      instructions,
      difficulty: v.difficulty,
      evaluationMethod: v.evaluationMethod,
      startsAt: startsAt ?? "",
      endsAt: endsAt ?? "",
      maxParticipants,
      maxSubmissions: subs,
    };
  });

export type ChallengeInput = z.output<typeof challengeSchema>;

/**
 * Rubric text, one criterion per line:  key | Label | max points
 * e.g.  clarity | Clarity of the prompt | 10
 */
export function parseRubricText(
  text: string,
): { ok: true; criteria: RubricCriterion[] } | { ok: false; error: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, error: "Add at least one criterion." };
  if (lines.length > 20) return { ok: false, error: "Use at most 20 criteria." };

  const seen = new Set<string>();
  const criteria: RubricCriterion[] = [];
  for (const [i, line] of lines.entries()) {
    const parts = line.split("|").map((p) => p.trim());
    const where = `Line ${i + 1}`;
    if (parts.length !== 3) return { ok: false, error: `${where}: use "key | Label | points".` };
    const [key, label, pointsText] = parts;
    if (!/^[a-z][a-z0-9_]{0,39}$/.test(key)) {
      return { ok: false, error: `${where}: the key must be lowercase letters, numbers or underscores.` };
    }
    if (seen.has(key)) return { ok: false, error: `${where}: duplicate key "${key}".` };
    if (label.length < 1 || label.length > 80) return { ok: false, error: `${where}: the label must be 1–80 characters.` };
    const points = Number(pointsText);
    if (!Number.isFinite(points) || points <= 0 || points > 1000) {
      return { ok: false, error: `${where}: points must be a number above 0 and up to 1000.` };
    }
    seen.add(key);
    criteria.push({ key, label, max_points: points });
  }
  return { ok: true, criteria };
}

/** Reads score_<key> fields; rejects anything outside 0..max. */
export function parseScores(
  get: (name: string) => string,
  criteria: RubricCriterion[],
): { ok: true; scores: Record<string, number> } | { ok: false; error: string } {
  const scores: Record<string, number> = {};
  for (const c of criteria) {
    const raw = get(`score_${c.key}`).trim();
    const value = raw === "" ? Number.NaN : Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > c.max_points) {
      return { ok: false, error: `"${c.label}" needs a score from 0 to ${c.max_points}.` };
    }
    scores[c.key] = value;
  }
  return { ok: true, scores };
}
