import type { Prisma } from "@/lib/generated/prisma/client";

export type SplitRow = { profileId?: string; guestId?: string; amount: number };

export interface ISplitInput {
  /** member ids who used the money — equal split among them. */
  participantIds?: string[];
  /** temp-member (guest) ids folded into the equal split. */
  guestParticipantIds?: string[];
  /** explicit per-member/guest amounts; takes precedence, must sum to amount. */
  splits?: SplitRow[];
}

/**
 * Resolve who used a group spend into per-member/guest shares. Validates every
 * target belongs to the group. Empty picks default to an even split across all
 * members. Throws on invalid input.
 */
export async function resolveGroupSplits(
  tx: Prisma.TransactionClient,
  group: { id: string; ownerId: string; memberIds: string[] },
  amount: number,
  input: ISplitInput,
): Promise<SplitRow[]> {
  const memberIds = new Set([...group.memberIds, group.ownerId]);
  // Valid temp members (guests) of this group.
  const guestRows = await tx.groupGuest.findMany({
    where: { groupId: group.id },
    select: { id: true },
  });
  const guestIds = new Set(guestRows.map((g) => g.id));

  if (input.splits && input.splits.length > 0) {
    // Custom amounts: validate each targets a real member or a group guest
    // (not both) + that they sum to the total.
    for (const s of input.splits) {
      if (s.profileId && s.guestId) {
        throw new Error("Split targets a member or guest, not both");
      }
      if (s.profileId && !memberIds.has(s.profileId)) {
        throw new Error("Split member is not in the group");
      }
      if (s.guestId && !guestIds.has(s.guestId)) {
        throw new Error("Split guest is not in the group");
      }
      if (!s.profileId && !s.guestId) {
        throw new Error("Split has no member or guest");
      }
      if (!(s.amount >= 0)) throw new Error("Split amount invalid");
    }
    const sum = input.splits.reduce((a, s) => a + s.amount, 0);
    if (Math.abs(sum - amount) >= 1) {
      throw new Error("Split amounts must sum to the total");
    }
    return input.splits.filter((s) => s.amount > 0);
  }

  // Equal split among the picked members + guests (default: all members).
  const pickedMembers = [...new Set(input.participantIds ?? [])].filter((pid) =>
    memberIds.has(pid),
  );
  const pickedGuests = [...new Set(input.guestParticipantIds ?? [])].filter(
    (gid) => guestIds.has(gid),
  );
  const targets: { profileId?: string; guestId?: string }[] =
    pickedMembers.length + pickedGuests.length > 0
      ? [
          ...pickedMembers.map((profileId) => ({ profileId })),
          ...pickedGuests.map((guestId) => ({ guestId })),
        ]
      : [...memberIds].map((profileId) => ({ profileId }));
  const base = Math.floor(amount / targets.length);
  const remainder = amount - base * targets.length;
  return targets.map((t, i) => ({
    ...t,
    amount: base + (i === 0 ? remainder : 0),
  }));
}
