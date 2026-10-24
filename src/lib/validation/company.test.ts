import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { companyErrorMessage, companyRequestSchema } from "./company";

const d = getDictionary("en");

const valid = {
  companyName: "Acme",
  contactName: "Jane Doe",
  contactEmail: " HR@Acme.test ",
  requestType: "talent_access",
  message: "We want to find strong prompt engineers.",
};

describe("companyRequestSchema", () => {
  it("normalises a valid request", () => {
    const r = companyRequestSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.contactEmail).toBe("hr@acme.test");
  });
  it("rejects bad email, unknown type and short messages", () => {
    expect(companyRequestSchema.safeParse({ ...valid, contactEmail: "nope" }).success).toBe(false);
    expect(companyRequestSchema.safeParse({ ...valid, requestType: "spam" }).success).toBe(false);
    expect(companyRequestSchema.safeParse({ ...valid, message: "short" }).success).toBe(false);
    expect(companyRequestSchema.safeParse({ ...valid, companyName: "A" }).success).toBe(false);
  });
});

describe("companyErrorMessage", () => {
  it("maps known codes and hides unknown errors", () => {
    expect(companyErrorMessage("rate_limited", d)).toMatch(/Too many/);
    expect(companyErrorMessage("invalid_request", d)).toMatch(/check your details/);
    expect(companyErrorMessage("relation x does not exist", d)).toBe(d.companies.generic);
  });
});
