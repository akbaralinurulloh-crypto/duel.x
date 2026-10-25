import { fmt } from "@/lib/i18n/config";
import type { Dict } from "@/lib/i18n/dictionaries";

// Pure helpers for submissions (no I/O). Limits mirror the database and the
// Storage bucket; the database/bucket are the authority, this gives early,
// friendly feedback.

export const MAX_CONTENT_LENGTH = 20000;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

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
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function contentTypeFor(name: string): string | null {
  const ext = extensionOf(name);
  return Object.hasOwn(FILE_TYPES, ext) ? FILE_TYPES[ext] : null;
}

/** Returns an error message, or null when the file is acceptable. */
export function validateFile(file: { name: string; size: number }, d: Dict): string | null {
  if (file.size <= 0) return d.submit.fileEmpty;
  if (file.size > MAX_FILE_BYTES) return d.submit.fileTooBig;
  if (!contentTypeFor(file.name)) return fmt(d.submit.fileType, { hint: d.submit.fileHint });
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

const SUBMIT_ERROR_CODES = [
  "not_authenticated",
  "invalid_content",
  "not_participant",
  "challenge_not_found",
  "submissions_closed",
  "invalid_file",
  "attempt_limit_reached",
] as const;

export function submitErrorMessage(message: string | undefined, d: Dict): string {
  if (!message) return d.submitErrors.generic;
  for (const code of SUBMIT_ERROR_CODES) {
    if (message.includes(code)) {
      return fmt(d.submitErrors[code], { max: MAX_CONTENT_LENGTH.toLocaleString("en-US") });
    }
  }
  return d.submitErrors.generic;
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
