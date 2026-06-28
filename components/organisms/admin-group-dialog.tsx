"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Prohibit, ArrowCounterClockwise } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import { Textarea } from "@/components/atoms/textarea";
import { Label } from "@/components/atoms/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import {
  blockGroup,
  unblockGroup,
  resetGroupData,
  type IAdminGroup,
} from "@/handlers/admin";

type Props = {
  trigger: React.ReactNode;
  group: IAdminGroup;
};

function AdminGroupDialog({ trigger, group }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState(group.blockedReason ?? "");
  const [busy, setBusy] = React.useState(false);
  const isBlocked = Boolean(group.blockedReason);

  async function run(
    fn: () => Promise<{ ok: boolean; errorMessage?: string }>,
    successMsg: string,
  ) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success(successMsg);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage group</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 bg-muted px-3 py-2.5 text-[10px] text-muted-foreground ring-1 ring-foreground/10">
            <p className="truncate text-xs text-foreground">{group.name}</p>
            <p className="truncate">
              {group.ownerName ?? "?"} · {group.ownerEmail ?? "no email"}
            </p>
            <p className="tabular-nums">
              {group.members} members · {group.transactions} transactions
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="block-reason">Block reason</Label>
            <Textarea
              id="block-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Shown to members when they open the group"
              rows={3}
            />
          </div>

          <DialogFooter className="justify-between">
            <ConfirmPopover
              align="start"
              message={`Reset "${group.name}" to the beginning? All ${group.transactions} transactions are deleted and the pool balance is zeroed. Members are kept. This cannot be undone.`}
              confirmLabel="Reset"
              onConfirm={() => run(() => resetGroupData(group.id), "Group reset")}
              trigger={
                <Button type="button" variant="destructive" size="sm" disabled={busy}>
                  <ArrowCounterClockwise />
                  Reset data
                </Button>
              }
            />
            <div className="flex gap-2">
              {isBlocked ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => run(() => unblockGroup(group.id), "Group unblocked")}
                >
                  Unblock
                </Button>
              ) : null}
              <Button
                type="button"
                variant={isBlocked ? "default" : "destructive"}
                disabled={busy}
                onClick={() =>
                  run(() => blockGroup(group.id, reason), "Group blocked")
                }
              >
                <Prohibit />
                {isBlocked ? "Update reason" : "Block"}
              </Button>
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { AdminGroupDialog };
