import { TrendDown, TrendUp } from "@phosphor-icons/react/dist/ssr";

import { formatCurrency } from "@/lib/format";

type SpendSummaryProps = {
  month: string;
  spent: number;
  income: number;
  essential: number;
  incidental: number;
};

function SpendSummary({
  month,
  spent,
  income,
  essential,
  incidental,
}: SpendSummaryProps) {
  const total = essential + incidental || 1;
  const essentialPct = Math.round((essential / total) * 100);
  const net = income - spent;

  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-muted-foreground">Spent · {month}</span>
        <span
          className={
            "flex items-center gap-1 text-[10px] " +
            (net >= 0 ? "text-foreground" : "text-destructive")
          }
        >
          {net >= 0 ? <TrendUp /> : <TrendDown />}
          {net >= 0 ? "+" : ""}
          {formatCurrency(net)}
        </span>
      </div>

      <p className="font-heading text-2xl font-medium tabular-nums">
        {formatCurrency(spent)}
      </p>

      <div className="flex h-1.5 overflow-hidden">
        <div className="bg-foreground" style={{ width: `${essentialPct}%` }} />
        <div className="flex-1 bg-foreground/25" />
      </div>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Essential {formatCurrency(essential)}</span>
        <span>Incidental {formatCurrency(incidental)}</span>
      </div>
    </section>
  );
}

export { SpendSummary };
