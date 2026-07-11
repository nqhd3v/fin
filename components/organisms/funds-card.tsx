"use client";

import * as React from "react";
import { Bank, Wallet, Money, Plus, Eye, EyeSlash } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import { formatCurrency } from "@/lib/format";
import { FundDialog, type FundDTO } from "@/components/organisms/fund-dialog";

const FUND_ICON: Record<FundDTO["type"], Icon> = {
  BANK: Bank,
  EWALLET: Wallet,
  CASH: Money,
};

const HIDE_BALANCES_KEY = "fin:hide-balances";

function FundsCard({ funds }: { funds: FundDTO[] }) {
  const total = funds.reduce((sum, f) => sum + f.balance, 0);
  const [hidden, setHidden] = React.useState(false);

  // Read after mount — localStorage isn't available during SSR/hydration.
  React.useEffect(() => {
    setHidden(localStorage.getItem(HIDE_BALANCES_KEY) === "1");
  }, []);

  function toggleHidden() {
    setHidden((h) => {
      localStorage.setItem(HIDE_BALANCES_KEY, h ? "0" : "1");
      return !h;
    });
  }

  const amount = (value: number) => (hidden ? "••••••" : formatCurrency(value));

  return (
    <section className="flex flex-col gap-3 bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-medium">Funds</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleHidden}
            aria-label={hidden ? "Show balances" : "Hide balances"}
            aria-pressed={hidden}
          >
            {hidden ? <EyeSlash /> : <Eye />}
          </Button>
          <FundDialog
            trigger={
              <Button variant="ghost" size="xs">
                <Plus />
                Add
              </Button>
            }
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] text-muted-foreground">Total balance</p>
        <p className="font-heading text-xl font-medium tabular-nums">
          {amount(total)}
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
                      {amount(f.balance)}
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
