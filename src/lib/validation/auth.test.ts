import { describe, expect, it } from "vitest";
import {
  fieldErrors,
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
  usernameSchema,
} from "./auth";

const validRegister = {
  email: "  Alice@Example.COM ",
  password: "correct horse battery",
  displayName: "  Alice  ",
  username: " Alice_X ",
  primaryCategorySlug: "data-analysis",
};

describe("registerSchema", () => {
  it("normalizes email, name and username", () => {
    const r = registerSchema.parse(validRegister);
    expect(r.email).toBe("alice@example.com");
    expect(r.displayName).toBe("Alice");
    expect(r.username).toBe("alice_x");
  });

  it("requires a main category", () => {
    const r = registerSchema.safeParse({ ...validRegister, primaryCategorySlug: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).primaryCategorySlug).toBeDefined();
  });

  it("rejects short and over-long passwords", () => {
    expect(registerSchema.safeParse({ ...validRegister, password: "short" }).success).toBe(false);
    expect(
      registerSchema.safeParse({ ...validRegister, password: "x".repeat(73) }).success,
    ).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = registerSchema.safeParse({ ...validRegister, email: "not-an-email" });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).email).toBeDefined();
  });
});

describe("usernameSchema", () => {
  it.each(["abc", "a_b_c", "user_123", "x".repeat(30)])("accepts %s", (u) => {
    expect(usernameSchema.safeParse(u).success).toBe(true);
  });

  it.each(["ab", "bad name", "a!b", "x".repeat(31), "", "тест"])(
    "rejects %j",
    (u) => {
      expect(usernameSchema.safeParse(u).success).toBe(false);
    },
  );
});

describe("loginSchema", () => {
  it("accepts valid credentials and rejects an empty password", () => {
    expect(loginSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});

describe("forgotPasswordSchema", () => {
  it("requires a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "a@b.co" }).success).toBe(true);
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("requires matching passwords", () => {
    const bad = resetPasswordSchema.safeParse({
      password: "longenough1",
      confirmPassword: "different1",
    });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(fieldErrors(bad.error).confirmPassword).toBeDefined();

    expect(
      resetPasswordSchema.safeParse({
        password: "longenough1",
        confirmPassword: "longenough1",
      }).success,
    ).toBe(true);
  });
});

describe("profileSchema", () => {
  const base = {
    displayName: "Alice",
    bio: "  ",
    primaryCategorySlug: "ai-automation",
    isPublic: true,
  };

  it("turns an empty bio into null", () => {
    expect(profileSchema.parse(base).bio).toBeNull();
  });

  it("rejects a bio over 500 characters", () => {
    expect(profileSchema.safeParse({ ...base, bio: "x".repeat(501) }).success).toBe(false);
  });
});
