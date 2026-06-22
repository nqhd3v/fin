"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { SourceType } from "@/lib/generated/prisma/client";

export interface IFundPayload {
  name: string;
  type: SourceType;
  balance: number;
  hint?: string | null;
}

type Result<T> =
  | ({ ok: true } & T)
  | { ok: false; errorMessage: string };

export const listFunds = async () => {
  const ownerId = await requireUserId();
  return prisma.transactionSource.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
  });
};

export const createFund = async (
  payload: IFundPayload,
): Promise<Result<{ id: string }>> => {
  try {
    const ownerId = await requireUserId();
    const fund = await prisma.transactionSource.create({
      data: {
        id: randomUUID(),
        ownerId,
        name: payload.name.trim(),
        type: payload.type,
        balance: payload.balance,
        hint: payload.hint?.trim() || null,
      },
    });
    revalidatePath("/");
    return { ok: true, id: fund.id };
  } catch (e) {
    console.error("Error when trying to create fund:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export const updateFund = async (
  id: string,
  payload: IFundPayload,
): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    // Scope by ownerId so a user can only edit their own funds.
    const { count } = await prisma.transactionSource.updateMany({
      where: { id, ownerId },
      data: {
        name: payload.name.trim(),
        type: payload.type,
        balance: payload.balance,
        hint: payload.hint?.trim() || null,
      },
    });
    if (count === 0) return { ok: false, errorMessage: "Fund not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to update fund:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export const deleteFund = async (id: string): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    // Refuse to delete a fund still referenced by transactions or rules —
    // dropping it would orphan that history.
    const [txns, rules] = await Promise.all([
      prisma.transaction.count({
        where: { authorId: ownerId, OR: [{ fromId: id }, { toId: id }] },
      }),
      prisma.recurringRule.count({ where: { ownerId, sourceId: id } }),
    ]);
    if (txns > 0 || rules > 0) {
      return {
        ok: false,
        errorMessage: "This fund is used by transactions or rules.",
      };
    }
    const { count } = await prisma.transactionSource.deleteMany({
      where: { id, ownerId },
    });
    if (count === 0) return { ok: false, errorMessage: "Fund not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to delete fund:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
