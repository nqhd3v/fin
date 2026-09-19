import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Delete one group transaction and undo its effect on the pool, inside the
 * caller's DB transaction. Group owner only. Per-member tallies are derived
 * from the feed, so they follow automatically; splits cascade.
 *
 * An ACCEPTED reimbursement is refused: it already wrote a personal INCOME
 * into the payee's fund, which the group owner can't touch. Returns the
 * group id. Throws on any rule violation.
 */
export async function deleteGroupTransactionTx(
  tx: Prisma.TransactionClient,
  userId: string,
  transactionId: string,
): Promise<string> {
  const txn = await tx.transaction.findUnique({
    where: { id: transactionId },
    select: {
      amount: true,
      fromId: true,
      toId: true,
      groupId: true,
      reimbursementStatus: true,
      Group: { select: { ownerId: true, blockedReason: true } },
    },
  });
  const group = txn?.Group;
  if (!txn || !txn.groupId || !group) {
    throw new Error("Transaction not found");
  }
  if (group.ownerId !== userId) {
    throw new Error("Only the group owner can delete group transactions");
  }
  if (group.blockedReason) throw new Error("This group is blocked");
  if (txn.reimbursementStatus === "ACCEPTED") {
    throw new Error("Already accepted into the member's fund — can't delete");
  }

  // Conditional delete: if the payee accepted in the meantime, nothing
  // matches and we abort instead of refunding the pool twice.
  const { count } = await tx.transaction.deleteMany({
    where: {
      id: transactionId,
      OR: [
        { reimbursementStatus: null },
        { reimbursementStatus: { in: ["PENDING", "REJECTED"] } },
      ],
    },
  });
  if (count === 0) {
    throw new Error("Transaction changed — refresh and try again");
  }

  // Reverse the balance moves made at creation (money left `fromId`, landed
  // in `toId`). Group entries only ever touch the group's pool.
  if (txn.fromId) {
    await tx.transactionSource.update({
      where: { id: txn.fromId },
      data: { balance: { increment: txn.amount } },
    });
  }
  if (txn.toId) {
    await tx.transactionSource.update({
      where: { id: txn.toId },
      data: { balance: { decrement: txn.amount } },
    });
  }
  return txn.groupId;
}
