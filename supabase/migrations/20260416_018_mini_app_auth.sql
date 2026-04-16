-- Migration 018: Verified Telegram Mini App sessions

CREATE TABLE IF NOT EXISTS telegram_mini_sessions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_account_id UUID NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE,
  session_token_hash  TEXT NOT NULL UNIQUE,
  telegram_user_id    BIGINT NOT NULL,
  role                telegram_role NOT NULL,
  expires_at          TIMESTAMPTZ NOT NULL,
  revoked_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_mini_sessions_hash
  ON telegram_mini_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_telegram_mini_sessions_account
  ON telegram_mini_sessions(telegram_account_id, expires_at);

CREATE INDEX IF NOT EXISTS idx_telegram_mini_sessions_expires
  ON telegram_mini_sessions(expires_at)
  WHERE revoked_at IS NULL;
