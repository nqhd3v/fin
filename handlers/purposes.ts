"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { TransactionCategory } from "@/lib/generated/prisma/client";

type Result<T> = ({ ok: true } & T) | { ok: false; errorMessage: string };

export type QuickLogPurpose = {
  id: string;
  name: string;
  icon: string;
  defaultAmount: number | null;
  category: TransactionCategory;
};

export interface IPurposePayload {
  name: string;
  icon: string;
  defaultAmount?: number | null;
  category?: TransactionCategory;
}

// Starter quick-log tiles seeded for a brand-new user so they can log right
// away without configuring anything. Icon keys map to `lib/quick-icons.tsx`.
const DEFAULT_ACTIONS: Array<{
  name: string;
  icon: string;
  defaultAmount: number | null;
  category: TransactionCategory;
}> = [
  { name: "Coffee", icon: "coffee", defaultAmount: 45000, category: "INCIDENTAL" },
  { name: "Breakfast", icon: "forkknife", defaultAmount: 35000, category: "ESSENTIAL" },
  { name: "Lunch", icon: "hamburger", defaultAmount: 60000, category: "ESSENTIAL" },
  { name: "Dinner", icon: "pizza", defaultAmount: 70000, category: "ESSENTIAL" },
  { name: "Transport", icon: "bus", defaultAmount: 20000, category: "ESSENTIAL" },
  { name: "Grocery", icon: "cart", defaultAmount: null, category: "ESSENTIAL" },
  { name: "Fuel", icon: "fuel", defaultAmount: null, category: "ESSENTIAL" },
  { name: "Shopping", icon: "bag", defaultAmount: null, category: "INCIDENTAL" },
  { name: "Health", icon: "health", defaultAmount: null, category: "ESSENTIAL" },
  { name: "Fun", icon: "game", defaultAmount: null, category: "INCIDENTAL" },
  { name: "Bills", icon: "bill", defaultAmount: null, category: "ESSENTIAL" },
  { name: "Gift", icon: "gift", defaultAmount: null, category: "INCIDENTAL" },
];

/** Seed defaults once, only when the user has no purposes at all. */
async function seedDefaultsIfNew(ownerId: string): Promise<void> {
  const total = await prisma.transactionPurpose.count({ where: { ownerId } });
  if (total > 0) return;
  await prisma.transactionPurpose.createMany({
    data: DEFAULT_ACTIONS.map((a, i) => ({
      id: randomUUID(),
      ownerId,
      name: a.name,
      icon: a.icon,
      defaultAmount: a.defaultAmount,
      category: a.category,
      sortOrder: i,
    })),
    skipDuplicates: true,
  });
}

/** All purpose names (for the transaction dialog combobox). */
export const listPurposeNames = async (): Promise<string[]> => {
  const ownerId = await requireUserId();
  const rows = await prisma.transactionPurpose.findMany({
    where: { ownerId },
    orderBy: { name: "asc" },
    select: { name: true },
  });
  return rows.map((r) => r.name);
};

/** Configured quick-log tiles (purposes that have an icon). */
export const listQuickLogPurposes = async (): Promise<QuickLogPurpose[]> => {
  const ownerId = await requireUserId();
  await seedDefaultsIfNew(ownerId);
  const rows = await prisma.transactionPurpose.findMany({
    where: { ownerId, icon: { not: null } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      icon: true,
      defaultAmount: true,
      category: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    icon: r.icon ?? "tag",
    defaultAmount: r.defaultAmount,
    category: r.category,
  }));
};

export const createPurpose = async (
  payload: IPurposePayload,
): Promise<Result<{ id: string }>> => {
  try {
    const ownerId = await requireUserId();
    const name = payload.name.trim();
    if (!name) return { ok: false, errorMessage: "Name is required" };

    // Reuse an existing same-name purpose (e.g. auto-created from a txn) so we
    // don't create a duplicate; just attach the quick-log config to it.
    const existing = await prisma.transactionPurpose.findFirst({
      where: { ownerId, name },
      select: { id: true },
    });
    const max = await prisma.transactionPurpose.aggregate({
      where: { ownerId, icon: { not: null } },
      _max: { sortOrder: true },
    });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const data = {
      name,
      icon: payload.icon,
      defaultAmount: payload.defaultAmount ?? null,
      category: payload.category ?? "NULL",
      sortOrder,
    };

    const id =
      existing?.id ??
      (
        await prisma.transactionPurpose.create({
          data: { id: randomUUID(), ownerId, ...data },
          select: { id: true },
        })
      ).id;
    if (existing) {
      await prisma.transactionPurpose.update({
        where: { id: existing.id },
        data,
      });
    }
    revalidatePath("/");
    return { ok: true, id };
  } catch (e) {
    console.error("Error when trying to create purpose:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export const updatePurpose = async (
  id: string,
  payload: IPurposePayload,
): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    const { count } = await prisma.transactionPurpose.updateMany({
      where: { id, ownerId },
      data: {
        name: payload.name.trim(),
        icon: payload.icon,
        defaultAmount: payload.defaultAmount ?? null,
        category: payload.category ?? "NULL",
      },
    });
    if (count === 0) return { ok: false, errorMessage: "Purpose not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to update purpose:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Remove a quick-log tile. Keeps past transactions (detaches purposeId). */
export const deletePurpose = async (id: string): Promise<Result<object>> => {
  try {
    const ownerId = await requireUserId();
    await prisma.transaction.updateMany({
      where: { purposeId: id, authorId: ownerId },
      data: { purposeId: null },
    });
    const { count } = await prisma.transactionPurpose.deleteMany({
      where: { id, ownerId },
    });
    if (count === 0) return { ok: false, errorMessage: "Purpose not found" };
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to delete purpose:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
