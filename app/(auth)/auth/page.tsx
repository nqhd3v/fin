import AuthError from "@/components/molecules/auth-error";
import AuthSuccess from "@/components/molecules/auth-success";
import { authErrorMessage } from "@/lib/supabase/auth-errors";
import { createClient } from "@/lib/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

// Only allow same-origin relative paths. Blocks open-redirect via `next`.
function safeNext(next?: string): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { token_hash: token, type, next } = await searchParams;

  if (!token || !type) {
    return <AuthError />;
  }

  const sb = await createClient();

  // Already confirmed + signed in on this browser? The token was consumed by
  // the first click, so re-verifying would error. Send them on instead of
  // showing a bogus "expired" + resend prompt.
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (user?.email_confirmed_at) {
    return <AuthSuccess next={safeNext(next)} />;
  }

  const { error } = await sb.auth.verifyOtp({
    token_hash: token,
    type: type as EmailOtpType,
  });
  if (error) {
    // Signup confirmation can be re-requested; other flows (e.g. recovery)
    // can't, so hide the resend CTA for those.
    const canResend = type === "signup" || type === "email";
    return (
      <AuthError message={authErrorMessage(error)} canResend={canResend} />
    );
  }

  // Session cookies now set by server client. Show success, then client
  // redirects so the user sees confirmation before moving on.
  return <AuthSuccess next={safeNext(next)} />;
}
