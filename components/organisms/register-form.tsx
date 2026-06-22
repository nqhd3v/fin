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
import { createAccount } from "@/handlers/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const registerSchema = yup.object({
  displayName: yup
    .string()
    .required("Display name is required")
    .min(2, "At least 2 characters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Enter a valid email"),
  password: yup
    .string()
    .required("Password is required")
    .min(8, "At least 8 characters"),
  confirmPassword: yup
    .string()
    .required("Confirm your password")
    .oneOf([yup.ref("password")], "Passwords do not match"),
});

type RegisterValues = yup.InferType<typeof registerSchema>;

function RegisterForm({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  const router = useRouter();
  const handleSubmit = async ({
    email,
    password,
    displayName,
  }: RegisterValues) => {
    const result = await createAccount({ email, password, displayName });
    if ("errorCode" in result) {
      toast.warning(
        result.errorCode === "unknown"
          ? "Something went wrong"
          : result.errorMessage,
      );
      return;
    }
    toast.success("an email will be sent at the moment! check & confirm that!");
    setTimeout(() => router.push("/login"), 5000);
  };

  return (
    <Card className={className} {...props}>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Fill in your details to get started.</CardDescription>
      </CardHeader>
      <Form
        schema={registerSchema}
        onSubmit={handleSubmit}
        defaultValues={{
          displayName: "",
          email: "",
          password: "",
          confirmPassword: "",
        }}
      >
        {({ formState: { isSubmitting } }) => (
          <>
            <CardContent className="flex flex-col gap-4">
              <FormInput<RegisterValues>
                name="displayName"
                label="Display name"
                type="text"
                autoComplete="name"
                placeholder="Geek"
              />
              <FormInput<RegisterValues>
                name="email"
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="geek@playit.io.vn"
              />
              <FormInput<RegisterValues>
                name="password"
                label="Password"
                type="password"
                autoComplete="new-password"
                placeholder="Str0ngP@sSw0Rd"
              />
              <FormInput<RegisterValues>
                name="confirmPassword"
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                placeholder="Str0ngP@sSw0Rd"
              />
            </CardContent>
            <CardFooter className="mt-4 flex-col items-stretch gap-3">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{" "}
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

export { RegisterForm };
