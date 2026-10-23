import { describe, expect, it } from "vitest";
import { GENERIC_ERROR_MESSAGE, authErrorMessage } from "./errors";

describe("authErrorMessage", () => {
  it("never leaks which half of the credentials was wrong", () => {
    expect(authErrorMessage({ code: "invalid_credentials" }, "login")).toBe(
      "Invalid email or password.",
    );
  });

  it("explains rate limits", () => {
    expect(authErrorMessage({ status: 429 }, "login")).toMatch(/Too many attempts/);
    expect(
      authErrorMessage({ code: "over_email_send_rate_limit" }, "forgot"),
    ).toMatch(/Too many emails/);
  });

  it("tells unconfirmed users to check their inbox", () => {
    expect(authErrorMessage({ code: "email_not_confirmed" }, "login")).toMatch(
      /confirm your email/i,
    );
  });

  it("hides unknown backend errors behind a generic message", () => {
    expect(
      authErrorMessage({ code: "unexpected_failure", message: "pg: connection refused" }, "login"),
    ).toBe(GENERIC_ERROR_MESSAGE);
  });

  it("explains an expired reset link only in the reset context", () => {
    expect(authErrorMessage({ code: "session_not_found" }, "reset")).toMatch(/expired/);
    expect(authErrorMessage({ code: "session_not_found" }, "login")).toBe(
      GENERIC_ERROR_MESSAGE,
    );
  });
});
