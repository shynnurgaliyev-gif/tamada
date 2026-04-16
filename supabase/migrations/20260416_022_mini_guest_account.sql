-- Migration 022: explicit Mini App account creation
-- A verified Telegram owner can exist before the first provider profile is created.

ALTER TABLE telegram_accounts
  ALTER COLUMN provider_id DROP NOT NULL;

ALTER TABLE telegram_accounts
  DROP CONSTRAINT IF EXISTS telegram_accounts_provider_id_fkey;

ALTER TABLE telegram_accounts
  ADD CONSTRAINT telegram_accounts_provider_id_fkey
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL;
