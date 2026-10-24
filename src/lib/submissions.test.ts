import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import {
  MAX_FILE_BYTES,
  buildStoragePath,
  contentTypeFor,
  parseCriteria,
  preview,
  safeFileName,
  submitErrorMessage,
  validateFile,
} from "./submissions";

const d = getDictionary("en");

describe("validateFile", () => {
  it("accepts allowed types within the size limit", () => {
    expect(validateFile({ name: "report.PDF", size: 1000 }, d)).toBeNull();
    expect(validateFile({ name: "notes.md", size: MAX_FILE_BYTES }, d)).toBeNull();
  });
  it("rejects empty, oversized and unknown types", () => {
    expect(validateFile({ name: "a.pdf", size: 0 }, d)).toMatch(/empty/);
    expect(validateFile({ name: "a.pdf", size: MAX_FILE_BYTES + 1 }, d)).toMatch(/25 MB/);
    expect(validateFile({ name: "run.exe", size: 10 }, d)).toMatch(/not allowed/);
    expect(validateFile({ name: "noext", size: 10 }, d)).toMatch(/not allowed/);
    expect(validateFile({ name: "x.constructor", size: 10 }, d)).toMatch(/not allowed/);
  });
  it("maps extensions to content types", () => {
    expect(contentTypeFor("a.jpeg")).toBe("image/jpeg");
    expect(contentTypeFor("a.MD")).toBe("text/markdown");
    expect(contentTypeFor("a.sh")).toBeNull();
  });
});

describe("safeFileName / buildStoragePath", () => {
  it("strips directories and unsafe characters but keeps the extension", () => {
    expect(safeFileName("../../etc/pass wd.pdf")).toBe("pass_wd.pdf");
    expect(safeFileName("C:\\x\\my résumé.PDF")).toBe("my_r_sum_.pdf");
    expect(safeFileName("...hidden.txt")).toBe("hidden.txt");
    expect(safeFileName(".pdf")).toBe("file.pdf");
  });
  it("builds <user>/<challenge>/<random>-<name>", () => {
    expect(buildStoragePath("u", "c", "a b.pdf", "r1")).toBe("u/c/r1-a_b.pdf");
    expect(buildStoragePath("u", "c", "a/b.pdf", "r1").split("/")).toHaveLength(3);
  });
});

describe("submitErrorMessage", () => {
  it("maps database codes to friendly text", () => {
    expect(submitErrorMessage("attempt_limit_reached", d)).toMatch(/attempts/);
    expect(submitErrorMessage("ERROR: submissions_closed", d)).toMatch(/closed/);
    expect(submitErrorMessage("not_participant", d)).toMatch(/Join/);
  });
  it("never leaks unknown database errors", () => {
    expect(submitErrorMessage('duplicate key value violates unique constraint "x"', d)).toBe(
      d.submitErrors.generic,
    );
    expect(submitErrorMessage(undefined, d)).toBe(d.submitErrors.generic);
  });
});

describe("parseCriteria / preview", () => {
  it("keeps only well-formed criteria", () => {
    expect(
      parseCriteria([
        { key: "a", label: "A", max_points: 5 },
        { key: "b", label: "B" },
        null,
      ]),
    ).toEqual([{ key: "a", label: "A", max_points: 5 }]);
    expect(parseCriteria("nope")).toEqual([]);
  });
  it("collapses whitespace and truncates", () => {
    expect(preview("a\n\n b   c")).toBe("a b c");
    expect(preview("x".repeat(300), 10)).toHaveLength(10);
  });
});
