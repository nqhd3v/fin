"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  PencilSimple,
  X,
} from "@phosphor-icons/react";
import { toast } from "sonner";

import { Badge } from "@/components/atoms/badge";
import { Button } from "@/components/atoms/button";
import { Switch } from "@/components/atoms/switch";
import { formatCurrency } from "@/lib/format";
import { cadenceLabel, type Anchor } from "@/lib/recurrence";
import { markHappened, setRuleActive, skipPending } from "@/handlers/recurring";
import {
  RecurringDialog,
  type RecurringDTO,
} from "@/components/organisms/recurring-dialog";
import type { FundOption } from "@/components/organisms/transaction-dialog";
import type { RecurringRow as Rule } from "@/handlers/recurring";

function RecurringRow({ rule, funds }: { rule: Rule; funds: FundOption[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const income = rule.type === "INCOME";

  async function run(
    fn: () => Promise<{ ok: boolean; errorMessage?: string }>,
    okMsg: string,
  ) {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      toast.warning(res.errorMessage);
      return;
    }
    toast.success(okMsg);
    router.refresh();
  }

  const dto: RecurringDTO = {
    id: rule.id,
    name: rule.name,
    type: income ? "INCOME" : "OUTCOME",
    amount: rule.amount,
    sourceId: rule.sourceId,
    category: rule.category,
    anchor: rule.anchor,
    dayValue: rule.dayValue,
  };

  return (
    <div className="flex flex-col gap-2 bg-card px-3 py-2.5">
      <div className="flex items-center gap-3">
        {income ? (
          <ArrowDown className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ArrowUp className="size-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs">{rule.name}</p>
            {rule.pendingTxnId ? (
              <Badge variant="secondary" className="px-1 py-0 text-[9px]">
                Pending
              </Badge>
            ) : null}
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {cadenceLabel(rule.anchor as Anchor, rule.dayValue)}
            {rule.fundName ? ` · ${rule.fundName}` : ""} · next{" "}
            {rule.nextRunAt.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
        <span className="shrink-0 text-xs tabular-nums">
          {income ? "+" : "−"}
          {formatCurrency(rule.amount)}
        </span>
      </div>

      <div className="flex items-center justify-between pl-7">
        <label className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Switch
            checked={rule.active}
            disabled={busy}
            onCheckedChange={(v) =>
              run(() => setRuleActive(rule.id, v), v ? "Resumed" : "Paused")
            }
          />
          {rule.active ? "Active" : "Paused"}
        </label>

        <div className="flex items-center gap-1.5">
          {rule.pendingTxnId ? (
            <>
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  run(() => skipPending(rule.pendingTxnId!), "Skipped")
                }
              >
                <X />
                Skip
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={busy}
                onClick={() =>
                  run(() => markHappened(rule.pendingTxnId!), "Marked happened")
                }
              >
                <Check />
                Happened
              </Button>
            </>
          ) : null}
          <RecurringDialog
            funds={funds}
            rule={dto}
            trigger={
              <Button size="icon-xs" variant="ghost" aria-label="Edit">
                <PencilSimple />
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}

export { RecurringRow };
