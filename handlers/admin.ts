"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Role } from "@/lib/generated/prisma/client";

type Result<T> =
  | ({ ok: true } & T)
  | { ok: false; errorMessage: string };

export interface IAdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  transactions: number;
  funds: number;
  purposes: number;
  rules: number;
  ownedGroups: number;
}

/** All profiles with per-user data counts. Admin only. */
export const listUsers = async (): Promise<IAdminUser[]> => {
  await requireAdmin();
  const profiles = await prisma.profile.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      _count: {
        select: {
          Transaction: true,
          TransactionSource: true,
          TransactionPurpose: true,
          RecurringRule: true,
          Group_Group_ownerIdToProfile: true,
        },
      },
    },
  });

  // Email lives in Supabase's auth.users, which Prisma doesn't model — pull it
  // separately and map by id.
  const rows = await prisma.$queryRaw<{ id: string; email: string | null }[]>`
    SELECT id::text, email FROM auth.users
  `;
  const emailById = new Map(rows.map((r) => [r.id, r.email]));

  return profiles.map((p) => ({
    id: p.id,
    name: p.name,
    email: emailById.get(p.id) ?? null,
    role: p.role,
    transactions: p._count.Transaction,
    funds: p._count.TransactionSource,
    purposes: p._count.TransactionPurpose,
    rules: p._count.RecurringRule,
    ownedGroups: p._count.Group_Group_ownerIdToProfile,
  }));
};

export interface IUpdateUserPayload {
  name: string;
  role: Role;
}

/** Rename or promote/demote a user. Admin only. */
export const updateUser = async (
  id: string,
  payload: IUpdateUserPayload,
): Promise<Result<object>> => {
  try {
    const adminId = await requireAdmin();
    // Guard: an admin cannot demote themselves, else they'd lock out access.
    if (id === adminId && payload.role !== "ADMIN") {
      return { ok: false, errorMessage: "You cannot remove your own admin role." };
    }
    await prisma.profile.update({
      where: { id },
      data: { name: payload.name.trim() || null, role: payload.role },
    });
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to update user:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/**
 * Wipe a user's finance data — transactions, funds, quick-log purposes, and
 * recurring rules — while keeping the account itself. Irreversible.
 */
export const resetAccountData = async (
  id: string,
): Promise<Result<object>> => {
  try {
    await requireAdmin();
    await prisma.$transaction([
      // Transactions first: they reference funds, purposes, and rules.
      prisma.transaction.deleteMany({ where: { authorId: id } }),
      prisma.recurringRule.deleteMany({ where: { ownerId: id } }),
      prisma.transactionSource.deleteMany({ where: { ownerId: id } }),
      prisma.transactionPurpose.deleteMany({ where: { ownerId: id } }),
    ]);
    revalidatePath("/admin");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to reset account data:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export interface IAdminGroup {
  id: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  members: number;
  transactions: number;
  blockedReason: string | null;
}

/** All groups for admin review — counts only, no money figures. */
export const listGroupsAdmin = async (): Promise<IAdminGroup[]> => {
  await requireAdmin();
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      blockedReason: true,
      ownerId: true,
      Profile_Group_ownerIdToProfile: { select: { name: true } },
      _count: { select: { Profile_groupMembers: true, Transaction: true } },
    },
  });

  const ownerIds = [...new Set(groups.map((g) => g.ownerId))];
  const emailRows = ownerIds.length
    ? await prisma.$queryRaw<{ id: string; email: string | null }[]>`
        SELECT id::text, email FROM auth.users WHERE id::text = ANY(${ownerIds})
      `
    : [];
  const emailById = new Map(emailRows.map((r) => [r.id, r.email]));

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    ownerName: g.Profile_Group_ownerIdToProfile?.name ?? null,
    ownerEmail: emailById.get(g.ownerId) ?? null,
    members: g._count.Profile_groupMembers,
    transactions: g._count.Transaction,
    blockedReason: g.blockedReason,
  }));
};

/** Block a group with a reason shown to members. Admin only. */
export const blockGroup = async (
  id: string,
  reason: string,
): Promise<Result<object>> => {
  try {
    await requireAdmin();
    const text = reason.trim();
    if (!text) return { ok: false, errorMessage: "A reason is required." };
    await prisma.group.update({
      where: { id },
      data: { blockedReason: text },
    });
    revalidatePath("/admin");
    revalidatePath(`/groups/${id}`);
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to block group:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Lift a group block. Admin only. */
export const unblockGroup = async (id: string): Promise<Result<object>> => {
  try {
    await requireAdmin();
    await prisma.group.update({
      where: { id },
      data: { blockedReason: null },
    });
    revalidatePath("/admin");
    revalidatePath(`/groups/${id}`);
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to unblock group:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/**
 * Reset a group to the beginning — delete all its transactions and zero the
 * shared pool balance. Members and the group itself are kept. Irreversible.
 */
export const resetGroupData = async (id: string): Promise<Result<object>> => {
  try {
    await requireAdmin();
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { groupId: id } }),
      prisma.transactionSource.updateMany({
        where: { groupId: id },
        data: { balance: 0 },
      }),
    ]);
    revalidatePath("/admin");
    revalidatePath(`/groups/${id}`);
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to reset group data:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
