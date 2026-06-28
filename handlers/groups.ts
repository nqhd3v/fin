"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import type { TransactionType } from "@/lib/generated/prisma/client";

type Result<T> = ({ ok: true } & T) | { ok: false; errorMessage: string };

export interface IGroupSummary {
  id: string;
  name: string;
  memberCount: number;
  isOwner: boolean;
  hasPasscode: boolean;
  blocked: boolean;
}

/** Groups the current user owns or belongs to. */
export const listGroups = async (): Promise<IGroupSummary[]> => {
  const userId = await requireUserId();
  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { Profile_groupMembers: { some: { id: userId } } },
      ],
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      ownerId: true,
      passcode: true,
      blockedReason: true,
      _count: { select: { Profile_groupMembers: true } },
    },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g._count.Profile_groupMembers,
    isOwner: g.ownerId === userId,
    hasPasscode: Boolean(g.passcode),
    blocked: Boolean(g.blockedReason),
  }));
};

export interface ICreateGroupPayload {
  name: string;
  passcode?: string | null;
}

/** Create a group; the creator becomes owner and first member. */
export const createGroup = async (
  payload: ICreateGroupPayload,
): Promise<Result<{ id: string }>> => {
  try {
    const ownerId = await requireUserId();
    const id = randomUUID();
    const name = payload.name.trim();
    await prisma.group.create({
      data: {
        id,
        name,
        passcode: payload.passcode?.trim() || null,
        inviteToken: randomUUID(),
        ownerId,
        // Owner is also a member so feed/analytics include them.
        Profile_groupMembers: { connect: { id: ownerId } },
        // Every group has exactly one shared "pool" fund all members use.
        TransactionSource: {
          create: {
            id: randomUUID(),
            name: `${name} pool`,
            type: "CASH",
            balance: 0,
            ownerId,
          },
        },
      },
    });
    revalidatePath("/groups");
    return { ok: true, id };
  } catch (e) {
    console.error("Error when trying to create group:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export interface IJoinGroupPayload {
  groupId: string;
  passcode?: string | null;
}

/** Self-join a group by id, validating its passcode if set. */
export const joinGroup = async (
  payload: IJoinGroupPayload,
): Promise<Result<{ id: string }>> => {
  try {
    const userId = await requireUserId();
    const group = await prisma.group.findUnique({
      where: { id: payload.groupId.trim() },
      select: { id: true, passcode: true },
    });
    if (!group) return { ok: false, errorMessage: "Group not found" };
    if (group.passcode && group.passcode !== payload.passcode?.trim()) {
      return { ok: false, errorMessage: "Wrong passcode" };
    }
    await prisma.group.update({
      where: { id: group.id },
      data: { Profile_groupMembers: { connect: { id: userId } } },
    });
    revalidatePath("/groups");
    return { ok: true, id: group.id };
  } catch (e) {
    console.error("Error when trying to join group:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Join a group via an invite token — skips the passcode (the link is the
 *  authorization). Returns the group id so the caller can redirect. */
export const joinByToken = async (
  token: string,
): Promise<Result<{ id: string }>> => {
  try {
    const userId = await requireUserId();
    const group = await prisma.group.findUnique({
      where: { inviteToken: token.trim() },
      select: { id: true, blockedReason: true },
    });
    if (!group) return { ok: false, errorMessage: "Invalid invite link" };
    if (group.blockedReason) {
      return { ok: false, errorMessage: "This group is blocked" };
    }
    await prisma.group.update({
      where: { id: group.id },
      data: { Profile_groupMembers: { connect: { id: userId } } },
    });
    revalidatePath("/groups");
    return { ok: true, id: group.id };
  } catch (e) {
    console.error("Error when trying to join group by token:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Leave a group. Owners cannot leave (must delete instead). */
export const leaveGroup = async (
  groupId: string,
): Promise<Result<object>> => {
  try {
    const userId = await requireUserId();
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });
    if (!group) return { ok: false, errorMessage: "Group not found" };
    if (group.ownerId === userId) {
      return { ok: false, errorMessage: "Owner can't leave; delete the group." };
    }
    await prisma.group.update({
      where: { id: groupId },
      data: { Profile_groupMembers: { disconnect: { id: userId } } },
    });
    revalidatePath("/groups");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to leave group:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Remove a member (owner only). Owner can't remove themselves. */
export const removeMember = async (
  groupId: string,
  memberId: string,
): Promise<Result<object>> => {
  try {
    const userId = await requireUserId();
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });
    if (!group) return { ok: false, errorMessage: "Group not found" };
    if (group.ownerId !== userId) {
      return { ok: false, errorMessage: "Only the owner can remove members." };
    }
    if (memberId === userId) {
      return { ok: false, errorMessage: "Owner can't be removed." };
    }
    await prisma.group.update({
      where: { id: groupId },
      data: { Profile_groupMembers: { disconnect: { id: memberId } } },
    });
    revalidatePath(`/groups/${groupId}`);
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to remove member:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/**
 * Delete a group (owner only). The shared pool fund and all group transactions
 * belong to the group, so they're removed with it.
 */
export const deleteGroup = async (
  groupId: string,
): Promise<Result<object>> => {
  try {
    const userId = await requireUserId();
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { ownerId: true },
    });
    if (!group) return { ok: false, errorMessage: "Group not found" };
    if (group.ownerId !== userId) {
      return { ok: false, errorMessage: "Only the owner can delete the group." };
    }
    await prisma.$transaction([
      // Transactions reference the pool fund + group, so drop them first.
      prisma.transaction.deleteMany({ where: { groupId } }),
      prisma.transactionSource.deleteMany({ where: { groupId } }),
      prisma.group.update({
        where: { id: groupId },
        data: { Profile_groupMembers: { set: [] } },
      }),
      prisma.group.delete({ where: { id: groupId } }),
    ]);
    revalidatePath("/groups");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to delete group:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

export interface IGroupMember {
  id: string;
  name: string | null;
  email: string | null;
  isOwner: boolean;
  income: number;
  outcome: number;
}

export interface IGroupTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  occurredAt: Date;
  purposeName: string | null;
  authorName: string | null;
  authorId: string;
  // Set when the transfer is a reimbursement pool → member.
  payeeName: string | null;
  reimbursementStatus: string | null;
  // Group spend: per-member shares (name + amount). Empty = whole group / n/a.
  splits: { name: string | null; amount: number }[];
  // True when the split isn't "everyone, evenly" (subset and/or custom amounts).
  customSplit: boolean;
}

export interface IGroupFund {
  id: string;
  name: string;
  balance: number;
}

export interface IGroupPending {
  id: string;
  amount: number;
  description: string | null;
  createdAt: Date;
}

export interface IGroupDetail {
  id: string;
  name: string;
  isOwner: boolean;
  hasPasscode: boolean;
  inviteToken: string | null;
  blockedReason: string | null;
  fund: IGroupFund | null;
  members: IGroupMember[];
  transactions: IGroupTransaction[];
  pending: IGroupPending[];
  totals: { income: number; outcome: number };
}

/** Full group view: members, shared feed, per-member analytics. */
export const getGroupDetail = async (
  groupId: string,
): Promise<IGroupDetail | null> => {
  const userId = await requireUserId();
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      OR: [
        { ownerId: userId },
        { Profile_groupMembers: { some: { id: userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      passcode: true,
      inviteToken: true,
      blockedReason: true,
      Profile_groupMembers: { select: { id: true, name: true } },
      TransactionSource: {
        select: { id: true, name: true, balance: true },
        take: 1,
      },
    },
  });
  if (!group) return null;

  // Backfill an invite token for groups created before tokens existed.
  let inviteToken = group.inviteToken;
  if (!inviteToken) {
    inviteToken = randomUUID();
    await prisma.group.update({
      where: { id: group.id },
      data: { inviteToken },
    });
  }

  // Backfill the pool fund for groups created before pools existed.
  let fund = group.TransactionSource[0] ?? null;
  if (!fund) {
    fund = await prisma.transactionSource.create({
      data: {
        id: randomUUID(),
        name: `${group.name} pool`,
        type: "CASH",
        balance: 0,
        ownerId: group.ownerId,
        groupId: group.id,
      },
      select: { id: true, name: true, balance: true },
    });
  }

  const memberIds = group.Profile_groupMembers.map((m) => m.id);

  const [txns, pendingRows, emailRows] = await Promise.all([
    prisma.transaction.findMany({
      where: { groupId, confirmed: true },
      orderBy: { occurredAt: "desc" },
      select: {
        id: true,
        type: true,
        amount: true,
        description: true,
        occurredAt: true,
        authorId: true,
        payeeId: true,
        reimbursementStatus: true,
        TransactionPurpose: { select: { name: true } },
        Profile: { select: { name: true } },
        TransactionSplit: { select: { profileId: true, amount: true } },
      },
    }),
    // Reimbursements the current user can still claim into a personal fund.
    prisma.transaction.findMany({
      where: { groupId, payeeId: userId, reimbursementStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, description: true, createdAt: true },
    }),
    memberIds.length
      ? prisma.$queryRaw<{ id: string; email: string | null }[]>`
          SELECT id::text, email FROM auth.users WHERE id::text = ANY(${memberIds})
        `
      : Promise.resolve([] as { id: string; email: string | null }[]),
  ]);

  const emailById = new Map(emailRows.map((r) => [r.id, r.email]));
  const nameById = new Map(
    group.Profile_groupMembers.map((m) => [m.id, m.name]),
  );

  // Per-member income/outcome tallies from the shared feed.
  const tally = new Map<string, { income: number; outcome: number }>();
  const bump = (id: string, key: "income" | "outcome", amount: number) => {
    const m = tally.get(id) ?? { income: 0, outcome: 0 };
    m[key] += amount;
    tally.set(id, m);
  };
  let totalIncome = 0;
  let totalOutcome = 0;
  for (const t of txns) {
    if (t.type === "INCOME") {
      bump(t.authorId, "income", t.amount);
      totalIncome += t.amount;
    } else if (t.type === "OUTCOME") {
      totalOutcome += t.amount;
      // Attribute by stored per-member splits; fall back to an even split
      // across all members for legacy spends without splits.
      if (t.TransactionSplit.length > 0) {
        for (const s of t.TransactionSplit) bump(s.profileId, "outcome", s.amount);
      } else if (memberIds.length > 0) {
        const share = t.amount / memberIds.length;
        for (const pid of memberIds) bump(pid, "outcome", share);
      }
    } else if (t.type === "TRANSFER" && t.payeeId) {
      // Reimbursement: pool money paid out to the payee — counts as spent,
      // attributed to the member who received it.
      bump(t.payeeId, "outcome", t.amount);
      totalOutcome += t.amount;
    }
  }

  const members: IGroupMember[] = group.Profile_groupMembers.map((m) => ({
    id: m.id,
    name: m.name,
    email: emailById.get(m.id) ?? null,
    isOwner: m.id === group.ownerId,
    income: tally.get(m.id)?.income ?? 0,
    outcome: tally.get(m.id)?.outcome ?? 0,
  })).sort((a, b) => Number(b.isOwner) - Number(a.isOwner));

  return {
    id: group.id,
    name: group.name,
    isOwner: group.ownerId === userId,
    hasPasscode: Boolean(group.passcode),
    inviteToken,
    blockedReason: group.blockedReason,
    fund,
    members,
    transactions: txns.map((t) => ({
      id: t.id,
      type: t.type,
      amount: t.amount,
      description: t.description,
      occurredAt: t.occurredAt,
      purposeName: t.TransactionPurpose?.name ?? null,
      authorName: t.Profile?.name ?? null,
      authorId: t.authorId,
      payeeName: t.payeeId ? nameById.get(t.payeeId) ?? null : null,
      reimbursementStatus: t.reimbursementStatus,
      splits: t.TransactionSplit.map((s) => ({
        name: nameById.get(s.profileId) ?? null,
        amount: s.amount,
      })),
      customSplit:
        t.type === "OUTCOME" &&
        t.TransactionSplit.length > 0 &&
        (t.TransactionSplit.length < memberIds.length ||
          t.TransactionSplit.some(
            (s) => Math.abs(s.amount - t.amount / t.TransactionSplit.length) >= 1,
          )),
    })),
    pending: pendingRows.map((p) => ({
      id: p.id,
      amount: p.amount,
      description: p.description,
      createdAt: p.createdAt,
    })),
    totals: { income: totalIncome, outcome: totalOutcome },
  };
};

export interface ICreateReimbursementPayload {
  groupId: string;
  payeeId: string;
  amount: number;
  description?: string | null;
}

/**
 * Reimburse a member from the group pool. The pool is debited now and the
 * transfer shows in the shared feed immediately (transparent to all). The
 * payee separately decides whether to record it into a personal fund (accept)
 * or not (reject = labeled only) via their pending queue.
 */
export const createReimbursement = async (
  payload: ICreateReimbursementPayload,
): Promise<Result<object>> => {
  try {
    const creatorId = await requireUserId();
    if (!(payload.amount > 0)) {
      return { ok: false, errorMessage: "Amount must be positive" };
    }
    const group = await prisma.group.findFirst({
      where: {
        id: payload.groupId,
        OR: [
          { ownerId: creatorId },
          { Profile_groupMembers: { some: { id: creatorId } } },
        ],
      },
      select: {
        ownerId: true,
        blockedReason: true,
        TransactionSource: { select: { id: true }, take: 1 },
        Profile_groupMembers: { select: { id: true } },
      },
    });
    if (!group) return { ok: false, errorMessage: "Not a group member" };
    if (group.blockedReason) {
      return { ok: false, errorMessage: "This group is blocked" };
    }
    const pool = group.TransactionSource[0];
    if (!pool) return { ok: false, errorMessage: "Group has no pool fund" };
    const isMember =
      payload.payeeId === group.ownerId ||
      group.Profile_groupMembers.some((m) => m.id === payload.payeeId);
    if (!isMember) {
      return { ok: false, errorMessage: "Payee is not a group member" };
    }

    await prisma.$transaction([
      // Confirmed group transfer: author = creator, payee = recipient. Shows
      // in the feed right away; payee claims it into their fund separately.
      prisma.transaction.create({
        data: {
          id: randomUUID(),
          type: "TRANSFER",
          category: "NULL",
          amount: payload.amount,
          description: payload.description?.trim() || null,
          authorId: creatorId,
          payeeId: payload.payeeId,
          reimbursementStatus: "PENDING",
          groupId: payload.groupId,
          fromId: pool.id,
          toId: null,
          confirmed: true,
          occurredAt: new Date(),
        },
      }),
      // Money leaves the pool now.
      prisma.transactionSource.update({
        where: { id: pool.id },
        data: { balance: { decrement: payload.amount } },
      }),
    ]);
    revalidatePath(`/groups/${payload.groupId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to create reimbursement:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/**
 * Accept a reimbursement into one of your funds. The pool was already debited
 * at creation — this only credits the payee's personal fund.
 */
export const acceptReimbursement = async (
  id: string,
  fundId: string,
): Promise<Result<object>> => {
  try {
    const userId = await requireUserId();
    const groupId = await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.findFirst({
        where: { id, payeeId: userId, reimbursementStatus: "PENDING" },
        select: {
          id: true,
          amount: true,
          description: true,
          groupId: true,
          Group: { select: { name: true } },
        },
      });
      if (!t) throw new Error("Reimbursement not found");
      const fund = await tx.transactionSource.count({
        where: { id: fundId, ownerId: userId, groupId: null },
      });
      if (fund === 0) throw new Error("Fund not found");

      await tx.transaction.update({
        where: { id },
        data: { reimbursementStatus: "ACCEPTED" },
      });
      // Record a personal income so the payee can later see where the money
      // came from in their own transaction history.
      const fromGroup = t.Group?.name ?? "group";
      await tx.transaction.create({
        data: {
          id: randomUUID(),
          type: "INCOME",
          category: "NULL",
          amount: t.amount,
          description: t.description
            ? `Reimbursement (${fromGroup}): ${t.description}`
            : `Reimbursement from ${fromGroup}`,
          authorId: userId,
          groupId: null,
          fromId: null,
          toId: fundId,
          confirmed: true,
          occurredAt: new Date(),
        },
      });
      await tx.transactionSource.update({
        where: { id: fundId },
        data: { balance: { increment: t.amount } },
      });
      return t.groupId;
    });
    if (groupId) revalidatePath(`/groups/${groupId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to accept reimbursement:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/**
 * Reject a reimbursement — label only. The group transfer stays (pool already
 * paid), but nothing is credited to the payee's personal funds.
 */
export const rejectReimbursement = async (
  id: string,
): Promise<Result<object>> => {
  try {
    const userId = await requireUserId();
    const t = await prisma.transaction.findFirst({
      where: { id, payeeId: userId, reimbursementStatus: "PENDING" },
      select: { groupId: true },
    });
    if (!t) return { ok: false, errorMessage: "Reimbursement not found" };
    await prisma.transaction.update({
      where: { id },
      data: { reimbursementStatus: "REJECTED" },
    });
    if (t.groupId) revalidatePath(`/groups/${t.groupId}`);
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    console.error("Error when trying to reject reimbursement:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
