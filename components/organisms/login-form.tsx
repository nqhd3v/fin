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
import { login } from "@/handlers/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const loginSchema = yup.object({
  email: yup
    .string()
    .required("Email is required")
    .email("Enter a valid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "At least 8 characters"),
});

type LoginValues = yup.InferType<typeof loginSchema>;

function LoginForm({ className, ...props }: React.ComponentProps<typeof Card>) {
  const router = useRouter();

  async function onSubmit(payload: LoginValues) {
    const result = await login(payload);
    if ("errorCode" in result) {
      toast.warning(
        result.errorCode === "unknown"
          ? "Something went wrong"
          : result.errorMessage,
      );
      return;
    }
    router.push("/");
  }

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your credentials to access your account.
        </CardDescription>
      </CardHeader>
      <Form
        schema={loginSchema}
        onSubmit={onSubmit}
        defaultValues={{ email: "", password: "" }}
      >
        {({ formState: { isSubmitting } }) => (
          <>
            <CardContent className="flex flex-col gap-4">
              <FormInput<LoginValues>
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="geek@playit.io.vn"
              />
              <FormInput<LoginValues>
                name="password"
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="Ge3kP@ssw0rd"
              />
            </CardContent>
            <CardFooter className="mt-4 flex-col items-stretch gap-3">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link
                  href="/register"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Create one
                </Link>
              </p>
            </CardFooter>
          </>
        )}
      </Form>
    </Card>
  );
}

export { LoginForm };
