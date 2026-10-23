import { describe, expect, it } from "vitest";
import { COMPANY_GENERIC_ERROR, companyErrorMessage, companyRequestSchema } from "./company";

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
    expect(companyErrorMessage("rate_limited")).toMatch(/Too many/);
    expect(companyErrorMessage("invalid_request")).toMatch(/check your details/);
    expect(companyErrorMessage("relation x does not exist")).toBe(COMPANY_GENERIC_ERROR);
  });
});
