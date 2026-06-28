"use client";

import * as React from "react";

import { Button } from "@/components/atoms/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/atoms/popover";

type Props = {
  /** The clickable element that opens the confirmation. */
  trigger: React.ReactNode;
  /** What the user is confirming. */
  message: React.ReactNode;
  /** Label on the confirm button (default "Confirm"). */
  confirmLabel?: string;
  /** Label on the cancel button (default "Cancel"). */
  cancelLabel?: string;
  /** Run on confirm; popover closes when it resolves. May be async. */
  onConfirm: () => void | Promise<void>;
  /** Visual style of the confirm button (default "destructive"). */
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  align?: React.ComponentProps<typeof PopoverContent>["align"];
};

/**
 * Inline confirmation in a Popover — a drop-in replacement for `window.confirm`.
 * Keeps the action close to its trigger instead of a blocking browser dialog.
 */
function ConfirmPopover({
  trigger,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  confirmVariant = "destructive",
  align = "end",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={(o) => !pending && setOpen(o)}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align={align} className="w-64">
        <p className="text-xs text-foreground">{message}</p>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            size="sm"
            onClick={handleConfirm}
            disabled={pending}
          >
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export { ConfirmPopover };
