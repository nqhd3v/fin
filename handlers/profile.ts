"use server";

import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { Role } from "@/lib/generated/prisma/client";

type Result<T> = ({ ok: true } & T) | { ok: false; errorMessage: string };

export interface IMyProfile {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  counts: {
    transactions: number;
    funds: number;
    purposes: number;
    rules: number;
    groups: number;
  };
}

/** The current user's own profile, email, and data counts. */
export const getMyProfile = async (): Promise<IMyProfile> => {
  const id = await requireUserId();
  const profile = await prisma.profile.findUnique({
    where: { id },
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
  if (!profile) throw new Error("Profile not found");

  // Email lives in Supabase's auth.users (not modeled by Prisma).
  const rows = await prisma.$queryRaw<{ email: string | null }[]>`
    SELECT email FROM auth.users WHERE id::text = ${id}
  `;

  return {
    id: profile.id,
    name: profile.name,
    email: rows[0]?.email ?? null,
    role: profile.role,
    counts: {
      transactions: profile._count.Transaction,
      funds: profile._count.TransactionSource,
      purposes: profile._count.TransactionPurpose,
      rules: profile._count.RecurringRule,
      groups: profile._count.Group_Group_ownerIdToProfile,
    },
  };
};

/** Rename own profile. Empty clears the name. */
export const updateMyName = async (name: string): Promise<Result<object>> => {
  try {
    const id = await requireUserId();
    await prisma.profile.update({
      where: { id },
      data: { name: name.trim() || null },
    });
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to update profile name:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Wipe own personal finance data (keeps the account + group data). */
export const resetMyData = async (): Promise<Result<object>> => {
  try {
    const id = await requireUserId();
    // Personal only — leave group pools and group transactions intact.
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { authorId: id, groupId: null } }),
      prisma.recurringRule.deleteMany({ where: { ownerId: id } }),
      prisma.transactionSource.deleteMany({
        where: { ownerId: id, groupId: null },
      }),
      prisma.transactionPurpose.deleteMany({ where: { ownerId: id } }),
    ]);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to reset my data:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
