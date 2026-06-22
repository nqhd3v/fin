import {
  ArrowDown,
  ArrowUp,
  ArrowsLeftRight,
} from "@phosphor-icons/react/dist/ssr";

import { formatCurrency, formatDayLabel } from "@/lib/format";
import type { RecentTransaction } from "@/handlers/transactions";

function groupByDay(txns: RecentTransaction[]) {
  const map = new Map<string, RecentTransaction[]>();
  for (const t of txns) {
    const key = formatDayLabel(t.occurredAt);
    const list = map.get(key) ?? map.set(key, []).get(key)!;
    list.push(t);
  }
  return [...map.entries()];
}

function rowMeta(t: RecentTransaction) {
  if (t.type === "INCOME") {
    return { Icon: ArrowDown, sign: "+", fund: t.toName, accent: "text-foreground" };
  }
  if (t.type === "TRANSFER") {
    return {
      Icon: ArrowsLeftRight,
      sign: "",
      fund: `${t.fromName ?? "?"} → ${t.toName ?? "?"}`,
      accent: "text-muted-foreground",
    };
  }
  return { Icon: ArrowUp, sign: "−", fund: t.fromName, accent: "text-muted-foreground" };
}

function RecentTransactions({ items }: { items: RecentTransaction[] }) {
  const groups = groupByDay(items);

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xs font-medium">Recent</h2>

      {items.length === 0 ? (
        <p className="bg-card px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          No transactions yet. Log your first above.
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
                const { Icon, sign, fund, accent } = rowMeta(t);
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 bg-card px-3 py-2.5"
                  >
                    <Icon className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">
                        {t.description || t.purposeName || "Transaction"}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {[
                          t.occurredAt.toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          }),
                          fund,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
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

export { RecentTransactions };
