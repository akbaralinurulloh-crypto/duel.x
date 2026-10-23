import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  SUBMIT_GENERIC_ERROR,
  buildStoragePath,
  contentTypeFor,
  parseCriteria,
  preview,
  safeFileName,
  submitErrorMessage,
  validateFile,
} from "./submissions";

describe("validateFile", () => {
  it("accepts allowed types within the size limit", () => {
    expect(validateFile({ name: "report.PDF", size: 1000 })).toBeNull();
    expect(validateFile({ name: "notes.md", size: MAX_FILE_BYTES })).toBeNull();
  });
  it("rejects empty, oversized and unknown types", () => {
    expect(validateFile({ name: "a.pdf", size: 0 })).toMatch(/empty/);
    expect(validateFile({ name: "a.pdf", size: MAX_FILE_BYTES + 1 })).toMatch(/10 MB/);
    expect(validateFile({ name: "run.exe", size: 10 })).toMatch(/not allowed/);
    expect(validateFile({ name: "noext", size: 10 })).toMatch(/not allowed/);
    expect(validateFile({ name: "x.constructor", size: 10 })).toMatch(/not allowed/);
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
    expect(submitErrorMessage("attempt_limit_reached")).toMatch(/attempts/);
    expect(submitErrorMessage("ERROR: submissions_closed")).toMatch(/closed/);
    expect(submitErrorMessage("not_participant")).toMatch(/Join/);
  });
  it("never leaks unknown database errors", () => {
    expect(submitErrorMessage('duplicate key value violates unique constraint "x"')).toBe(
      SUBMIT_GENERIC_ERROR,
    );
    expect(submitErrorMessage(undefined)).toBe(SUBMIT_GENERIC_ERROR);
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
