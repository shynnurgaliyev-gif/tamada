-- Migration 017: Assistant invite foundation

ALTER TABLE telegram_link_tokens
  ADD COLUMN IF NOT EXISTS invite_role telegram_role NOT NULL DEFAULT 'owner',
  ADD COLUMN IF NOT EXISTS created_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_link_tokens_provider_role
  ON telegram_link_tokens(provider_id, invite_role, expires_at);
