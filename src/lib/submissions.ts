// Pure helpers for submissions (no I/O). Limits mirror the database and the
// Storage bucket; the database/bucket are the authority, this gives early,
// friendly feedback.

export const MAX_CONTENT_LENGTH = 20000;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const FILE_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  json: "application/json",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
};

export const FILE_HINT = "PDF, TXT, MD, CSV, JSON, ZIP, PNG or JPG, up to 10 MB.";

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function contentTypeFor(name: string): string | null {
  const ext = extensionOf(name);
  return Object.hasOwn(FILE_TYPES, ext) ? FILE_TYPES[ext] : null;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateFile(file: { name: string; size: number }): string | null {
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > MAX_FILE_BYTES) return "The file is larger than 10 MB.";
  if (!contentTypeFor(file.name)) return `This file type is not allowed. Allowed: ${FILE_HINT}`;
  return null;
}

/** Keeps a readable name but strips anything that is unsafe in a storage path. */
export function safeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const ext = extensionOf(base);
  const stem = (ext ? base.slice(0, -(ext.length + 1)) : base)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+/, "")
    .slice(0, 80);
  return `${stem || "file"}${ext ? `.${ext}` : ""}`;
}

export function buildStoragePath(
  userId: string,
  challengeId: string,
  fileName: string,
  random: string,
): string {
  return `${userId}/${challengeId}/${random}-${safeFileName(fileName)}`;
}

export const SUBMIT_GENERIC_ERROR = "Could not save your submission. Please try again.";

const SUBMIT_ERRORS: Record<string, string> = {
  not_authenticated: "Log in to submit.",
  invalid_content: `Write an answer between 1 and ${MAX_CONTENT_LENGTH.toLocaleString("en-US")} characters.`,
  not_participant: "Join this challenge before submitting.",
  challenge_not_found: "This challenge could not be found.",
  submissions_closed: "Submissions are closed for this challenge.",
  invalid_file: "The attached file was not accepted. Please try again.",
  attempt_limit_reached: "You have used all your submission attempts.",
};

export function submitErrorMessage(message: string | undefined): string {
  if (!message) return SUBMIT_GENERIC_ERROR;
  for (const [code, text] of Object.entries(SUBMIT_ERRORS)) {
    if (message.includes(code)) return text;
  }
  return SUBMIT_GENERIC_ERROR;
}

export type RubricCriterion = { key: string; label: string; max_points: number };

/** Defensive parse of the rubric JSON coming from the database. */
export function parseCriteria(value: unknown): RubricCriterion[] {
  if (!Array.isArray(value)) return [];
  const out: RubricCriterion[] = [];
  for (const item of value) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as RubricCriterion).key === "string" &&
      typeof (item as RubricCriterion).label === "string" &&
      typeof (item as RubricCriterion).max_points === "number"
    ) {
      const { key, label, max_points } = item as RubricCriterion;
      out.push({ key, label, max_points });
    }
  }
  return out;
}

export function preview(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
