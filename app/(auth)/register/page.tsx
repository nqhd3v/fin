import { Suspense } from "react";

import { RegisterForm } from "@/components/organisms/register-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "register",
};

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
