"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import {
  TransactionType,
  TransactionCategory,
} from "@/lib/generated/prisma/client";

type Result<T> = ({ ok: true } & T) | { ok: false; errorMessage: string };

export interface ICreateTransactionPayload {
  type: TransactionType;
  amount: number;
  fundId: string;
  /** required for TRANSFER: the fund money moves into */
  toFundId?: string | null;
  description?: string | null;
  category?: TransactionCategory;
  /** free-text purpose name; auto-created per user if new */
  purposeName?: string | null;
  occurredAt?: Date;
}

export const createTransaction = async (
  payload: ICreateTransactionPayload,
): Promise<Result<{ id: string }>> => {
  try {
    const ownerId = await requireUserId();
    const amount = payload.amount;
    if (!(amount > 0)) {
      return { ok: false, errorMessage: "Amount must be positive" };
    }
    if (payload.type === "TRANSFER" && !payload.toFundId) {
      return { ok: false, errorMessage: "Pick a destination fund" };
    }
    if (payload.type === "TRANSFER" && payload.toFundId === payload.fundId) {
      return { ok: false, errorMessage: "Source and destination differ" };
    }

    const id = await prisma.$transaction(async (tx) => {
      // Verify the involved funds belong to the user.
      const fundIds =
        payload.type === "TRANSFER"
          ? [payload.fundId, payload.toFundId!]
          : [payload.fundId];
      const owned = await tx.transactionSource.count({
        where: { id: { in: fundIds }, ownerId },
      });
      if (owned !== fundIds.length) throw new Error("Fund not found");

      // Resolve (or create) the purpose by name, scoped to the user.
      let purposeId: string | undefined;
      const name = payload.purposeName?.trim();
      if (name) {
        const existing = await tx.transactionPurpose.findFirst({
          where: { ownerId, name },
          select: { id: true },
        });
        purposeId =
          existing?.id ??
          (
            await tx.transactionPurpose.create({
              data: { id: randomUUID(), ownerId, name },
              select: { id: true },
            })
          ).id;
      }

      const isOutcome = payload.type === "OUTCOME";
      const isIncome = payload.type === "INCOME";
      const isTransfer = payload.type === "TRANSFER";

      const created = await tx.transaction.create({
        data: {
          id: randomUUID(),
          authorId: ownerId,
          type: payload.type,
          category:
            isOutcome && payload.category ? payload.category : "NULL",
          amount,
          description: payload.description?.trim() || null,
          occurredAt: payload.occurredAt ?? new Date(),
          confirmed: true,
          purposeId,
          // money leaves `fromId`, lands in `toId`
          fromId: isOutcome || isTransfer ? payload.fundId : null,
          toId: isIncome ? payload.fundId : isTransfer ? payload.toFundId : null,
        },
        select: { id: true },
      });

      // Keep fund balances in sync.
      if (isOutcome) {
        await tx.transactionSource.update({
          where: { id: payload.fundId },
          data: { balance: { decrement: amount } },
        });
      } else if (isIncome) {
        await tx.transactionSource.update({
          where: { id: payload.fundId },
          data: { balance: { increment: amount } },
        });
      } else {
        await tx.transactionSource.update({
          where: { id: payload.fundId },
          data: { balance: { decrement: amount } },
        });
        await tx.transactionSource.update({
          where: { id: payload.toFundId! },
          data: { balance: { increment: amount } },
        });
      }

      return created.id;
    });

    revalidatePath("/");
    return { ok: true, id };
  } catch (e) {
    console.error("Error when trying to create transaction:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export type RecentTransaction = {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  occurredAt: Date;
  purposeName: string | null;
  fromName: string | null;
  toName: string | null;
};

export const listRecentTransactions = async (
  limit = 10,
): Promise<RecentTransaction[]> => {
  const ownerId = await requireUserId();
  const rows = await prisma.transaction.findMany({
    where: { authorId: ownerId, groupId: null },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      type: true,
      amount: true,
      description: true,
      occurredAt: true,
      TransactionPurpose: { select: { name: true } },
      TransactionSource_Transaction_fromIdToTransactionSource: {
        select: { name: true },
      },
      TransactionSource_Transaction_toIdToTransactionSource: {
        select: { name: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    amount: r.amount,
    description: r.description,
    occurredAt: r.occurredAt,
    purposeName: r.TransactionPurpose?.name ?? null,
    fromName: r.TransactionSource_Transaction_fromIdToTransactionSource?.name ?? null,
    toName: r.TransactionSource_Transaction_toIdToTransactionSource?.name ?? null,
  }));
};

export type MonthlySummary = {
  spent: number;
  income: number;
  essential: number;
  incidental: number;
};

export const getMonthlySummary = async (): Promise<MonthlySummary> => {
  const ownerId = await requireUserId();
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const base = {
    authorId: ownerId,
    groupId: null,
    confirmed: true,
    occurredAt: { gte: start, lt: end },
  };

  const [income, essential, incidental] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { ...base, type: "INCOME" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { ...base, type: "OUTCOME", category: "ESSENTIAL" },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { ...base, type: "OUTCOME", category: { not: "ESSENTIAL" } },
    }),
  ]);

  const essentialSum = essential._sum.amount ?? 0;
  const incidentalSum = incidental._sum.amount ?? 0;
  return {
    spent: essentialSum + incidentalSum,
    income: income._sum.amount ?? 0,
    essential: essentialSum,
    incidental: incidentalSum,
  };
};
