"use client";

import * as React from "react";
import { Plus, Check, PencilSimple } from "@phosphor-icons/react";

import { Button } from "@/components/atoms/button";
import {
  TransactionDialog,
  type FundOption,
} from "@/components/organisms/transaction-dialog";
import { QuickLogPurposeDialog } from "@/components/organisms/quick-log-purpose-dialog";
import { ScanInvoice } from "@/components/organisms/scan-invoice";
import { quickIcon } from "@/lib/quick-icons";
import type { QuickLogPurpose } from "@/handlers/purposes";

const TILE =
  "flex aspect-square flex-col items-center justify-center gap-1.5 bg-card text-card-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-1 focus-visible:ring-ring";

function QuickLogGrid({
  funds,
  purposes,
  groupId,
  groupFund,
}: {
  funds: FundOption[];
  purposes: QuickLogPurpose[];
  /** when set, quick-logged transactions go into this shared group */
  groupId?: string;
  /** the group's shared pool fund (group mode) */
  groupFund?: FundOption;
}) {
  const [editing, setEditing] = React.useState(false);
  const empty = purposes.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center justify-between">
        <h2 className="font-heading text-xs font-medium">Quick log</h2>
        {!empty ? (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? <Check /> : <PencilSimple />}
            {editing ? "Done" : "Edit"}
          </Button>
        ) : null}
      </header>

      {empty ? (
        <div className="flex flex-col items-center gap-3 bg-card p-6 text-center ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">
            No quick-log actions yet. Add ones you spend on often.
          </p>
          <QuickLogPurposeDialog
            trigger={
              <Button size="sm">
                <Plus />
                Add action
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-px bg-border ring-1 ring-foreground/10 sm:grid-cols-5 lg:grid-cols-6">
          {purposes.map((p) => {
            const PurposeIcon = quickIcon(p.icon);
            const tile = (
              <button type="button" className={TILE}>
                <PurposeIcon className="size-5" weight="duotone" />
                <span className="text-[10px] leading-none">{p.name}</span>
              </button>
            );
            return editing ? (
              <QuickLogPurposeDialog key={p.id} purpose={p} trigger={tile} />
            ) : (
              <TransactionDialog
                key={p.id}
                funds={funds}
                groupId={groupId}
                groupFund={groupFund}
                mode="quick"
                title={p.name}
                defaults={{
                  amount: p.defaultAmount ?? undefined,
                  description: p.name,
                  purpose: p.name,
                  category: p.category,
                }}
                trigger={tile}
              />
            );
          })}

          {editing ? (
            <QuickLogPurposeDialog
              trigger={
                <button
                  type="button"
                  className={TILE + " text-muted-foreground"}
                >
                  <Plus className="size-5" />
                  <span className="text-[10px] leading-none">Add</span>
                </button>
              }
            />
          ) : null}

          {/* Scan a receipt into a prefilled entry (personal mode only). */}
          {!editing && !groupFund ? (
            <ScanInvoice
              funds={funds}
              purposes={purposes.map((p) => p.name)}
              variant="tile"
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

export { QuickLogGrid };
