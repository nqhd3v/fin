import { ResendForm } from "@/components/organisms/resend-form";

export default async function ResendPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const { email } = await searchParams;
  return <ResendForm defaultEmail={email ?? ""} />;
}
