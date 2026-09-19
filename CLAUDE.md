@AGENTS.md

# Fin — Finance Management Tool

Personal + group expense tracker with AI-powered spending summaries.

## Purpose

Make logging everyday spending as fast as one tap. The user opens the app,
taps an icon for what they spent on (coffee, breakfast, lunch, transport…),
the amount field and a default description autofill, they adjust if needed and
submit. Done in seconds. Periodically (weekly / monthly) the app sends the
user's transactions to Claude to generate a plain-language summary of where
their money went.

Two modes share the same fast-logging core:

### Personal mode

- Quick-log via a grid of action icons (a.k.a. **Transaction Purposes**).
  Tapping a purpose opens the transaction dialog prefilled (amount +
  description + fund); quick-log is outcome-only and skips category.
- Manual full entry via the same dialog ("New" button): pick type
  (income/outcome/transfer), amount, description, **fund**, category,
  purpose, date/time.
- **Funds** (= `TransactionSource`): the real places money lives — bank
  accounts, e-wallets (e.g. Momo), cash. Every transaction selects a fund so
  per-account balances stay correct. This is the core reason the app exists:
  managing money across many sources. A Funds card shows each balance + total.
- **Recurring transactions**: user-defined periodic entries (salary, rent,
  subscriptions). A scheduler auto-creates the transaction at each occurrence;
  the generated entry starts **unconfirmed** and the user marks it "happened"
  (or it can be paused). Cadence examples: "2nd-to-last day of month" (salary),
  "1st of month" (rent).
- Each user only sees and edits **their own** transactions, funds, and rules.
- AI summary of recent spending (last week / month) on a schedule.

### Team / group mode  *(implemented — `handlers/groups.ts`, `app/(app)/groups`)*

A shared **Group** workspace. Differs from personal mode in one key way: a group
does **not** use personal funds — it has **one shared "pool" fund**.

