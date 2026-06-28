import Link from "next/link";
import { redirect } from "next/navigation";
import { Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";
import { joinByToken } from "@/handlers/groups";

export default async function JoinByTokenPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Valid token → join and go straight to the group.
  if (token) {
    const res = await joinByToken(token);
    if (res.ok) redirect(`/groups/${res.id}`);
    return <JoinError message={res.errorMessage} />;
  }

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
