import Link from "next/link";
import { redirect } from "next/navigation";
import { Prohibit } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";
import { createClient } from "@/lib/supabase/server";
import { joinByToken } from "@/handlers/groups";

/**
 * Invite-link entry point (`/join-group?token=…`).
 *  - Signed out → send to register, carrying the join intent in `next` so they
 *    land back here (and auto-join) once authenticated.
 *  - Signed in → join immediately (the token is the authorization, so the
 *    passcode is skipped) and go to the group.
 * The temp-member "are you one of these?" prompt is handled on the group page.
 */
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "join group",
};

export default async function JoinGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return <JoinError message="This invite link is missing its token." />;
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) {
    // Not signed in — go create an account, then bounce back here to auto-join.
    const next = `/join-group?token=${encodeURIComponent(token)}`;
    redirect(`/register?next=${encodeURIComponent(next)}`);
  }

  const res = await joinByToken(token);
  // `welcome=1` marks a fresh join so the group page offers the temp-member
  // "are you one of these?" prompt — only to the just-joined person, not to
  // established members (a temp member represents someone with no account yet).
  if (res.ok) redirect(`/groups/${res.id}?welcome=1`);
  return <JoinError message={res.errorMessage} />;
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
