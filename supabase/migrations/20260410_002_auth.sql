-- Migration 002: Auth tables
-- Depends on: 001 (set_updated_at trigger function)

CREATE TYPE account_status AS ENUM ('pending_verification', 'active', 'blocked');
CREATE TYPE verification_purpose AS ENUM ('signup', 'reset_password');

-- Accounts: one per performer
CREATE TABLE accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          TEXT NOT NULL UNIQUE,
  phone             TEXT NOT NULL UNIQUE,
  phone_verified_at TIMESTAMPTZ,
  password_hash     TEXT NOT NULL,
  status            account_status NOT NULL DEFAULT 'pending_verification',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_accounts_phone ON accounts(phone);

-- Phone verification codes (raw code never stored, only hash)
CREATE TABLE phone_verification_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT NOT NULL,
  purpose       verification_purpose NOT NULL,
  code_hash     TEXT NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  attempt_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_verification_codes_phone_purpose
  ON phone_verification_codes(phone, purpose)
  WHERE used_at IS NULL;

-- Auth sessions
CREATE TABLE auth_sessions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  user_agent         TEXT,
  ip_address         TEXT,
  expires_at         TIMESTAMPTZ NOT NULL,
  revoked_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_sessions_account_id ON auth_sessions(account_id);
CREATE INDEX idx_auth_sessions_token
  ON auth_sessions(session_token_hash)
  WHERE revoked_at IS NULL;
