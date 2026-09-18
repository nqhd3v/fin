"use client";

import * as React from "react";
import { Camera, SpinnerGap } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { TransactionDialog } from "@/components/organisms/transaction-dialog";
import type { FundOption } from "@/components/organisms/transaction-dialog";
import { createClient } from "@/lib/supabase/client";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import { scanReceipt } from "@/handlers/receipts";

const TILE =
  "flex aspect-square flex-col items-center justify-center gap-1.5 bg-card text-card-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring";

type Defaults = {
  amount?: number;
  description?: string;
  category?: string;
  at?: Date;
  receiptPath?: string;
};

/**
 * Scan a receipt/invoice photo into a prefilled transaction. Uploads the image
 * to Supabase Storage (user's own folder), sends it to Gemini to read the
 * amount/description/date, then opens the transaction dialog prefilled for the
 * user to confirm. `variant` picks the header button or the quick-log tile.
 * Group props are passed straight through to the dialog (group mode).
 */
function ScanInvoice({
  funds,
  purposes,
  variant = "button",
  ...group
}: {
  funds: FundOption[];
  purposes: string[];
  variant?: "button" | "tile";
} & Pick<
  React.ComponentProps<typeof TransactionDialog>,
  "groupId" | "groupFund" | "groupMembers" | "groupGuests"
>) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [defaults, setDefaults] = React.useState<Defaults>({});

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Reset so picking the same file again re-triggers change.
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.warning("Pick an image of the receipt");
      return;
    }

    setBusy(true);
    try {
      const sb = createClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        toast.warning("Please sign in again");
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        toast.warning(upErr.message);
        return;
      }

      const res = await scanReceipt(path);
      if (!res.ok) {
        toast.warning(res.errorMessage);
        return;
      }

      const d = res.data;
      const parsedDate = d.date ? new Date(d.date) : null;
      setDefaults({
        amount: d.amount ?? undefined,
        description: d.description ?? d.merchant ?? undefined,
        category: d.category ?? undefined,
        at: parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate : undefined,
        receiptPath: path,
      });
      setOpen(true);
    } catch (err) {
      toast.warning((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const trigger =
    variant === "tile" ? (
      <button
        type="button"
        className={TILE + " text-muted-foreground"}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? (
          <SpinnerGap className="size-5 animate-spin" />
        ) : (
          <Camera className="size-5" weight="duotone" />
        )}
        <span className="text-[10px] leading-none">
          {busy ? "Reading…" : "Scan"}
        </span>
      </button>
    ) : (
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? <SpinnerGap className="animate-spin" /> : <Camera />}
        {busy ? "Reading…" : "Scan"}
      </Button>
    );

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onPick}
      />
      {trigger}
      {/* Prefilled from the scan; user confirms/edits before it's saved. */}
      <TransactionDialog
        open={open}
        onOpenChange={setOpen}
        funds={funds}
        purposes={purposes}
        mode="full"
        title="From receipt"
        defaults={defaults}
        {...group}
      />
    </>
  );
}

export { ScanInvoice };
