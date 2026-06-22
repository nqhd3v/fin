import { Bank, Wallet, Money, Plus } from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import { formatCurrency } from "@/lib/format";
import { FundDialog, type FundDTO } from "@/components/organisms/fund-dialog";

const FUND_ICON: Record<FundDTO["type"], Icon> = {
  BANK: Bank,
  EWALLET: Wallet,
  CASH: Money,
};

function FundsCard({ funds }: { funds: FundDTO[] }) {
  const total = funds.reduce((sum, f) => sum + f.balance, 0);

  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-medium">Funds</h2>
        <FundDialog
          trigger={
            <Button variant="ghost" size="xs">
              <Plus />
              Add
            </Button>
          }
        />
      </div>

      <div>
        <p className="text-[10px] text-muted-foreground">Total balance</p>
        <p className="font-heading text-xl font-medium tabular-nums">
          {formatCurrency(total)}
        </p>
      </div>

      {funds.length === 0 ? (
        <p className="bg-card px-3 py-6 text-center text-xs text-muted-foreground ring-1 ring-foreground/10">
          No funds yet. Add your first account.
        </p>
      ) : (
        <div className="flex flex-col gap-px bg-border ring-1 ring-foreground/10">
          {funds.map((f) => {
            const FundIcon = FUND_ICON[f.type];
            return (
              <FundDialog
                key={f.id}
                fund={f}
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-3 bg-card px-3 py-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <FundIcon className="size-4 shrink-0 text-muted-foreground" weight="duotone" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs">{f.name}</span>
                      {f.hint ? (
                        <span className="block text-[10px] text-muted-foreground">
                          {f.hint}
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-xs tabular-nums">
                      {formatCurrency(f.balance)}
                    </span>
                  </button>
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}

export { FundsCard };
