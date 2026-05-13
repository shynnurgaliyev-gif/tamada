-- Migration 029: Account identity + ECP verification foundation
-- Adds ФИО as mandatory, plus eGov ECP verification fields on accounts.
-- See: docs/obsidian/proposal-single-profile.md → "🪪 ФИО, регистрация, верификация личности"
--
-- This migration is ADDITIVE + trigger. No DROPs. providers.is_verified
-- stays in place — code transition happens in later sessions.

-- ---- 1. Backfill full_name for any accounts that don't have it ----
-- Use username as fallback (it's the only other human-readable identifier).
-- Users will be nudged to update to real ФИО at next login.

UPDATE accounts
SET full_name = COALESCE(full_name, username)
WHERE full_name IS NULL OR full_name = '';

-- ---- 2. Enforce NOT NULL on full_name ----

ALTER TABLE accounts
  ALTER COLUMN full_name SET NOT NULL;

-- ---- 3. Identity verification columns ----

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS identity_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS identity_locked_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_iin_hash    TEXT,
  ADD COLUMN IF NOT EXISTS verified_cert_serial TEXT;

-- ---- 4. Trigger: prevent full_name change once identity is locked ----
-- Once user verifies via eGov, full_name is frozen. To change it they must
-- first call "remove verification" (which clears identity_locked_at).
-- The cert_serial and iin_hash stay as history per design decision.

CREATE OR REPLACE FUNCTION prevent_locked_full_name_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow the case where this same UPDATE is unlocking the row
  -- (i.e. identity_locked_at being cleared in this statement).
  IF OLD.identity_locked_at IS NOT NULL
     AND NEW.identity_locked_at IS NOT NULL
     AND NEW.full_name IS DISTINCT FROM OLD.full_name THEN
    RAISE EXCEPTION 'full_name is locked after identity verification — clear identity_locked_at first'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_full_name_lock ON accounts;

CREATE TRIGGER accounts_full_name_lock
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION prevent_locked_full_name_change();

-- ---- 5. Comments ----

COMMENT ON COLUMN accounts.identity_verified_at IS
  'Timestamp of successful eGov ECP verification. NULL = not verified. Public profile "✓ Verified" badge is shown when this is not NULL.';

COMMENT ON COLUMN accounts.identity_locked_at IS
  'Once set, full_name cannot be changed until this is cleared (via "Remove verification" button). The remove action keeps verified_iin_hash and verified_cert_serial as history.';

COMMENT ON COLUMN accounts.verified_iin_hash IS
  'SHA-256 hash of the IIN from the verified ECP certificate. Never stored as plaintext (PII).';

COMMENT ON COLUMN accounts.verified_cert_serial IS
  'Serial number of the ECP certificate used at verification. Kept for audit and renewal tracking.';
