import { ResendForm } from "@/components/organisms/resend-form";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "resend",
};

export default async function ResendPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { email } = await searchParams;
  return <ResendForm defaultEmail={email ?? ""} />;
}
