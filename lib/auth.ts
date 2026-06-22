import { createClient } from "@/lib/supabase/server";

/** Current authenticated user id (Supabase JWT subject), or throw. */
export async function requireUserId(): Promise<string> {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) throw new Error("Not authenticated");
  return id;
}
