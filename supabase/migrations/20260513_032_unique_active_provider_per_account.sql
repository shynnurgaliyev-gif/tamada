-- Migration 032: One active provider per account (DB-level enforcement)
-- Final step of multi → single-profile consolidation. With UI cleanup done
-- (MiniSwitchSheet removed, "+ Новый" hidden when active profile exists),
-- this constraint locks the new invariant at the database level.
--
-- Partial uniqueness: only ACTIVE profiles (not archived, not pending delete)
-- count toward the limit. Archived profiles stay in the table for history.
--
-- ⚠️ Requires test data cleanup if any account currently has 2+ active
-- providers — wipe those rows manually before applying. No real users yet.

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_account_unique_active
  ON providers(account_id)
  WHERE archived_at IS NULL AND pending_delete_at IS NULL;

COMMENT ON INDEX idx_providers_account_unique_active IS
  'Single-profile model: each account can own at most one active provider. Archived profiles are excluded.';
