-- Migration 016: Multi-profile foundation
-- Safe preparation for several provider profiles per account, owner-level Telegram
-- identity, profile-scoped assistant access, archive, and future ownership transfer.

ALTER TYPE telegram_role ADD VALUE IF NOT EXISTS 'manager';

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT,
  ADD COLUMN IF NOT EXISTS pending_delete_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_providers_account_active
  ON providers(account_id)
  WHERE archived_at IS NULL AND pending_delete_at IS NULL;

ALTER TABLE telegram_accounts
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE telegram_accounts ta
SET account_id = p.account_id
FROM providers p
WHERE ta.provider_id = p.id
  AND ta.account_id IS NULL;

ALTER TABLE telegram_accounts
  ADD CONSTRAINT chk_telegram_primary_owner
  CHECK (is_primary = FALSE OR telegram_role = 'owner');

CREATE UNIQUE INDEX IF NOT EXISTS idx_telegram_accounts_primary_owner
  ON telegram_accounts(account_id)
  WHERE is_primary = TRUE AND status = 'linked';

CREATE INDEX IF NOT EXISTS idx_telegram_accounts_account
  ON telegram_accounts(account_id);

WITH first_linked AS (
  SELECT DISTINCT ON (account_id) id
  FROM telegram_accounts
  WHERE account_id IS NOT NULL
    AND status = 'linked'
  ORDER BY account_id, linked_at NULLS LAST, created_at ASC
)
UPDATE telegram_accounts ta
SET telegram_role = 'owner',
    is_primary = TRUE
FROM first_linked fl
WHERE ta.id = fl.id
  AND ta.is_primary = FALSE;

DO $$
BEGIN
  CREATE TYPE telegram_profile_access_status AS ENUM ('active', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS telegram_profile_access (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_account_id UUID NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE,
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  role                telegram_role NOT NULL DEFAULT 'assistant',
  status              telegram_profile_access_status NOT NULL DEFAULT 'active',
  granted_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  granted_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (telegram_account_id, provider_id)
);

CREATE TRIGGER telegram_profile_access_updated_at
  BEFORE UPDATE ON telegram_profile_access
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_telegram_profile_access_provider
  ON telegram_profile_access(provider_id, status);

CREATE INDEX IF NOT EXISTS idx_telegram_profile_access_account
  ON telegram_profile_access(telegram_account_id, status);

INSERT INTO telegram_profile_access (telegram_account_id, provider_id, role, status, granted_at)
SELECT id, provider_id, telegram_role, 'active', COALESCE(linked_at, created_at)
FROM telegram_accounts
WHERE status = 'linked'
ON CONFLICT (telegram_account_id, provider_id) DO UPDATE SET
  role = EXCLUDED.role,
  status = 'active',
  revoked_at = NULL,
  updated_at = NOW();

DO $$
BEGIN
  CREATE TYPE ownership_transfer_status AS ENUM ('pending', 'accepted', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS provider_ownership_transfer_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id              UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  from_account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  to_account_id            UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_phone                 TEXT,
  status                   ownership_transfer_status NOT NULL DEFAULT 'pending',
  requested_by_account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  accepted_at              TIMESTAMPTZ,
  cancelled_at             TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER provider_ownership_transfer_requests_updated_at
  BEFORE UPDATE ON provider_ownership_transfer_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_provider_transfer_provider_status
  ON provider_ownership_transfer_requests(provider_id, status);

CREATE INDEX IF NOT EXISTS idx_provider_transfer_to_account
  ON provider_ownership_transfer_requests(to_account_id, status);
