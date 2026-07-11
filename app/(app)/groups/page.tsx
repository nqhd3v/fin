import Link from "next/link";
import {
  Plus,
  SignIn,
  UsersThree,
  Lock,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";
import { Badge } from "@/components/atoms/badge";
import { GroupCreateDialog } from "@/components/organisms/group-create-dialog";
import { GroupJoinDialog } from "@/components/organisms/group-join-dialog";
import { listGroups } from "@/handlers/groups";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "groups",
};

export default async function GroupsPage() {
  const groups = await listGroups();

  return (
    <>
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <h1 className="font-heading text-sm font-medium">Groups</h1>
        <div className="flex items-center gap-2">
          <GroupJoinDialog
            trigger={
              <Button variant="outline" size="sm">
                <SignIn />
                Join
              </Button>
            }
          />
          <GroupCreateDialog
            trigger={
              <Button size="sm">
                <Plus />
                New
              </Button>
            }
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 bg-card px-4 py-12 text-center ring-1 ring-foreground/10">
            <UsersThree
              className="size-8 text-muted-foreground"
              weight="duotone"
            />
            <p className="text-xs text-muted-foreground">
              No groups yet. Create one or join with a group ID.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex items-center gap-3 bg-card px-3 py-3 transition-colors hover:bg-muted"
              >
                <UsersThree
                  className="size-5 shrink-0 text-muted-foreground"
                  weight="duotone"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-xs">
                    {g.name}
                    {g.hasPasscode ? (
                      <Lock className="size-3 text-muted-foreground" />
                    ) : null}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {g.memberCount} member{g.memberCount === 1 ? "" : "s"}
                  </p>
                </div>
                {g.blocked ? (
                  <Badge variant="destructive">Blocked</Badge>
                ) : null}
                {g.isOwner ? <Badge variant="outline">Owner</Badge> : null}
                <CaretRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
