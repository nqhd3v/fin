import Link from "next/link";
import { redirect } from "next/navigation";
import { Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";

/**
 * Legacy invite path. The canonical handler is now `/join-group` (public, so it
 * can send signed-out visitors to register). Forward old links there.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "join group",
};

export default async function JoinByTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (token) redirect(`/join-group?token=${encodeURIComponent(token)}`);
  return <JoinError message="This invite link is missing its token." />;
}

function JoinError({ message }: { message: string }) {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <div className="flex flex-col items-center gap-3 bg-card px-4 py-12 text-center ring-1 ring-destructive/30">
        <Prohibit className="size-8 text-destructive" weight="duotone" />
        <p className="text-xs font-medium">Couldn&apos;t join the group</p>
        <p className="max-w-sm text-xs text-muted-foreground">{message}</p>
        <Button variant="outline" size="sm" asChild>
          <Link href="/groups">Back to groups</Link>
        </Button>
      </div>
    </main>
  );
}
