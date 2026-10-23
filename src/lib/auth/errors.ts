export const NOT_CONFIGURED_MESSAGE =
  "Authentication is not configured on this deployment yet.";

export const GENERIC_ERROR_MESSAGE =
  "Something went wrong. Please try again in a moment.";

type AuthErrorLike = { status?: number; code?: string; message?: string };

/** Maps Supabase Auth errors to messages that are safe to show to people. */
export function authErrorMessage(
  error: AuthErrorLike,
  context: "login" | "register" | "reset" | "forgot",
): string {
  if (error.status === 429 || error.code === "over_request_rate_limit") {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (error.code === "over_email_send_rate_limit") {
    return "Too many emails requested. Please wait a few minutes and try again.";
  }

  switch (error.code) {
    case "invalid_credentials":
      return "Invalid email or password.";
    case "email_not_confirmed":
      return "Please confirm your email first. Check your inbox for the link.";
    case "user_already_exists":
    case "email_exists":
      return "An account with this email already exists. Try logging in instead.";
    case "weak_password":
      return error.message ?? "That password is too weak. Try a longer one.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "session_not_found":
    case "refresh_token_not_found":
      return context === "reset"
        ? "This reset link is invalid or has expired. Request a new one."
        : GENERIC_ERROR_MESSAGE;
    default:
      return GENERIC_ERROR_MESSAGE;
  }
}
