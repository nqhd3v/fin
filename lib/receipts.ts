// Private Supabase Storage bucket for uploaded receipt/invoice images.
// Objects are keyed "<userId>/<uuid>.<ext>" so RLS can scope by folder.
export const RECEIPTS_BUCKET = "receipts";
