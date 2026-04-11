-- Migration 005: Telegram Bot Core
-- Depends on: 001 (set_updated_at), 002 (accounts), 003 (providers)

CREATE TYPE telegram_role AS ENUM ('owner', 'assistant', 'spouse', 'child', 'partner', 'other');
CREATE TYPE telegram_account_status AS ENUM ('pending', 'linked', 'unlinked', 'blocked');
CREATE TYPE actor_type AS ENUM ('web', 'telegram');

-- Telegram accounts linked to a provider
CREATE TABLE telegram_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  telegram_user_id    BIGINT NOT NULL UNIQUE,
  telegram_username   TEXT,
  telegram_first_name TEXT,
  telegram_last_name  TEXT,
  telegram_role       telegram_role NOT NULL DEFAULT 'other',
  status              telegram_account_status NOT NULL DEFAULT 'pending',
  linked_at           TIMESTAMPTZ,
  unlinked_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER telegram_accounts_updated_at
  BEFORE UPDATE ON telegram_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_telegram_accounts_provider ON telegram_accounts(provider_id);
CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(telegram_user_id);

-- One-time tokens for linking Telegram to a provider
CREATE TABLE telegram_link_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_telegram_link_tokens_hash ON telegram_link_tokens(token_hash);
CREATE INDEX idx_telegram_link_tokens_provider ON telegram_link_tokens(provider_id);

-- Activity log for all actions
CREATE TABLE activity_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  actor_type          actor_type NOT NULL,
  actor_account_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  telegram_account_id UUID REFERENCES telegram_accounts(id) ON DELETE SET NULL,
  action_type         TEXT NOT NULL,
  target_type         TEXT,
  target_id           TEXT,
  payload_json        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_provider ON activity_logs(provider_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
