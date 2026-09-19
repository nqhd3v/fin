"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import { ConfirmPopover } from "@/components/molecules/confirm-popover";
import { deleteGroupTransaction } from "@/handlers/groups";

/** Owner-only delete for a shared-feed entry; the pool balance is restored. */
function GroupTransactionDelete({ id }: { id: string }) {
  const router = useRouter();

  async function onDelete() {
    const res = await deleteGroupTransaction(id);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Transaction deleted");
    router.refresh();
  }

  return (
    <ConfirmPopover
      message="Delete this transaction? The pool balance and member totals are updated."
      confirmLabel="Delete"
      onConfirm={onDelete}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Delete transaction"
        >
          <Trash />
        </Button>
      }
    />
  );
}

export { GroupTransactionDelete };