- **Create + join** — owner creates a group (name + optional `passcode`). Members
  **self-join** by group ID + passcode (owner hits "Invite" to copy the ID and
  shares it). No email invites. Owner can remove members; members can leave
  (owner can't leave — must delete). Delete removes the pool + group txns.
- **One pool fund per group** — auto-created on `createGroup` (`"<name> pool"`,
  a `TransactionSource` with `groupId` set). All money flows through it.
  `getGroupDetail` **auto-backfills** a pool for older groups missing one.
  Personal `listFunds` excludes group pools (`groupId: null` filter).
- **Group transactions** (group-mode `transaction-dialog.tsx` + quick-log):
  - **Contribute** (INCOME) → pool balance ↑.
  - **Spend** (OUTCOME) with a **Pay to** destination:
    - *External / store* → pool ↓. Free-text description (manual) or quick-log
      purpose name (quick). Has a **"Used by"** multi-select (default all
      members) — the spend is split across only those members in analytics.
    - *A member* → **reimbursement** (see below).
  - Transfers are rejected in groups.
- **Reimbursements** (pool → a member, e.g. a member fronted cash):
  - Created confirmed immediately: a TRANSFER (`payeeId` = recipient,
    `reimbursementStatus = PENDING`), **pool debited now**, shown in the shared
    feed (`Geek → Geek2 …`) for transparency.
  - The **payee** sees it in their own pending card and decides:
    - **Accept** → picks one of *their* personal funds; that fund ↑ and a
      **personal INCOME** transaction is written (`Reimbursement from <group>`)
      so they can trace it later. Status → `ACCEPTED`.
    - **Reject** → status `REJECTED`, label only — pool stays debited, their
      personal balance untouched.
  - Counts as group "spent" in all statuses (pool was debited), attributed to
    the payee in per-member analytics.
- **Per-member analytics** — income (contributed) vs outcome (spent), with
  shared spends split across their `Participants` and reimbursements attributed
  to the payee. Pool balance card = contributed − spent.
- **Shared feed** — all confirmed group transactions, visible to every member;
  each member still edits only their own. Pending reimbursements appear in the
  feed too (with status); only the payee can act on theirs.
- **Admin block** — an admin can block a group (`blockedReason`); members then
  see the reason instead of the group, and logging is rejected server-side.

### Admin mode  *(implemented — `handlers/admin.ts`, `app/(app)/admin`)*

Gated by `Profile.role === ADMIN` (`isAdmin()` / `requireAdmin()` in
`lib/auth.ts`; page redirects non-admins; nav link shown only to admins).
- **Users** — list all profiles with data counts + email (from `auth.users`),
  search, edit name/role (can't self-demote), **reset account data** (wipe a
  user's txns/funds/purposes/rules, keep the account).
- **Groups** — list all groups (counts only, **no money figures**), search,
  **block/unblock** with a reason, **reset group data** (delete its txns + zero
  the pool). Promote a user to ADMIN via the role dropdown (first admin set in
  Supabase directly).

## Data model (Prisma — `prisma/schema.prisma`)

- **Profile** — app user, 1:1 with Supabase auth user (`id` is the auth UUID).
  `role` (USER / ADMIN). Email lives in `auth.users` (not modeled) — pulled via
  `$queryRaw` when needed.
- **Group** — a shared workspace. Has one owner (`ownerId`) and many members
  (`groupMembers`). Optional `passcode`. `blockedReason` (null = active; set by
  an admin, shown to members). Has one pool `TransactionSource` (`groupId` set).
- **Transaction** — one logged entry. `type` (INCOME / OUTCOME / TRANSFER),
  `category` (ESSENTIAL / INCIDENTAL / NULL), `amount`, optional `description`,
  `authorId` (who logged it), optional `groupId` (null = personal),
  optional `purposeId`, `fromId` / `toId` (the fund money leaves / lands in).
  `confirmed` (false = auto-generated, awaiting user confirmation),
  `recurringId` (set when generated by a rule), `occurredAt` (when money moved).
  Group reimbursement fields: `payeeId` (recipient member) +
  `reimbursementStatus` (PENDING / ACCEPTED / REJECTED; null otherwise).
  `Participants` (M2M → Profile) = members who used a group spend (for the
  analytics split; empty falls back to all members).
- **TransactionPurpose** — the tappable quick-log preset, owned per user
  (`ownerId`). Quick-log config lives here: `icon` (key into
  `lib/quick-icons.tsx`), `defaultAmount`, `category`, `sortOrder`. A purpose
  with an `icon` shows as a tile; purposes auto-created from transactions leave
  these null and appear only in the dialog's purpose picker. Managed via the
  grid's Edit mode (`quick-log-purpose-dialog.tsx`).
- **TransactionSource** (a "fund") — a bank account / e-wallet / cash, owned
  per user (`ownerId`). `type` (BANK / EWALLET / CASH), cached `balance`,
  optional `hint` (e.g. "•• 4821"). An OUTCOME uses it as `fromId`, INCOME as
  `toId`, TRANSFER moves between two. **`groupId`** set = a group **pool** fund
  (one per group, shared) rather than a personal fund.
- **RecurringRule** — a periodic transaction template. `type`, `category`,
  `amount`, `sourceId`, `purposeId`, cadence (`anchor` ∈ DAY_OF_MONTH /
  SECOND_TO_LAST_DAY / LAST_DAY / WEEKLY, plus `dayValue`), `nextRunAt`,
  `active`. Generated Transactions link back via `recurringId`.

## Ownership & access rules

- Personal transactions: visible/editable only by their `authorId`.
- Group transactions: visible to all group members; editable only by author.
- TransactionPurposes are per-user; each member curates their own quick-log set.
- Row-Level Security is required on these tables (see schema comments,
  `lib/sql/setup.sql`).

## AI summaries

- Aggregate a user's (or group's) transactions over a period and send to Claude
  for a natural-language summary: top categories, trends, notable changes.
- Use the latest Claude model (e.g. `claude-opus-4-8`). See `/claude-api`.
- Triggered on a schedule (weekly/monthly); summary surfaced in-app and/or sent
  out (email/notification).

## Suggested future features

- Budgets per category/purpose with overspend alerts.
- Multi-currency + FX conversion.
- Transfer between own funds with one entry (already modeled via TRANSFER).
- Group settle-up ("who owes whom") like Splitwise.
- Export (CSV / PDF) of a period's transactions.
- Receipt photo attach + OCR autofill of amount.
- Natural-language quick add ("coffee 45k") parsed into a transaction.
- Savings goals with progress tracking.

## Stack

Next.js 16 (App Router) · React 19 · Supabase auth (SSR) · Prisma 7 + Postgres
(pg adapter) · Tailwind 4 + shadcn/radix · react-hook-form + yup · sonner.
Components follow atomic design: `components/atoms|molecules|organisms`.
Server logic in `handlers/`. Auth gating in middleware (`proxy.ts` →
`lib/supabase/proxy.ts`).

## UI conventions

- **Prefer shadcn components** (add via `npx shadcn@latest add <name>` — `ui`
  alias resolves to `components/atoms`). Do not hand-roll a control that shadcn
  already provides. Date/time uses shadcn Calendar + Popover
  (`components/molecules/date-time-picker.tsx`), not a native input.
- **All forms use react-hook-form** via the `Form` molecule
  (`components/molecules/form.tsx`), which wires yup as the resolver. Use the
  bound fields: `FormInput`, `FormSelect`, `FormDateTime`, `FormSegmented`,
  `FormCombobox`, `FormAmount`, `FormCheckboxGroup` (multi-select toggle chips,
  value = `string[]`). Don't manage form field state with `useState`.
- **Confirmations use `ConfirmPopover`** (`components/molecules/confirm-popover.tsx`),
  not native `window.confirm` — a shadcn Popover with async-aware Confirm/Cancel.
  Used for all destructive actions (delete fund/rule/purpose, reset, block, etc.).
- Transaction create/edit goes through one dialog,
  `components/organisms/transaction-dialog.tsx` (`mode="quick" | "full"`), so it
  never pushes page layout around. Group mode is driven by props: `groupId`,
  `groupFund` (the pool → hides fund picker, swaps types to Spend/Contribute),
  `groupMembers` (enables "Pay to" reimbursement + "Used by" participants).
- **Dropdown-in-dialog**: `dialog.tsx`'s `onInteractOutside` ignores clicks while
  a Select/Popover popper is open (checks `[data-state='open']`), so closing a
  dropdown doesn't also close the dialog. When a `SelectTrigger` sits next to
  buttons, set its `size` prop (not an `h-*` class — the `data-[size]` selector
  outranks the class).
- **WIP nav badge**: `app-nav.tsx` items carry a `wip` flag → a Developer (Code)
  icon marks pages still under construction (currently Insights, Profile).
- Design language: monospace, sharp corners (`rounded-none`), grayscale,
  `ring-1 ring-foreground/10` borders, compact spacing. Mobile-first but
  responsive — sidebar on `md+`, bottom tab bar on mobile (`app-nav.tsx`).
- Handlers live in `handlers/` (`"use server"`), scope every query by
  `requireUserId()` (`lib/auth.ts`), and `revalidatePath("/")` after writes.
  Funds + transactions (manual/quick-log) are DB-backed; `createTransaction`
  updates fund balances atomically in a `$transaction` and auto-creates the
  purpose by name. Personal, group, and admin modules are all DB-backed. Only
  **recurring** still reads `lib/mock-data.ts` — wire it next.

## Schema migrations

The local Prisma migration history has drifted from the remote Supabase DB, so
`prisma migrate dev` wants a destructive reset. **Use `npx prisma db push`**
(then `npx prisma generate`) to apply schema changes non-destructively. After
`db push`, restart the dev server — Next caches the generated Prisma client in
memory and won't pick up new fields until restart (symptom: "Unknown field …").
First admin was promoted directly in Supabase (`Profile.role = 'ADMIN'`).

## Status / next steps

Done so far: Admin (users + groups), Group mode end-to-end (pool fund,
contribute/spend, "used by" even split + custom per-member amounts + VAT in the
transaction dialog, invite-link via `Group.inviteToken` → `/groups/join?token=`
skips passcode, reimbursement queue with accept→personal income /
reject→label-only, edit "used by" of past spends via `updateGroupSplits` — group owner only, owner can log for another member via `authorId`), Profile page (`handlers/profile.ts` — rename, data counts,
reset own personal data, sign out), ConfirmPopover, dropdown-in-dialog fix,
WIP nav.
Not yet built: AI summaries, Insights page, recurring DB wiring,
a global "pending reimbursements" indicator outside the group page.
