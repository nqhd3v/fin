CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
begin
  insert into public."Profile" (id, name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'name'
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_deleted_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
begin
  delete from public."Profile" where id = old.id;
  return old;
end;
$function$;

-- ---------------------------------------------------------------------------
-- Row-Level Security
--
-- NOTE: the app's Prisma connection uses a privileged role that BYPASSES RLS;
-- per-user scoping there is enforced in the handlers (ownerId / authorId
-- filters). These policies are defense-in-depth for any access made through the
-- Supabase client as the `authenticated` role. `auth.uid()` is the caller's
-- user id (matches Profile.id / *.ownerId / Transaction.authorId).
-- Idempotent: re-runnable (drop-then-create).
-- ---------------------------------------------------------------------------

-- Profile: a user can read and update only their own row. Inserts/deletes are
-- handled by the auth triggers above (SECURITY DEFINER).
ALTER TABLE public."Profile" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profile self read" ON public."Profile";
CREATE POLICY "Profile self read" ON public."Profile"
  FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "Profile self update" ON public."Profile";
CREATE POLICY "Profile self update" ON public."Profile"
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- TransactionSource (funds): owner-only, full access.
ALTER TABLE public."TransactionSource" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TransactionSource owner all" ON public."TransactionSource";
CREATE POLICY "TransactionSource owner all" ON public."TransactionSource"
  FOR ALL TO authenticated
  USING (auth.uid() = "ownerId")
  WITH CHECK (auth.uid() = "ownerId");

-- TransactionPurpose (quick-log presets): owner-only, full access.
ALTER TABLE public."TransactionPurpose" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "TransactionPurpose owner all" ON public."TransactionPurpose";
CREATE POLICY "TransactionPurpose owner all" ON public."TransactionPurpose"
  FOR ALL TO authenticated
  USING (auth.uid() = "ownerId")
  WITH CHECK (auth.uid() = "ownerId");

-- RecurringRule (periodic templates): owner-only, full access.
ALTER TABLE public."RecurringRule" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "RecurringRule owner all" ON public."RecurringRule";
CREATE POLICY "RecurringRule owner all" ON public."RecurringRule"
  FOR ALL TO authenticated
  USING (auth.uid() = "ownerId")
  WITH CHECK (auth.uid() = "ownerId");

-- Transaction: author-only for now. Group sharing (members can read a group's
-- transactions) is added with the Groups feature.
ALTER TABLE public."Transaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Transaction author all" ON public."Transaction";
CREATE POLICY "Transaction author all" ON public."Transaction"
  FOR ALL TO authenticated
  USING (auth.uid() = "authorId")
  WITH CHECK (auth.uid() = "authorId");

-- Group: owner-only for now. Member read/write policies arrive with the
-- Groups feature (they need the implicit membership join table).
ALTER TABLE public."Group" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Group owner all" ON public."Group";
CREATE POLICY "Group owner all" ON public."Group"
  FOR ALL TO authenticated
  USING (auth.uid() = "ownerId")
  WITH CHECK (auth.uid() = "ownerId");
