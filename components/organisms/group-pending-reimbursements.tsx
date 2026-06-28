"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { HandCoins, Check, X } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/atoms/select";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { formatCurrency } from "@/lib/format";
import {
  acceptReimbursement,
  rejectReimbursement,
  type IGroupPending,
} from "@/handlers/groups";
import type { FundOption } from "@/components/organisms/transaction-dialog";

type Props = {
  items: IGroupPending[];
  funds: FundOption[];
};

/** The current user's reimbursements awaiting a claim into a personal fund. */
function GroupPendingReimbursements({ items, funds }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-2">
        <HandCoins className="size-4 text-foreground" weight="duotone" />
        <h2 className="font-heading text-xs font-medium">Reimbursements for you</h2>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Accept to record into one of your funds, or reject to keep it as a label
        only (your balance won&apos;t change either way the group already paid).
      </p>
      <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
        {items.map((r) => (
          <Row key={r.id} item={r} funds={funds} />
        ))}
      </div>
    </section>
  );
}

function Row({ item, funds }: { item: IGroupPending; funds: FundOption[] }) {
  const router = useRouter();
  const [fundId, setFundId] = React.useState(funds[0]?.id ?? "");
  const [busy, setBusy] = React.useState(false);
  const noFunds = funds.length === 0;

  async function onAccept() {
    if (!fundId) {
      toast.warning("Pick a fund to receive the money");
      return;
    }
    setBusy(true);
    const res = await acceptReimbursement(item.id, fundId);
    setBusy(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Recorded into your fund");
    router.refresh();
  }

  async function onReject() {
    setBusy(true);
    const res = await rejectReimbursement(item.id);
    setBusy(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Kept as label only");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 bg-card px-3 py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs">
            {item.description || "Reimbursement"}
          </p>
        </div>
        <span className="shrink-0 text-xs tabular-nums">
          {formatCurrency(item.amount)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!noFunds ? (
          <Select value={fundId} onValueChange={setFundId}>
            <SelectTrigger size="sm" className="flex-1 text-xs">
              <SelectValue placeholder="Receive into…" />
            </SelectTrigger>
            <SelectContent>
              {funds.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name} · {formatCurrency(f.balance)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="flex-1 text-[10px] text-muted-foreground">
            Add a fund to accept.
          </p>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onAccept}
          disabled={busy || noFunds}
        >
          <Check />
          Accept
        </Button>
        <ConfirmPopover
          message="Reject? The group transfer stays, but nothing is added to your funds."
          confirmLabel="Reject"
          onConfirm={onReject}
          trigger={
            <Button type="button" variant="outline" size="icon-sm" disabled={busy}>
              <X />
            </Button>
          }
        />
      </div>
    </div>
  );
}

export { GroupPendingReimbursements };
