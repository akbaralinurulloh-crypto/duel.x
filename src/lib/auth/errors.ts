import type { Dict } from "@/lib/i18n/dictionaries";

// English constants are kept for the operator-only admin area. Public pages use
// the dictionary (d.common.*).
export const NOT_CONFIGURED_MESSAGE =
  "Authentication is not configured on this deployment yet.";

export const GENERIC_ERROR_MESSAGE =
  "Something went wrong. Please try again in a moment.";

type AuthErrorLike = { status?: number; code?: string; message?: string };

/** Maps Supabase Auth errors to messages that are safe to show to people. */
export function authErrorMessage(
  error: AuthErrorLike,
  context: "login" | "register" | "reset" | "forgot",
  d: Dict,
): string {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return d.auth.tooManyAttempts;
  }
  if (error.code === "over_email_send_rate_limit") {
    return d.auth.tooManyEmails;
  }

  switch (error.code) {
    case "invalid_credentials":
      return d.auth.invalidCredentials;
    case "email_not_confirmed":
      return d.auth.emailNotConfirmed;
    case "user_already_exists":
    case "email_exists":
      return d.auth.userExists;
    case "weak_password":
      // Supabase's own text is English; ours is translated.
      return d.auth.weakPassword;
    case "same_password":
      return d.auth.samePassword;
    case "session_not_found":
    case "refresh_token_not_found":
      return context === "reset" ? d.auth.resetInvalid : d.common.generic;
    default:
      return d.common.generic;
  }
}
