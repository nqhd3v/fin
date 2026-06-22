import type { AuthError } from "@supabase/supabase-js";

// Map Supabase auth error codes -> user-facing messages.
// Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  otp_expired: "This code has expired. Request a new one and try again.",
  otp_disabled: "This sign-in method is no longer available.",
  validation_failed: "Invalid code. Check it and try again.",
  bad_code_verifier: "Invalid code. Check it and try again.",
  user_not_found: "We couldn't find an account for this link.",
  email_not_confirmed: "Please confirm your email before signing in.",
  email_address_invalid: "That email address looks invalid.",
  over_request_rate_limit: "Too many attempts. Please wait and try again.",
  over_email_send_rate_limit: "Too many emails sent. Please wait and try again.",
  session_expired: "Your session has expired. Please sign in again.",
  flow_state_expired: "This link has expired. Please sign in again.",
  flow_state_not_found: "This link is invalid or already used.",
};

const FALLBACK_MESSAGE = "Your link is expired or invalid. Please try again.";

export function authErrorMessage(error: AuthError): string {
  if (error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  return error.message || FALLBACK_MESSAGE;
}

export { FALLBACK_MESSAGE };
