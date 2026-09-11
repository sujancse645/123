# Supabase rollout

This directory extends the existing `sql/initialization_query.sql` schema. Never rerun that bootstrap file against a populated database.

## Existing database

1. Take a database backup.
2. Apply `migrations/` in filename order with the Supabase CLI or dashboard migration runner.
3. Run `select public.refresh_contract_statuses(current_date);` once as the service role.
4. Schedule that RPC daily using Supabase Cron or another trusted server scheduler.
5. Run `tests/rls_policy_regression.sql` in a staging copy.
6. Link the CLI and run `npm run db:types` so types reflect the deployed database exactly.

All migrations are additive and preserve the original tables. The checked-in TypeScript file is a generated-compatible snapshot for offline development; the linked CLI command remains the source of truth for a deployed project.

## Fresh database

Run `sql/initialization_query.sql` once, then apply these migrations in order. `seed.sql` is optional demonstration data and expects at least one company from the original seed.

## Secrets

Keep `SUPABASE_SERVICE_ROLE_KEY` and `BANK_DATA_ENCRYPTION_KEY` on the server. Browser code receives only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the non-secret demo company ID.
