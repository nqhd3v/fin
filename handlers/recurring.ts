"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { nextRun, type Anchor } from "@/lib/recurrence";
import {
  TransactionType,
  TransactionCategory,
  RecurrenceAnchor,
} from "@/lib/generated/prisma/client";

type Result<T> = ({ ok: true } & T) | { ok: false; errorMessage: string };

export interface IRecurringPayload {
  name: string;
  type: TransactionType;
  amount: number;
  sourceId: string;
  category?: TransactionCategory;
  anchor: RecurrenceAnchor;
  dayValue?: number | null;
}

export type RecurringRow = {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  sourceId: string | null;
  fundName: string | null;
  anchor: RecurrenceAnchor;
  dayValue: number | null;
  nextRunAt: Date;
  active: boolean;
  pendingTxnId: string | null;
};

export const listRecurring = async (): Promise<RecurringRow[]> => {
  const ownerId = await requireUserId();
  const rows = await prisma.recurringRule.findMany({
    where: { ownerId },
    orderBy: { nextRunAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      amount: true,
      category: true,
      sourceId: true,
      anchor: true,
      dayValue: true,
      nextRunAt: true,
      active: true,
      TransactionSource: { select: { name: true } },
      // most recent still-unconfirmed generated transaction
      Transaction: {
        where: { confirmed: false },
        orderBy: { occurredAt: "desc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    amount: r.amount,
    category: r.category,
    sourceId: r.sourceId,
    fundName: r.TransactionSource?.name ?? null,
    anchor: r.anchor,
    dayValue: r.dayValue,
    nextRunAt: r.nextRunAt,
    active: r.active,
    pendingTxnId: r.Transaction[0]?.id ?? null,
  }));
};

export const createRule = async (
  payload: IRecurringPayload,
): Promise<Result<{ id: string }>> => {
  try {
    const ownerId = await requireUserId();
    if (!(payload.amount > 0)) {
      return { ok: false, errorMessage: "Amount must be positive" };
    }
    const owned = await prisma.transactionSource.count({
      where: { id: payload.sourceId, ownerId },
    });
    if (!owned) return { ok: false, errorMessage: "Fund not found" };

    const rule = await prisma.recurringRule.create({
      data: {
        id: randomUUID(),
        ownerId,
        name: payload.name.trim(),
        type: payload.type,
        amount: payload.amount,
        category:
          payload.type === "OUTCOME" && payload.category
            ? payload.category
            : "NULL",
        sourceId: payload.sourceId,
        anchor: payload.anchor,
        dayValue: payload.dayValue ?? null,
        nextRunAt: nextRun(payload.anchor as Anchor, payload.dayValue),
        active: true,
      },
      select: { id: true },
    });
    revalidatePath("/");
    return { ok: true, id: rule.id };
  } catch (e) {
    console.error("Error when trying to create rule:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export const updateRule = async (
  id: string,
  payload: IRecurringPayload,
): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    const { count } = await prisma.recurringRule.updateMany({
      where: { id, ownerId },
      data: {
        name: payload.name.trim(),
        type: payload.type,
        amount: payload.amount,
        category:
          payload.type === "OUTCOME" && payload.category
            ? payload.category
            : "NULL",
        sourceId: payload.sourceId,
        anchor: payload.anchor,
        dayValue: payload.dayValue ?? null,
        nextRunAt: nextRun(payload.anchor as Anchor, payload.dayValue),
      },
    });
    if (count === 0) return { ok: false, errorMessage: "Rule not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to update rule:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export const setRuleActive = async (
  id: string,
  active: boolean,
): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    const { count } = await prisma.recurringRule.updateMany({
      where: { id, ownerId },
      data: { active },
    });
    if (count === 0) return { ok: false, errorMessage: "Rule not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to toggle rule:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export const deleteRule = async (id: string): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    // Detach generated transactions (keep the history), then drop the rule.
    await prisma.transaction.updateMany({
      where: { recurringId: id, authorId: ownerId },
      data: { recurringId: null },
    });
    const { count } = await prisma.recurringRule.deleteMany({
      where: { id, ownerId },
    });
    if (count === 0) return { ok: false, errorMessage: "Rule not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to delete rule:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/**
 * Materialize due occurrences. No cron — call this on app load. Each due rule
 * gets an UNCONFIRMED transaction (no balance change yet) and its nextRunAt is
 * advanced. The user confirms via markHappened, which applies the balance.
 */
export const generateDueTransactions = async (): Promise<void> => {
  const ownerId = await requireUserId();
  const now = new Date();
  const due = await prisma.recurringRule.findMany({
    where: { ownerId, active: true, nextRunAt: { lte: now } },
  });
  for (const rule of due) {
    const isIncome = rule.type === "INCOME";
    await prisma.transaction.create({
      data: {
        id: randomUUID(),
        authorId: ownerId,
        type: rule.type,
        category: rule.category,
        amount: rule.amount,
        description: rule.name,
        occurredAt: rule.nextRunAt,
        confirmed: false,
        recurringId: rule.id,
        purposeId: rule.purposeId,
        fromId: isIncome ? null : rule.sourceId,
        toId: isIncome ? rule.sourceId : null,
      },
    });
    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: { nextRunAt: nextRun(rule.anchor as Anchor, rule.dayValue, now) },
    });
  }
};

/** Confirm a pending generated transaction and apply its balance change. */
export const markHappened = async (
  txnId: string,
): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.findFirst({
        where: { id: txnId, authorId: ownerId, confirmed: false },
        select: { id: true, type: true, amount: true, fromId: true, toId: true },
      });
      if (!t) throw new Error("Pending transaction not found");

      await tx.transaction.update({
        where: { id: t.id },
        data: { confirmed: true },
      });
      if (t.fromId) {
        await tx.transactionSource.update({
          where: { id: t.fromId },
          data: { balance: { decrement: t.amount } },
        });
      }
      if (t.toId) {
        await tx.transactionSource.update({
          where: { id: t.toId },
          data: { balance: { increment: t.amount } },
        });
      }
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to mark happened:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Discard a pending generated transaction (it did not happen). */
export const skipPending = async (txnId: string): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    const { count } = await prisma.transaction.deleteMany({
      where: { id: txnId, authorId: ownerId, confirmed: false },
    });
    if (count === 0) return { ok: false, errorMessage: "Nothing to skip" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to skip pending:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
