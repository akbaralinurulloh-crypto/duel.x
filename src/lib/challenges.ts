// Pure helpers for challenges: types, filter parsing, labels, formatting.
import { fmt, formatUtc } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Catalog status filter → stored statuses. Drafts are never listed. */
export const STATUS_FILTERS = {
  open: ["active"],
  upcoming: ["published"],
  finished: ["closed", "under_review", "completed"],
} as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;

export const PAGE_SIZE = 12;
const MAX_PAGE = 1000;

export type CatalogParams = {
  category?: string;
  status?: StatusFilter;
  difficulty?: Difficulty;
  page: number;
};

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Untrusted query string → validated filters. Unknown values are ignored. */
export function parseCatalogParams(raw: RawParams): CatalogParams {
  const category = one(raw.category);
  const status = one(raw.status);
  const difficulty = one(raw.difficulty);
  const page = Number.parseInt(one(raw.page) ?? "1", 10);

  return {
    category:
      category && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(category) ? category : undefined,
    status:
      status && Object.hasOwn(STATUS_FILTERS, status)
        ? (status as StatusFilter)
        : undefined,
    difficulty: (DIFFICULTIES as readonly string[]).includes(difficulty ?? "")
      ? (difficulty as Difficulty)
      : undefined,
    page: Number.isInteger(page) && page >= 1 && page <= MAX_PAGE ? page : 1,
  };
}

/** Builds a /challenges URL for the given filters (omits defaults). */
export function catalogHref(params: Partial<CatalogParams>): string {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.status) q.set("status", params.status);
  if (params.difficulty) q.set("difficulty", params.difficulty);
  if (params.page && params.page > 1) q.set("page", String(params.page));
  const s = q.toString();
  return s ? `/challenges?${s}` : "/challenges";
}

export type CategoryRef = { slug: string; name: string };

export type ChallengeSummary = {
  slug: string;
  title: string;
  summary: string | null;
  difficulty: string;
  status: string;
  starts_at: string;
  ends_at: string;
  max_participants: number | null;
  category: CategoryRef | null;
};

export type ChallengeDetail = ChallengeSummary & {
  id: string;
  description: string | null;
  instructions: unknown;
  evaluation_method: string;
  max_submissions: number;
};

export function statusLabel(status: string, d: Dict): string {
  return Object.hasOwn(d.statuses, status) ? d.statuses[status as keyof Dict["statuses"]] : status;
}

export function difficultyLabel(difficulty: string, d: Dict): string {
  return Object.hasOwn(d.difficulties, difficulty)
    ? d.difficulties[difficulty as keyof Dict["difficulties"]]
    : difficulty;
}

export function evaluationLabel(method: string, d: Dict): string {
  return Object.hasOwn(d.evaluation, method)
    ? d.evaluation[method as keyof Dict["evaluation"]]
    : method;
}

/** Category name/description in the visitor's language (database text as fallback). */
export function localizedCategory(
  d: Dict,
  category: { slug: string; name: string; description?: string | null },
): { name: string; description: string | null } {
  const own = Object.hasOwn(d.categories, category.slug) ? d.categories[category.slug] : null;
  return {
    name: own?.name ?? category.name,
    description: own?.description ?? category.description ?? null,
  };
}

/** "1 challenge" / "5 challenges" (languages without plurals use the same text). */
export function challengeCount(d: Dict, n: number): string {
  return fmt(n === 1 ? d.common.challengeOne : d.common.challengeOther, { n });
}

export { formatUtc };

export function instructionSteps(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

export function descriptionParagraphs(text: string | null): string[] {
  if (!text) return [];
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Maps the machine-readable messages raised by join_challenge(). */
export function joinErrorMessage(message: string | undefined, d: Dict): string {
  const m = message ?? "";
  for (const code of [
    "not_authenticated",
    "challenge_not_found",
    "challenge_not_open",
    "challenge_full",
    "category_inactive",
  ] as const) {
    if (m.includes(code)) return d.joinErrors[code];
  }
  return d.joinErrors.generic;
}
