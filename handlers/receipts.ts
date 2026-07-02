"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUserId } from "@/lib/auth";
import { RECEIPTS_BUCKET } from "@/lib/receipts";
import { parseInvoice, type ParsedInvoice } from "@/handlers/gemini";

type Result<T> = ({ ok: true } & T) | { ok: false; errorMessage: string };

/** A path must live under the caller's own folder — guards against reading
 *  another user's uploads even though the Prisma role bypasses storage RLS. */
function ownsPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`);
}

/**
 * Read an already-uploaded receipt image from storage and ask Gemini to parse
 * it. The client uploads the image first (browser Supabase client → own folder),
 * then calls this with the returned path.
 */
export const scanReceipt = async (
  path: string,
): Promise<Result<{ data: ParsedInvoice }>> => {
  try {
    const userId = await requireUserId();
    if (!ownsPath(path, userId)) {
      return { ok: false, errorMessage: "Receipt not found" };
    }

    const sb = await createClient();
    const { data: blob, error } = await sb.storage
      .from(RECEIPTS_BUCKET)
      .download(path);
    if (error || !blob) {
      return { ok: false, errorMessage: error?.message || "Receipt not found" };
    }

    const mimeType = blob.type || "image/jpeg";
    const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

    const parsed = await parseInvoice(base64, mimeType);
    if (!parsed.ok) return parsed;
    return { ok: true, data: parsed.data };
  } catch (e) {
    console.error("Error scanning receipt:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};

/** Short-lived signed URL so a saved receipt can be viewed from its entry. */
export const receiptSignedUrl = async (
  path: string,
): Promise<Result<{ url: string }>> => {
  try {
    const userId = await requireUserId();
    if (!ownsPath(path, userId)) {
      return { ok: false, errorMessage: "Receipt not found" };
    }
    const sb = await createClient();
    const { data, error } = await sb.storage
      .from(RECEIPTS_BUCKET)
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      return { ok: false, errorMessage: error?.message || "Receipt not found" };
    }
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    console.error("Error signing receipt url:", e);
    return { ok: false, errorMessage: (e as Error).message };
  }
};
