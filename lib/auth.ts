import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

/** Current authenticated user id (Supabase JWT subject), or throw. */
export async function requireUserId(): Promise<string> {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) throw new Error("Not authenticated");
  return id;
}

/** True if the current user's Profile has the ADMIN role. */
export async function isAdmin(): Promise<boolean> {
  try {
    const id = await requireUserId();
    const profile = await prisma.profile.findUnique({
      where: { id },
      select: { role: true },
    });
    return profile?.role === "ADMIN";
  } catch {
    return false;
  }
}

/** Current user id, but throws unless they are an ADMIN. */
export async function requireAdmin(): Promise<string> {
  const id = await requireUserId();
  const profile = await prisma.profile.findUnique({
    where: { id },
    select: { role: true },
  });
  if (profile?.role !== "ADMIN") throw new Error("Not authorized");
  return id;
}
