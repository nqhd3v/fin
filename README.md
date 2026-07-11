# fin

> **This project was ~95% vibe-coded with [Claude Code](https://claude.com/claude-code).** The human wrote the prompts, made the product decisions, and did the occasional manual tweak — Claude wrote the code. Read it with that in mind.

A personal + group expense tracker built around one idea: **logging a transaction should take seconds**. Tap an icon for what you spent on (coffee, lunch, transport…), the amount and description autofill, adjust if needed, submit. AI features (receipt scanning, spending summaries) fill in the rest.

## What it does

- **Quick log** — a grid of tappable purposes (your own presets) that open the transaction dialog prefilled.
- **Funds** — track money across the places it actually lives: bank accounts, e-wallets, cash. Every transaction moves money in/out of a fund, so per-account balances stay correct. Balances can be hidden with one tap for privacy.
- **Manual entry** — full dialog for income / outcome / transfer with category, purpose, fund, and date.
- **Groups** — shared workspaces with a single pool fund. Members contribute, spend from the pool, split spends across participants, and settle reimbursements (pool → member → accepted into a personal fund). Per-member analytics show who contributed and who spent.
- **Receipt scan** — snap an invoice and Gemini extracts amount, merchant, and description into an editable preview.
- **Admin** — user and group management: search, block groups, reset data. Gated by `Profile.role === ADMIN`.
- **Recurring rules & AI spending summaries** — modeled/planned; see [CLAUDE.md](./CLAUDE.md) for current status.

Full product and data-model documentation lives in [CLAUDE.md](./CLAUDE.md).

## Stack

Next.js 16 (App Router) · React 19 · Supabase (auth + Postgres) · Prisma 7 (pg adapter) · Tailwind 4 + shadcn/radix · react-hook-form + yup.

## Quick start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier is fine) — provides both auth and the Postgres database.

### 2. Install

```bash
npm install
```

### 3. Environment

Create `.env` in the project root:

```bash
# Postgres (Supabase → Project Settings → Database)
DATABASE_URL="postgresql://..."      # pooled connection string
DIRECT_URL="postgresql://..."        # direct connection (used by Prisma)

# Supabase auth (Project Settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://<project>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="..."

# Receipt scanning (optional — feature degrades gracefully without it)
GEMINI_API_KEY="..."
GEMINI_MODEL="gemini-2.5-flash"      # optional override
```

### 4. Database

```bash
npx prisma db push      # apply schema to the database
npx prisma generate     # generate the Prisma client
```

> ⚠️ Use `db push`, **not** `prisma migrate dev` — the local migration history has drifted from the remote database and `migrate dev` will want a destructive reset. After a `db push`, restart the dev server (Next caches the generated Prisma client).

Then run the contents of [`lib/sql/setup.sql`](./lib/sql/setup.sql) in the Supabase SQL editor. It creates the auth triggers (auto-create a `Profile` on signup, clean up on delete) and the row-level security policies.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:6060](http://localhost:6060) (note: port **6060**, not 3000). Register an account, confirm the email, and start logging.

To use the admin pages, promote your user directly in Supabase: set `Profile.role = 'ADMIN'` for your row.

## Project layout

```
app/            routes (App Router) — (auth) login/register, (app) main app, admin
components/     atomic design: atoms (shadcn) / molecules / organisms
handlers/       server actions ("use server") — all DB access lives here
lib/            auth helpers, Supabase clients, Prisma client, utilities
prisma/         schema.prisma — the data model
lib/sql/        setup.sql — Supabase triggers + RLS policies
```

Conventions (forms, dialogs, styling, ownership rules) are documented in [CLAUDE.md](./CLAUDE.md) — read it before contributing.

## Scripts

| Command               | What it does                            |
| --------------------- | --------------------------------------- |
| `npm run dev`         | dev server on port 6060                 |
| `npm run build`       | production build                        |
| `npm run build:prod`  | `prisma generate` + build (for deploys) |
| `npm run lint`        | eslint                                  |
| `npm run db:generate` | regenerate Prisma client                |
