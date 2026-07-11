"use client";

import { useRouter } from "next/navigation";
import { Copy, SignOut, Trash } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { deleteGroup, leaveGroup } from "@/handlers/groups";

type Props = {
  groupId: string;
  isOwner: boolean;
  inviteToken: string | null;
};

function GroupActions({ groupId, isOwner, inviteToken }: Props) {
  const router = useRouter();

  async function onCopy() {
    // Prefer a one-click invite link (joins directly, skips the passcode);
    // fall back to the raw group ID if no token exists.
    const link = inviteToken
      ? `${window.location.origin}/join-group?token=${inviteToken}`
      : groupId;
    try {
      await navigator.clipboard.writeText(link);
      toast.success(inviteToken ? "Invite link copied" : "Group ID copied");
    } catch {
      toast.warning("Couldn't copy — " + link);
    }
  }

  async function onLeave() {
    const res = await leaveGroup(groupId);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Left group");
    router.push("/groups");
  }

  async function onDelete() {
    const res = await deleteGroup(groupId);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Group deleted");
    router.push("/groups");
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        <Copy />
        Invite
      </Button>
      {isOwner ? (
        <ConfirmPopover
          message="Delete this group? The shared feed reverts to each member's personal entries."
          confirmLabel="Delete"
          onConfirm={onDelete}
          trigger={
            <Button type="button" variant="outline" size="sm">
              <Trash />
              Delete
            </Button>
          }
        />
      ) : (
        <ConfirmPopover
          message="Leave this group? You'll lose access to its shared feed."
          confirmLabel="Leave"
          onConfirm={onLeave}
          trigger={
            <Button type="button" variant="outline" size="sm">
              <SignOut />
              Leave
            </Button>
          }
        />
      )}
    </div>
  );
}

export { GroupActions };
