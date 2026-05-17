# Ledger Noir

Ledger Noir is a local-first personal finance app built with Expo and React Native. It tracks income, expenses, category budgets, and receipt attachments with offline-first SQLite storage and optional Supabase backup/sync.

## Features

- Email/password authentication with Supabase Auth.
- Secure auth session persistence with Expo SecureStore.
- Local-first SQLite data for fast offline usage.
- Income and expense categories with seeded defaults and custom categories.
- Transaction create/edit/delete flows with month, type, category, and note filtering.
- Monthly dashboard with income, expense, balance, recent transactions, top spending category, and budget pressure.
- Monthly category budgets with used, remaining, and near-limit/over-budget states.
- Receipt image attachments from camera or gallery, copied into app-owned storage.
- Supabase sync for categories, transactions, budgets, and private receipt backups.
- Owner-scoped Supabase Row Level Security and private receipt Storage policies.
- Uniwind/Tailwind styling with the Ledger Noir design system.

## Tech stack

- Expo SDK 54
- React Native 0.81
- Expo Router
- TypeScript
- Expo SQLite
- Expo SecureStore
- Supabase Auth, Postgres, Storage, and RLS
- Uniwind + Tailwind CSS v4
- React Hook Form + Zod

## Project structure

```txt
app/                    Expo Router screens and route groups
src/auth/               Auth provider and session setup
src/db/                 SQLite connection, migrations, seed data, smoke tests
src/categories/         Category local/remote data modules
src/transactions/       Transaction local/remote data modules
src/budgets/            Budget local/remote data modules
src/attachments/        Receipt attachment local/remote modules
src/dashboard/          Dashboard summary queries
src/sync/               Local-to-remote sync and backup status
src/components/ui/      Shared UI primitives
docs/                   Product, design, API, and validation docs
supabase/migrations/    Supabase schema, RLS, Storage, and auth bootstrap migrations
scripts/                Local validation scripts
```

## Requirements

- Node.js compatible with the installed Expo toolchain.
- npm.
- Expo CLI via `npx expo`.
- A Supabase project for auth, database, storage, and sync features.
- iOS Simulator, Android Emulator, or a physical device with a development build.

## Environment variables

Create `.env.local` in the project root:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

For the Supabase RLS validation script, also add two development-only test users:

```env
SUPABASE_TEST_USER_A_EMAIL=your.email+fintrack-a@example.com
SUPABASE_TEST_USER_A_PASSWORD=your-password
SUPABASE_TEST_USER_B_EMAIL=your.email+fintrack-b@example.com
SUPABASE_TEST_USER_B_PASSWORD=your-password
```

Do not commit real `.env` files. They are ignored by `.gitignore`; commit only safe examples such as `.env.example` if needed.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Apply the Supabase migrations from `supabase/migrations/` to your Supabase project.

3. Make sure email/password auth is enabled in Supabase. For local validation, either disable email confirmation or manually confirm the two test users.

4. Start the app:

   ```bash
   npm start
   ```

5. Open the app in a development build, Android emulator, iOS simulator, or web as needed.

## Scripts

```bash
npm start                 # Start Expo
npm run android           # Build/run Android development app
npm run ios               # Build/run iOS development app
npm run web               # Start Expo web
npm run lint              # Run Expo lint
npm run validate:sqlite   # Validate local SQLite schema behavior
npm run validate:dashboard # Validate dashboard summary calculations
npm run validate:budgets  # Validate budget calculations and constraints
npm run validate:supabase # Validate Supabase RLS and private receipt policies
```

## Supabase backend

The backend contract is documented in [`docs/api-contract.md`](./docs/api-contract.md). The migrations create:

- `profiles`
- `categories`
- `transactions`
- `budgets`
- `transaction_attachments`
- private `receipts` Storage bucket
- owner-scoped RLS policies
- server-side profile bootstrap trigger for new auth users

The app uses the anon key only. No service-role key is required in the mobile app or validation script.

## Local-first sync model

SQLite is the immediate source of truth for the UI. User changes are written locally first, marked with sync/upload status, and then backed up to Supabase when possible.

Sync order follows the documented dependency order:

1. Categories
2. Transactions
3. Budgets
4. Receipt attachments after their parent transaction is synced

Soft deletes are synced with `deleted_at`; rows are not hard-deleted during normal app flows.

## Security notes

- Keep `.env.local` and all real credentials out of Git.
- Use only `EXPO_PUBLIC_SUPABASE_ANON_KEY` in the app; never put service-role keys in client code.
- Receipt files are stored in a private Supabase Storage bucket under user-scoped paths.
- Supabase RLS policies are designed so users can access only their own records and receipt files.
