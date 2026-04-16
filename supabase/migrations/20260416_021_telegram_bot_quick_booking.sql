-- Migration 021: Telegram bot quick booking state.

CREATE TABLE IF NOT EXISTS telegram_bot_sessions (
  telegram_account_id UUID PRIMARY KEY REFERENCES telegram_accounts(id) ON DELETE CASCADE,
  active_provider_id  UUID REFERENCES providers(id) ON DELETE SET NULL,
  pending_booking     JSONB,
  pending_expires_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS telegram_bot_sessions_updated_at ON telegram_bot_sessions;

CREATE TRIGGER telegram_bot_sessions_updated_at
  BEFORE UPDATE ON telegram_bot_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_telegram_bot_sessions_provider
  ON telegram_bot_sessions(active_provider_id);
