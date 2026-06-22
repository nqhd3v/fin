"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardDescription, CardHeader, CardTitle } from "../atoms/card";

const AuthSuccess = ({
  next = "/",
  delayMs = 3000,
}: {
  next?: string;
  delayMs?: number;
}) => {
  const router = useRouter();

  React.useEffect(() => {
    toast.success("Email confirmed! Redirecting you now…");
    const id = setTimeout(() => router.push(next), delayMs);
    return () => clearTimeout(id);
  }, [router, next, delayMs]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email confirmed</CardTitle>
        <CardDescription>
          Your email is confirmed. Taking you to the app…
        </CardDescription>
      </CardHeader>
    </Card>
  );
};

export default AuthSuccess;
