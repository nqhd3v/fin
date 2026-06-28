import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Plus,
  CaretLeft,
  Lock,
  Prohibit,
} from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";
import { TransactionDialog } from "@/components/organisms/transaction-dialog";
import { QuickLogGrid } from "@/components/organisms/quick-log-grid";
import { GroupActions } from "@/components/organisms/group-actions";
import { GroupMembersCard } from "@/components/organisms/group-members-card";
import { GroupFeed } from "@/components/organisms/group-feed";
import { GroupPendingReimbursements } from "@/components/organisms/group-pending-reimbursements";
import { getGroupDetail } from "@/handlers/groups";
import { listFunds } from "@/handlers/funds";
import { listPurposeNames, listQuickLogPurposes } from "@/handlers/purposes";
import { formatCurrency } from "@/lib/format";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, purposes, quickLog, fundRows] = await Promise.all([
    getGroupDetail(id),
    listPurposeNames(),
    listQuickLogPurposes(),
    listFunds(),
  ]);

  if (!group) notFound();

  // Personal funds — used to receive an accepted reimbursement.
  const personalFunds = fundRows.map((f) => ({
    id: f.id,
    name: f.name,
    balance: f.balance,
  }));
  const members = group.members.map((m) => ({ id: m.id, name: m.name }));

  // Blocked by an admin: members see the reason, nothing else.
  if (group.blockedReason) {
    return (
      <>
        <header className="flex items-center gap-2 border-b border-foreground/10 px-4 py-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/groups" aria-label="Back to groups">
              <CaretLeft />
            </Link>
          </Button>
          <h1 className="truncate font-heading text-sm font-medium">
            {group.name}
          </h1>
        </header>
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
          <div className="flex flex-col items-center gap-3 bg-card px-4 py-12 text-center ring-1 ring-destructive/30">
            <Prohibit className="size-8 text-destructive" weight="duotone" />
            <p className="text-xs font-medium">This group is blocked</p>
            <p className="max-w-sm text-xs text-muted-foreground">
              {group.blockedReason}
            </p>
          </div>
        </main>
      </>
    );
  }

  // Group mode uses the single shared pool fund — no personal funds here.
  const pool = group.fund ?? undefined;

  return (
    <>
      <header className="flex items-center justify-between gap-2 border-b border-foreground/10 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/groups" aria-label="Back to groups">
              <CaretLeft />
            </Link>
          </Button>
          <h1 className="flex items-center gap-1.5 truncate font-heading text-sm font-medium">
            {group.name}
            {group.hasPasscode ? (
              <Lock className="size-3.5 text-muted-foreground" />
            ) : null}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <GroupActions
            groupId={group.id}
            isOwner={group.isOwner}
            inviteToken={group.inviteToken}
          />
          <TransactionDialog
            funds={[]}
            purposes={purposes}
            groupId={group.id}
            groupFund={pool}
            groupMembers={members}
            title="New group transaction"
            trigger={
              <Button size="sm">
                <Plus />
                Add transaction
              </Button>
            }
          />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        <section className="bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-[10px] text-muted-foreground">Pool balance</p>
          <p className="font-heading text-2xl font-medium tabular-nums">
            {formatCurrency(pool?.balance ?? 0)}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground tabular-nums">
            +{formatCurrency(group.totals.income)} contributed ·{" "}
            −{formatCurrency(group.totals.outcome)} spent
          </p>
        </section>

        <GroupPendingReimbursements items={group.pending} funds={personalFunds} />

        <QuickLogGrid
          funds={[]}
          purposes={quickLog}
          groupId={group.id}
          groupFund={pool}
        />

        <GroupMembersCard
          groupId={group.id}
          groupName={group.name}
          members={group.members}
          transactions={group.transactions}
          isOwner={group.isOwner}
        />

        <GroupFeed items={group.transactions} />
      </main>
    </>
  );
}
