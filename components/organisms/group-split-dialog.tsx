"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import * as yup from "yup";
import { toast } from "sonner";
import { UsersThree } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import { Input } from "@/components/atoms/input";
import { Label } from "@/components/atoms/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/atoms/dialog";
import {
  Form,
  FormCheckboxGroup,
  FormSegmented,
} from "@/components/molecules/form";
import { formatCurrency, formatNumber } from "@/lib/format";
import { updateGroupSplits, type IGroupTransaction } from "@/handlers/groups";

const schema = yup.object({
  splitMode: yup.string().oneOf(["equal", "custom"]).required(),
  participantIds: yup.array().of(yup.string().required()).default([]),
});

type Values = yup.InferType<typeof schema>;

type Props = {
  transaction: Pick<IGroupTransaction, "id" | "amount" | "splits">;
  members: { id: string; name: string | null }[];
  /** unclaimed temp members (guests) */
  guests: { id: string; name: string }[];
};

/** Edit "used by" (even split or custom amounts) of an existing group spend. */
function GroupSplitDialog({ transaction, members, guests }: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const people = [
    ...members.map((m) => ({
      id: m.id,
      name: m.name ?? "Unnamed",
      kind: "member" as const,
    })),
    ...guests.map((g) => ({ id: g.id, name: g.name, kind: "guest" as const })),
  ];
  const guestIdSet = new Set(guests.map((g) => g.id));

  // Current shares keyed by person id (claimed guests already resolve to the
  // claiming member). Legacy spends without splits = everyone.
  const current = new Map<string, number>();
  for (const s of transaction.splits) {
    const id = s.profileId ?? s.guestId;
    if (id) current.set(id, (current.get(id) ?? 0) + s.amount);
  }
  const initialCustom = () =>
    Object.fromEntries(
      [...current].map(([id, amount]) => [id, String(Math.round(amount))]),
    );
  const [custom, setCustom] = React.useState<Record<string, string>>(initialCustom);

  const customShares = people
    .map((p) => ({ ...p, amount: Number(custom[p.id] || 0) }))
    .filter((p) => p.amount > 0);
  const customSum = customShares.reduce((a, s) => a + s.amount, 0);
  const remaining = transaction.amount - customSum;

  const defaultValues: Values = {
    splitMode: hasUnevenAmounts(current) ? "custom" : "equal",
    participantIds:
      current.size > 0 ? [...current.keys()] : members.map((m) => m.id),
  };

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setCustom(initialCustom());
  }

  async function onSubmit(values: Values) {
    const picked = values.participantIds as string[];
    const isCustom = values.splitMode === "custom";
    if (isCustom && Math.abs(remaining) >= 1) {
      toast.warning("Amounts must add up to the total");
      return;
    }
    if (!isCustom && picked.length === 0) {
      toast.warning("Pick at least one person");
      return;
    }
    const res = await updateGroupSplits(
      transaction.id,
      isCustom
        ? {
            splits: customShares.map((s) =>
              s.kind === "guest"
                ? { guestId: s.id, amount: s.amount }
                : { profileId: s.id, amount: s.amount },
            ),
          }
        : {
            participantIds: picked.filter((id) => !guestIdSet.has(id)),
            guestParticipantIds: picked.filter((id) => guestIdSet.has(id)),
          },
    );
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success("Split updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Edit used by"
        >
          <UsersThree />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit used by</DialogTitle>
        </DialogHeader>
        <Form
          schema={schema}
          onSubmit={onSubmit}
          defaultValues={defaultValues}
          className="flex flex-col gap-4"
        >
          {({ watch, formState: { isSubmitting } }) => {
            const isCustom = watch("splitMode") === "custom";
            return (
              <>
                <p className="bg-muted px-3 py-2 text-[10px] text-muted-foreground ring-1 ring-foreground/10">
                  Total{" "}
                  <span className="text-foreground tabular-nums">
                    {formatCurrency(transaction.amount)}
                  </span>{" "}
                  — only who it&apos;s split across changes.
                </p>
                <FormSegmented<Values>
                  name="splitMode"
                  options={[
                    { value: "equal", label: "Even split" },
                    { value: "custom", label: "Custom amounts" },
                  ]}
                />
                {!isCustom ? (
                  <FormCheckboxGroup<Values>
                    name="participantIds"
                    label="Used by"
                    options={people.map((p) => ({
                      value: p.id,
                      label: p.kind === "guest" ? `${p.name} (temp)` : p.name,
                    }))}
                  />
                ) : (
                  <div className="flex flex-col gap-2">
                    <Label>Amount per member</Label>
                    <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
                      {people.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 bg-card px-3 py-1.5"
                        >
                          <span className="min-w-0 flex-1 truncate text-xs">
                            {p.name}
                            {p.kind === "guest" ? (
                              <span className="text-muted-foreground"> (temp)</span>
                            ) : null}
                          </span>
                          <Input
                            inputMode="numeric"
                            value={
                              custom[p.id] ? formatNumber(Number(custom[p.id])) : ""
                            }
                            onChange={(e) =>
                              setCustom((prev) => ({
                                ...prev,
                                [p.id]: e.target.value.replace(/\D/g, ""),
                              }))
                            }
                            placeholder="0"
                            className="h-7 w-28 text-right text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between bg-muted px-3 py-2 text-xs ring-1 ring-foreground/10">
                      <span className="text-muted-foreground">Remaining</span>
                      <span
                        className={
                          "font-medium tabular-nums " +
                          (Math.abs(remaining) >= 1 ? "text-destructive" : "")
                        }
                      >
                        {formatCurrency(remaining)}
                      </span>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={isSubmitting}>
                    Save
                  </Button>
                </DialogFooter>
              </>
            );
          }}
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/** True when shares differ by more than an even split's rounding remainder. */
function hasUnevenAmounts(shares: Map<string, number>) {
  const amounts = [...shares.values()];
  if (amounts.length === 0) return false;
  return Math.max(...amounts) - Math.min(...amounts) >= amounts.length;
}

export { GroupSplitDialog };
