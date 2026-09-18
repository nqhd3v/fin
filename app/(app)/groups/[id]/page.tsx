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
import { ScanInvoice } from "@/components/organisms/scan-invoice";
import { QuickLogGrid } from "@/components/organisms/quick-log-grid";
import { GroupActions } from "@/components/organisms/group-actions";
import { GroupMembersCard } from "@/components/organisms/group-members-card";
import { GroupGuestClaim } from "@/components/organisms/group-guest-claim";
import { GroupFeed } from "@/components/organisms/group-feed";
import { GroupPendingReimbursements } from "@/components/organisms/group-pending-reimbursements";
import { getGroupDetail } from "@/handlers/groups";
import { listFunds } from "@/handlers/funds";
import { listPurposeNames, listQuickLogPurposes } from "@/handlers/purposes";
import { formatCurrency } from "@/lib/format";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "groups",
};

export default async function GroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { id } = await params;
  // Set by the invite-link redirect — the claim prompt is shown only to a
  // freshly-joined user, never to established members.
  const { welcome } = await searchParams;
  const justJoined = welcome === "1";
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
  // Unclaimed temp members — selectable in the split dialog + claim prompt.
  const openGuests = group.guests
    .filter((g) => !g.claimedById)
    .map((g) => ({ id: g.id, name: g.name }));

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
          <ScanInvoice
            funds={[]}
            purposes={purposes}
            groupId={group.id}
            groupFund={pool}
            groupMembers={members}
            groupGuests={openGuests}
          />
          <TransactionDialog
            funds={[]}
            purposes={purposes}
            groupId={group.id}
            groupFund={pool}
            groupMembers={members}
            groupGuests={openGuests}
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

        {justJoined &&
        !group.viewerHasClaim &&
        group.guests.some((g) => !g.claimedById) ? (
          <GroupGuestClaim guests={group.guests.filter((g) => !g.claimedById)} />
        ) : null}

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
          guests={group.guests}
          transactions={group.transactions}
          isOwner={group.isOwner}
        />

        <GroupFeed items={group.transactions} />
      </main>
    </>
  );
}
