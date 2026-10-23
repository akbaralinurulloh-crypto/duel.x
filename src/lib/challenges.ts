// Pure helpers for challenges: types, filter parsing, labels, formatting.

export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Catalog status filter → stored statuses. Drafts are never listed. */
export const STATUS_FILTERS = {
  open: ["active"],
  upcoming: ["published"],
  finished: ["closed", "under_review", "completed"],
} as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;

export const STATUS_FILTER_LABELS: Record<StatusFilter, string> = {
  open: "Open now",
  upcoming: "Upcoming",
  finished: "Finished",
};

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

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Upcoming",
  active: "Open",
  closed: "Closed",
  under_review: "Under review",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function difficultyLabel(difficulty: string): string {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

const EVALUATION_LABELS: Record<string, string> = {
  automated: "Automated checks",
  rubric: "Scored against a rubric",
  hybrid: "Automated checks and rubric",
};

export function evaluationLabel(method: string): string {
  return EVALUATION_LABELS[method] ?? method;
}

/** Fixed-zone formatting, so server and client always agree. */
export function formatUtc(iso: string): string {
  const text = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
  return `${text} UTC`;
}

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

export const JOIN_GENERIC_ERROR = "Could not join the challenge. Please try again.";

/** Maps the machine-readable messages raised by join_challenge(). */
export function joinErrorMessage(message: string | undefined): string {
  const m = message ?? "";
  if (m.includes("not_authenticated")) return "Log in to join this challenge.";
  if (m.includes("challenge_not_found")) return "This challenge does not exist.";
  if (m.includes("challenge_not_open")) return "This challenge is not open for entries.";
  if (m.includes("challenge_full")) return "This challenge is full.";
  if (m.includes("category_inactive")) {
    return "This challenge's category is not active right now.";
  }
  return JOIN_GENERIC_ERROR;
}
