import {
  ArrowDown,
  ArrowUp,
  ArrowsLeftRight,
} from "@phosphor-icons/react/dist/ssr";

import { ReceiptLink } from "@/components/molecules/receipt-link";
import { GroupSplitDialog } from "@/components/organisms/group-split-dialog";
import { GroupTransactionDelete } from "@/components/organisms/group-transaction-delete";
import { formatCurrency, formatDayLabel } from "@/lib/format";
import type { IGroupTransaction } from "@/handlers/groups";

function groupByDay(txns: IGroupTransaction[]) {
  const map = new Map<string, IGroupTransaction[]>();
  for (const t of txns) {
    const key = formatDayLabel(t.occurredAt);
    const list = map.get(key) ?? map.set(key, []).get(key)!;
    list.push(t);
  }
  return [...map.entries()];
}

function rowMeta(t: IGroupTransaction) {
  if (t.type === "INCOME") {
    return { Icon: ArrowDown, sign: "+", accent: "text-foreground" };
  }
  if (t.type === "TRANSFER") {
    return { Icon: ArrowsLeftRight, sign: "", accent: "text-muted-foreground" };
  }
  return { Icon: ArrowUp, sign: "−", accent: "text-muted-foreground" };
}

function GroupFeed({
  items,
  members,
  guests,
}: {
  items: IGroupTransaction[];
  members: { id: string; name: string | null }[];
  /** unclaimed temp members, selectable when editing "used by" */
  guests: { id: string; name: string }[];
}) {
  const groups = groupByDay(items);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xs font-medium">Shared feed</h2>

      {items.length === 0 ? (
        <p className="bg-card px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          No group transactions yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map(([label, rows]) => (
            <div
              key={label}
              className="flex flex-col gap-px bg-border ring-1 ring-foreground/10"
            >
              <div className="bg-muted px-3 py-1 text-[10px] text-muted-foreground">
                {label}
              </div>
              {rows.map((t) => {
                const { Icon, sign, accent } = rowMeta(t);
                const isReimburse = Boolean(t.payeeName);
                // For a reimbursement, show who paid whom + claim status.
                const subtitle = isReimburse
                  ? [
                      `${t.authorName ?? "?"} → ${t.payeeName}`,
                      t.reimbursementStatus === "REJECTED"
                        ? "not claimed"
                        : t.reimbursementStatus === "PENDING"
                          ? "pending"
                          : null,
                    ]
                  : [
                      t.occurredAt.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }),
                      t.authorName ?? "Unknown",
                      t.customSplit
                        ? `split: ${t.splits
                            .map((s) => s.name ?? "?")
                            .join(", ")}`
                        : null,
                    ];
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 bg-card px-3 py-2.5"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">
                        {isReimburse
                          ? `Reimburse${t.description ? ` · ${t.description}` : ""}`
                          : t.description || t.purposeName || "Transaction"}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {subtitle.filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {t.receiptPath ? <ReceiptLink path={t.receiptPath} /> : null}
                    {t.canEditSplits ? (
                      <GroupSplitDialog
                        transaction={t}
                        members={members}
                        guests={guests}
                      />
                    ) : null}
                    {t.canDelete ? <GroupTransactionDelete id={t.id} /> : null}
                    <span className={"shrink-0 text-xs tabular-nums " + accent}>
                      {sign}
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export { GroupFeed };
