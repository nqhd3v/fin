"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserFocus, X } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import { claimGuest, type IGroupGuest } from "@/handlers/groups";

type Props = {
  /** Unclaimed temp members the joiner might actually be. */
  guests: IGroupGuest[];
};

/**
 * Shown to a member when the group still has unclaimed temp members: "are you
 * one of these?". Picking one maps the current user to that temp member (their
 * past spend shares roll up to the user). Dismissible — "none of these".
 */
function GroupGuestClaim({ guests }: Props) {
  const router = useRouter();
  const [dismissed, setDismissed] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);

  if (dismissed || guests.length === 0) return null;

  async function onClaim(id: string) {
    setPending(id);
    const res = await claimGuest(id);
    setPending(null);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Mapped to your account");
    router.refresh();
  }

  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/20">
      <div className="flex items-start gap-2">
        <UserFocus
          className="size-4 shrink-0 text-muted-foreground"
          weight="duotone"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-xs font-medium">
            Are you one of these people?
          </h2>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            A member added these temp names before you joined. Pick yours to take
            over its share of past spends.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="None of these"
          onClick={() => setDismissed(true)}
        >
          <X />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {guests.map((g) => (
          <Button
            key={g.id}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending !== null}
            onClick={() => onClaim(g.id)}
          >
            {pending === g.id ? "Claiming…" : `I'm ${g.name}`}
          </Button>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setDismissed(true)}
        >
          None of these
        </Button>
      </div>
    </section>
  );
}

export { GroupGuestClaim };
