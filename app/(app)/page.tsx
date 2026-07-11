import { Plus, Sparkle } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/atoms/button";
import { FundsCard } from "@/components/organisms/funds-card";
import { QuickLogGrid } from "@/components/organisms/quick-log-grid";
import { RecentTransactions } from "@/components/organisms/recent-transactions";
import { RecurringCard } from "@/components/organisms/recurring-card";
import { ScanInvoice } from "@/components/organisms/scan-invoice";
import { SpendSummary } from "@/components/organisms/spend-summary";
import { TransactionDialog } from "@/components/organisms/transaction-dialog";
import { listFunds } from "@/handlers/funds";
import { listPurposeNames, listQuickLogPurposes } from "@/handlers/purposes";
import { generateDueTransactions, listRecurring } from "@/handlers/recurring";
import {
  getMonthlySummary,
  listRecentTransactions,
} from "@/handlers/transactions";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "home",
};

export default async function Home() {
  // No cron: materialize any due recurring occurrences on load.
  await generateDueTransactions();

  const [fundRows, purposes, quickLog, recent, summary, rules] =
    await Promise.all([
      listFunds(),
      listPurposeNames(),
      listQuickLogPurposes(),
      listRecentTransactions(12),
      getMonthlySummary(),
      listRecurring(),
    ]);

  const fundDTOs = fundRows.map((f) => ({
    id: f.id,
    name: f.name,
    type: f.type,
    balance: f.balance,
    hint: f.hint,
  }));
  const funds = fundRows.map((f) => ({
    id: f.id,
    name: f.name,
    balance: f.balance,
  }));
  const month = new Date().toLocaleDateString("en-US", { month: "long" });

  // Built once, placed in both the mobile stack and the desktop grid.
  const summaryEl = (
    <SpendSummary
      month={month}
      spent={summary.spent}
      income={summary.income}
      essential={summary.essential}
      incidental={summary.incidental}
    />
  );
  const quickEl = <QuickLogGrid funds={funds} purposes={quickLog} />;
  const fundsEl = <FundsCard funds={fundDTOs} />;
  const recurringEl = <RecurringCard rules={rules} funds={funds} />;
  const recentEl = <RecentTransactions items={recent} />;

  return (
    <>
      <header className="flex items-center justify-between border-b border-foreground/10 px-4 py-3">
        <div className="md:hidden">
          <p className="text-[10px] text-muted-foreground">Personal</p>
          <h1 className="font-heading text-sm font-medium">fin</h1>
        </div>
        <h1 className="hidden font-heading text-sm font-medium md:block">
          Overview
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Sparkle />
            Summary
          </Button>
          <ScanInvoice funds={funds} purposes={purposes} />
          <TransactionDialog
            funds={funds}
            purposes={purposes}
            trigger={
              <Button size="sm">
                <Plus />
                New
              </Button>
            }
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* Mobile: single column, quick-log first so logging is instant. */}
        <div className="flex flex-col gap-6 lg:hidden">
          {quickEl}
          {summaryEl}
          {fundsEl}
          {recurringEl}
          {recentEl}
        </div>

        {/* Desktop: summary hero, then two independent columns (no row
            coupling, so a tall Funds card can't gap the Quick-log column). */}
        <div className="hidden gap-6 lg:grid lg:grid-cols-3">
          <div className="lg:col-span-3">{summaryEl}</div>
          <div className="flex flex-col gap-6 lg:col-span-2">
            {quickEl}
            {recentEl}
          </div>
          <div className="flex flex-col gap-6">
            {fundsEl}
            {recurringEl}
          </div>
        </div>
      </main>
    </>
  );
}
