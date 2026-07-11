"use client";

import { useRouter } from "next/navigation";
import { Crown, UserMinus, UserCircle, UserFocus } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { GroupExport } from "@/components/organisms/group-export";
import { formatCurrency } from "@/lib/format";
import {
  removeMember,
  removeGuest,
  type IGroupMember,
  type IGroupGuest,
  type IGroupTransaction,
} from "@/handlers/groups";

type Props = {
  groupId: string;
  groupName: string;
  members: IGroupMember[];
  guests: IGroupGuest[];
  transactions: IGroupTransaction[];
  isOwner: boolean;
};

function GroupMembersCard({
  groupId,
  groupName,
  members,
  guests,
  transactions,
  isOwner,
}: Props) {
  const router = useRouter();
  // Shared scale so per-member bars are comparable. Include unclaimed guests —
  // claimed ones roll their spend up to the claiming member.
  const max = Math.max(
    1,
    ...members.map((m) => Math.max(m.income, m.outcome)),
    ...guests.filter((g) => !g.claimedById).map((g) => g.outcome),
  );
  // Claimed guests are represented by their claiming member — only surface the
  // still-unclaimed ones here.
  const openGuests = guests.filter((g) => !g.claimedById);

  async function onRemove(memberId: string) {
    const res = await removeMember(groupId, memberId);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Member removed");
    router.refresh();
  }

  async function onRemoveGuest(guestId: string) {
    const res = await removeGuest(guestId);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Temp member removed");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-xs font-medium">
          Members &amp; analytics
        </h2>
        <GroupExport
          groupName={groupName}
          members={members}
          transactions={transactions}
        />
      </div>
      <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
        {members.map((m) => (
          <div key={m.id} className="flex flex-col gap-2 bg-card px-3 py-2.5">
            <div className="flex items-center gap-2">
              <UserCircle
                className="size-4 shrink-0 text-muted-foreground"
                weight="duotone"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-xs">
                  {m.name ?? "Unnamed"}
                  {m.isOwner ? (
                    <Crown
                      className="size-3 text-muted-foreground"
                      weight="fill"
                    />
                  ) : null}
                </span>
                {m.email ? (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {m.email}
                  </span>
                ) : null}
              </span>
              {isOwner && !m.isOwner ? (
                <ConfirmPopover
                  message={`Remove "${m.name ?? m.email ?? "this member"}" from the group?`}
                  confirmLabel="Remove"
                  onConfirm={() => onRemove(m.id)}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-xs">
                      <UserMinus />
                    </Button>
                  }
                />
              ) : null}
            </div>

            <div className="flex flex-col gap-1">
              <Bar
                label="In"
                value={m.income}
                max={max}
                className="bg-foreground/70"
              />
              <Bar
                label="Out"
                value={m.outcome}
                max={max}
                className="bg-foreground/30"
              />
            </div>
          </div>
        ))}

        {openGuests.map((g) => (
          <div key={g.id} className="flex flex-col gap-2 bg-card px-3 py-2.5">
            <div className="flex items-center gap-2">
              <UserFocus
                className="size-4 shrink-0 text-muted-foreground"
                weight="duotone"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 truncate text-xs">
                  {g.name}
                  <span className="bg-muted px-1 text-[9px] uppercase text-muted-foreground ring-1 ring-foreground/10">
                    temp
                  </span>
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">
                  Not on the app yet
                </span>
              </span>
              {isOwner || g.createdByMe ? (
                <ConfirmPopover
                  message={`Remove temp member "${g.name}"? Only possible if they're not used in a spend.`}
                  confirmLabel="Remove"
                  onConfirm={() => onRemoveGuest(g.id)}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-xs">
                      <UserMinus />
                    </Button>
                  }
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-1">
              <Bar
                label="Out"
                value={g.outcome}
                max={max}
                className="bg-foreground/30"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Bar({
  label,
  value,
  max,
  className,
}: {
  label: string;
  value: number;
  max: number;
  className: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-[10px] text-muted-foreground">
        {label}
      </span>
      <span className="h-2 flex-1 bg-muted">
        <span
          className={"block h-full " + className}
          style={{ width: `${(value / max) * 100}%` }}
        />
      </span>
      <span className="w-20 shrink-0 text-right text-[10px] tabular-nums">
        {formatCurrency(value)}
      </span>
    </div>
  );
}

export { GroupMembersCard };
