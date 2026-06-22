import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../atoms/card";
import { buttonVariants } from "../atoms/button";
import { FALLBACK_MESSAGE } from "@/lib/supabase/auth-errors";

const AuthError = ({
  message,
  canResend = true,
}: {
  message?: string;
  canResend?: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Authentication failed</CardTitle>
        <CardDescription>{message ?? FALLBACK_MESSAGE}</CardDescription>
      </CardHeader>
      {canResend && (
        <CardFooter className="flex-col items-stretch gap-3">
          <Link
            href="/resend"
            className={buttonVariants({ className: "w-full" })}
          >
            Resend confirmation email
          </Link>
        </CardFooter>
      )}
    </Card>
  );
};

export default AuthError;
