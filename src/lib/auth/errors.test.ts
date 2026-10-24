import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { authErrorMessage } from "./errors";

const d = getDictionary("en");

describe("authErrorMessage", () => {
  it("never leaks which half of the credentials was wrong", () => {
    expect(authErrorMessage({ code: "invalid_credentials" }, "login", d)).toBe(
      "Invalid email or password.",
    );
  });

  it("explains rate limits", () => {
    expect(authErrorMessage({ status: 429 }, "login", d)).toMatch(/Too many attempts/);
    expect(
      authErrorMessage({ code: "over_email_send_rate_limit" }, "forgot", d),
    ).toMatch(/Too many emails/);
  });

  it("tells unconfirmed users to check their inbox", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" }, "login", d)).toMatch(
      /confirm your email/i,
    );
  });

  it("hides unknown backend errors behind a generic message", () => {
    expect(
      authErrorMessage({ code: "unexpected_failure", message: "pg: connection refused" }, "login", d),
    ).toBe(d.common.generic);
  });

  it("explains an expired reset link only in the reset context", () => {
    expect(authErrorMessage({ code: "session_not_found" }, "reset", d)).toMatch(/expired/);
    expect(authErrorMessage({ code: "session_not_found" }, "login", d)).toBe(
      d.common.generic,
    );
  });
});
