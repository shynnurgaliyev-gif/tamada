-- Migration 032: One active provider per account (DB-level enforcement)
-- Final step of multi → single-profile consolidation. With UI cleanup done
-- (MiniSwitchSheet removed, "+ Новый" hidden when active profile exists),
-- this constraint locks the new invariant at the database level.
--
-- Partial uniqueness: only ACTIVE profiles (not archived, not pending delete)
-- count toward the limit. Archived profiles stay in the table for history.
--
-- ───────────────────────────────────────────────────────────────────────────
-- Step 1: Resolve pre-existing duplicates (test data with 2+ active providers
-- per account). Keep ONLY the most recent active provider per account; archive
-- the rest with a clear audit reason. Idempotent — re-running is safe.
--
-- Selection order: most recently updated wins; ties broken by created_at then
-- id (deterministic).

UPDATE providers
SET archived_at    = COALESCE(archived_at, NOW()),
    archive_reason = COALESCE(archive_reason, 'single_profile_consolidation_032')
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY account_id
      ORDER BY updated_at DESC, created_at DESC, id DESC
    ) AS rn
    FROM providers
    WHERE archived_at IS NULL AND pending_delete_at IS NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Now safe to create the partial UNIQUE index.

CREATE UNIQUE INDEX IF NOT EXISTS idx_providers_account_unique_active
  ON providers(account_id)
  WHERE archived_at IS NULL AND pending_delete_at IS NULL;

COMMENT ON INDEX idx_providers_account_unique_active IS
  'Single-profile model: each account can own at most one active provider. Archived profiles are excluded.';
