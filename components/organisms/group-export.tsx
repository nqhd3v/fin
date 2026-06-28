"use client";

import * as React from "react";
import { DownloadSimple, FileCsv, FileXls } from "@phosphor-icons/react";
import { toast } from "sonner";

import { Button } from "@/components/atoms/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/atoms/dropdown-menu";
import type { IGroupMember, IGroupTransaction } from "@/handlers/groups";

type Props = {
  groupName: string;
  members: IGroupMember[];
  transactions: IGroupTransaction[];
};

type Cell = string | number;

const MEMBER_HEADER = ["Member", "Email", "Income", "Outcome", "Net"] as const;
const TXN_HEADER = [
  "Date",
  "Type",
  "By",
  "Description",
  "Used by / status",
  "Amount",
] as const;

/** Member summary: header + per-member + total. */
function buildMemberRows(members: IGroupMember[]): Cell[][] {
  let ti = 0;
  let to = 0;
  const rows = members.map((m) => {
    const income = Math.round(m.income);
    const outcome = Math.round(m.outcome);
    ti += income;
    to += outcome;
    return [
      `${m.name ?? "Unnamed"}${m.isOwner ? " (owner)" : ""}`,
      m.email ?? "",
      income,
      outcome,
      income - outcome,
    ];
  });
  return [[...MEMBER_HEADER], ...rows, ["Total", "", ti, to, ti - to]];
}

function txnTypeLabel(t: IGroupTransaction): string {
  if (t.type === "INCOME") return "Contribute";
  if (t.type === "TRANSFER")
    return t.payeeName ? `Reimburse → ${t.payeeName}` : "Transfer";
  return "Spend";
}

function txnUsedBy(t: IGroupTransaction): string {
  if (t.type === "TRANSFER") {
    return t.reimbursementStatus === "REJECTED"
      ? "not claimed"
      : t.reimbursementStatus === "ACCEPTED"
        ? "claimed"
        : "pending";
  }
  if (t.type === "OUTCOME" && t.splits.length > 0) {
    return t.splits
      .map((s) => `${s.name ?? "?"} ${Math.round(s.amount)}`)
      .join("; ");
  }
  if (t.type === "OUTCOME") return "everyone";
  return "";
}

/** Transaction detail: header + one row per group transaction. */
function buildTxnRows(transactions: IGroupTransaction[]): Cell[][] {
  const rows = transactions.map((t) => [
    new Date(t.occurredAt).toISOString().slice(0, 10),
    txnTypeLabel(t),
    t.authorName ?? "",
    t.description || t.purposeName || "",
    txnUsedBy(t),
    Math.round(t.amount),
  ]);
  return [[...TXN_HEADER], ...rows];
}

function slug(name: string): string {
  return name.trim().replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "") || "group";
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsvLine(row: Cell[]): string {
  return row
    .map((cell) => {
      const s = String(cell);
      // Quote when the value contains a comma, quote, or newline.
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    })
    .join(",");
}

function GroupExport({ groupName, members, transactions }: Props) {
  const [busy, setBusy] = React.useState(false);

  function exportCsv() {
    // Two tables in one file, separated by a titled blank line.
    const lines = [
      "Members & analytics",
      ...buildMemberRows(members).map(toCsvLine),
      "",
      "Transactions",
      ...buildTxnRows(transactions).map(toCsvLine),
    ];
    // BOM so Excel reads UTF-8 names correctly.
    const blob = new Blob(["﻿" + lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    triggerDownload(blob, `${slug(groupName)}-export.csv`);
    toast.success("CSV exported");
  }

  async function exportXlsx() {
    setBusy(true);
    try {
      // Dynamic import keeps the heavy lib out of the initial bundle.
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();

      const members_ws = XLSX.utils.aoa_to_sheet(buildMemberRows(members));
      members_ws["!cols"] = [
        { wch: 22 },
        { wch: 26 },
        { wch: 12 },
        { wch: 12 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, members_ws, "Members");

      const txn_ws = XLSX.utils.aoa_to_sheet(buildTxnRows(transactions));
      txn_ws["!cols"] = [
        { wch: 12 },
        { wch: 18 },
        { wch: 16 },
        { wch: 30 },
        { wch: 28 },
        { wch: 12 },
      ];
      XLSX.utils.book_append_sheet(wb, txn_ws, "Transactions");

      XLSX.writeFile(wb, `${slug(groupName)}-export.xlsx`);
      toast.success("XLSX exported");
    } catch (e) {
      toast.warning((e as Error).message || "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={busy}>
          <DownloadSimple />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={exportCsv}>
          <FileCsv />
          Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={exportXlsx}>
          <FileXls />
          Export XLSX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { GroupExport };
