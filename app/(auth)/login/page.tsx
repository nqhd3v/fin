import { Suspense } from "react";

import { LoginForm } from "@/components/organisms/login-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "login",
};

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
