"use client";

import * as React from "react";
import Link from "next/link";
import * as yup from "yup";

import { Button } from "@/components/atoms/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/atoms/card";
import { Form, FormInput } from "@/components/molecules/form";
import { resendConfirmation } from "@/handlers/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const resendSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Enter a valid email"),
});

type ResendValues = yup.InferType<typeof resendSchema>;

function ResendForm({
  className,
  defaultEmail = "",
  ...props
}: React.ComponentProps<typeof Card> & { defaultEmail?: string }) {
  const router = useRouter();

  const handleSubmit = async ({ email }: ResendValues) => {
    const result = await resendConfirmation(email);
    console.log(result);
    if ("alreadyConfirmed" in result) {
      toast.warning("this email confirmed. just sign in.");
      setTimeout(() => router.push("/login"), 3000);
      return;
    }
    if ("errorCode" in result) {
      toast.warning(
        result.errorCode === "unknown"
          ? "Something went wrong"
          : result.errorMessage,
      );
      return;
    }
    toast.success(
      "A new confirmation email is on its way. Check your inbox and confirm.",
    );
    setTimeout(() => router.push("/login"), 3000);
  };

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle>Resend confirmation email</CardTitle>
        <CardDescription>
          Enter your email and we&apos;ll send you a fresh confirmation link.
        </CardDescription>
      </CardHeader>
      <Form
        schema={resendSchema}
        onSubmit={handleSubmit}
        defaultValues={{ email: defaultEmail }}
      >
        {({ formState: { isSubmitting } }) => (
          <>
            <CardContent className="flex flex-col gap-4">
              <FormInput<ResendValues>
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="geek@playit.io.vn"
              />
            </CardContent>
            <CardFooter className="mt-4 flex-col items-stretch gap-3">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Sending…" : "Send confirmation email"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Back to{" "}
                <Link
                  href="/login"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </>
        )}
      </Form>
    </Card>
  );
}

export { ResendForm };
