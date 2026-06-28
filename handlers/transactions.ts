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
  /** when set, logs into a shared group the user belongs to */
  groupId?: string | null;
  /** group spend: member ids who used this money — equal split among them.
   *  Empty/undefined on a group outcome defaults to all members. */
  participantIds?: string[];
  /** group spend: explicit per-member amounts (custom split). Takes precedence
   *  over participantIds. Must sum to `amount`. */
  splits?: { profileId: string; amount: number }[];
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
    if (payload.type === "TRANSFER" && payload.groupId) {
      return { ok: false, errorMessage: "Transfers aren't supported in groups" };
    }
    if (payload.type === "TRANSFER" && !payload.toFundId) {
      return { ok: false, errorMessage: "Pick a destination fund" };
    }
    if (payload.type === "TRANSFER" && payload.toFundId === payload.fundId) {
      return { ok: false, errorMessage: "Source and destination differ" };
    }

    const id = await prisma.$transaction(async (tx) => {
      const fundIds =
        payload.type === "TRANSFER"
          ? [payload.fundId, payload.toFundId!]
          : [payload.fundId];

      // Resolved per-member shares of a group spend.
      let splitRows: { profileId: string; amount: number }[] = [];

      if (payload.groupId) {
        // Group transactions use the group's shared pool fund — verify the
        // fund belongs to the group and that the user is a member.
        const group = await tx.group.findFirst({
          where: {
            id: payload.groupId,
            OR: [{ ownerId }, { Profile_groupMembers: { some: { id: ownerId } } }],
          },
          select: {
            blockedReason: true,
            ownerId: true,
            Profile_groupMembers: { select: { id: true } },
          },
        });
        if (!group) throw new Error("Not a group member");
        if (group.blockedReason) throw new Error("This group is blocked");
        const poolFunds = await tx.transactionSource.count({
          where: { id: { in: fundIds }, groupId: payload.groupId },
        });
        if (poolFunds !== fundIds.length) throw new Error("Fund not found");

        // Only outcomes have "who used it"; build per-member shares.
        if (payload.type === "OUTCOME") {
          const memberIds = new Set(
            group.Profile_groupMembers.map((m) => m.id).concat(group.ownerId),
          );

          if (payload.splits && payload.splits.length > 0) {
            // Custom amounts: validate members + that they sum to the total.
            for (const s of payload.splits) {
              if (!memberIds.has(s.profileId)) {
                throw new Error("Split member is not in the group");
              }
              if (!(s.amount >= 0)) throw new Error("Split amount invalid");
            }
            const sum = payload.splits.reduce((a, s) => a + s.amount, 0);
            if (Math.abs(sum - amount) >= 1) {
              throw new Error("Split amounts must sum to the total");
            }
            splitRows = payload.splits.filter((s) => s.amount > 0);
          } else {
            // Equal split among the picked members (default: everyone).
            const picked = (payload.participantIds ?? []).filter((pid) =>
              memberIds.has(pid),
            );
            const ids = picked.length > 0 ? picked : [...memberIds];
            const base = Math.floor(amount / ids.length);
            const remainder = amount - base * ids.length;
            splitRows = ids.map((profileId, i) => ({
              profileId,
              amount: base + (i === 0 ? remainder : 0),
            }));
          }
        }
      } else {
        // Personal transactions: the funds must belong to the user.
        const owned = await tx.transactionSource.count({
          where: { id: { in: fundIds }, ownerId, groupId: null },
        });
        if (owned !== fundIds.length) throw new Error("Fund not found");
      }

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

      const txnId = randomUUID();
      const created = await tx.transaction.create({
        data: {
          id: txnId,
          authorId: ownerId,
          type: payload.type,
          category:
            isOutcome && payload.category ? payload.category : "NULL",
          amount,
          description: payload.description?.trim() || null,
          occurredAt: payload.occurredAt ?? new Date(),
          confirmed: true,
          purposeId,
          groupId: payload.groupId ?? null,
          // money leaves `fromId`, lands in `toId`
          fromId: isOutcome || isTransfer ? payload.fundId : null,
          toId: isIncome ? payload.fundId : isTransfer ? payload.toFundId : null,
        },
        select: { id: true },
      });

      // Per-member shares of a group spend.
      if (splitRows.length > 0) {
        await tx.transactionSplit.createMany({
          data: splitRows.map((s) => ({
            id: randomUUID(),
            transactionId: txnId,
            profileId: s.profileId,
            amount: s.amount,
          })),
        });
      }

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
    if (payload.groupId) revalidatePath(`/groups/${payload.groupId}`);
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
