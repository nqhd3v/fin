"use client";

import * as React from "react";
import { Paperclip, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";

import { receiptSignedUrl } from "@/handlers/receipts";

/** Opens the stored receipt image in a new tab via a short-lived signed URL. */
function ReceiptLink({ path }: { path: string }) {
  const [busy, setBusy] = React.useState(false);

  async function onClick() {
    setBusy(true);
    try {
      const res = await receiptSignedUrl(path);
      if (!res.ok) {
        toast.warning(res.errorMessage);
        return;
      }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      title="View receipt"
      className="shrink-0 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
    >
      {busy ? (
        <SpinnerGap className="size-4 animate-spin" />
      ) : (
        <Paperclip className="size-4" />
      )}
    </button>
  );
}

export { ReceiptLink };
