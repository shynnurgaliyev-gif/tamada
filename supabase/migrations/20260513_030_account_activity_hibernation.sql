-- Migration 030: Account activity tracking + profile hibernation status
-- Foundation for auto-hibernation: profile auto-hides from search after 90 days
-- of owner inactivity. Owner can reactivate with one click.
-- See: docs/obsidian/proposal-single-profile.md → "🌙 Авто-спячка профиля"
--
-- ADDITIVE only. Cron job and code-side changes (update view, middleware to
-- update last_active_at) happen in later sessions.

-- ---- 1. last_active_at on accounts ----
-- Updated by API middleware on every authenticated owner request.
-- (Helper actions don't update this — by design.)

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_accounts_last_active
  ON accounts(last_active_at);

-- ---- 2. New publication_status value: 'hibernated' ----
-- Set by cron job when owner has been inactive for 90+ days.
-- Excluded from public_providers_search (view updated in a later migration
-- when we also drop providers.is_verified).
-- Owner reactivates via UI → status returns to 'visible'.

ALTER TYPE publication_status ADD VALUE IF NOT EXISTS 'hibernated';

-- ---- 3. Comment ----

COMMENT ON COLUMN accounts.last_active_at IS
  'Last authenticated activity by the account owner. Updated on auth-pings, mini-app open, and write operations. Hibernation cron uses this to detect inactive accounts (>= 90 days).';
