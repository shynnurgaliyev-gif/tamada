-- schema.sql — canonical reference of the full DB schema
-- Keep in sync with /supabase/migrations/
-- DO NOT run directly in production — use migrations

-- ---- Trigger ----

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---- Migration 001: stub ----

CREATE TABLE IF NOT EXISTS events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Migration 002: Auth ----

CREATE TYPE account_status AS ENUM ('pending_verification', 'active', 'blocked');
CREATE TYPE verification_purpose AS ENUM ('signup', 'reset_password');

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

-- ---- Migration 003: Provider Profile ----

CREATE TYPE provider_status AS ENUM ('active', 'inactive', 'sick', 'vacation', 'blocked');
CREATE TYPE publication_status AS ENUM ('draft', 'visible', 'hidden', 'suspended');
CREATE TYPE link_type AS ENUM ('instagram', 'whatsapp', 'telegram', 'tiktok', 'youtube', 'website', 'two_gis', 'map', 'other');

CREATE TABLE providers (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  display_name       TEXT NOT NULL,
  slug               TEXT NOT NULL UNIQUE,
  bio                TEXT,
  country_code       TEXT,
  region             TEXT,
  city               TEXT,
  district           TEXT,
  address_text       TEXT,
  timezone           TEXT NOT NULL DEFAULT 'Asia/Almaty',
  provider_status    provider_status    NOT NULL DEFAULT 'active',
  publication_status publication_status NOT NULL DEFAULT 'draft',
  is_featured        BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  subcategory TEXT,
  title       TEXT NOT NULL,
  description TEXT,
  price_from  NUMERIC(12,2),
  price_to    NUMERIC(12,2),
  currency    TEXT NOT NULL DEFAULT 'KZT',
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_cover     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE provider_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  link_type   link_type NOT NULL,
  url         TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---- Migration 004: Calendar Core ----

CREATE TYPE calendar_entry_status AS ENUM ('busy', 'free', 'tentative', 'blocked');

CREATE TABLE calendar_entries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id           UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,
  status                calendar_entry_status NOT NULL DEFAULT 'busy',
  title                 TEXT,
  notes                 TEXT,
  created_by_account_id UUID NOT NULL REFERENCES accounts(id),
  updated_by_account_id UUID REFERENCES accounts(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_calendar_entries_dates CHECK (starts_at < ends_at)
);

CREATE INDEX idx_calendar_entries_provider_id ON calendar_entries(provider_id);
CREATE INDEX idx_calendar_entries_range ON calendar_entries(provider_id, starts_at, ends_at);

CREATE TABLE calendar_entry_clients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_entry_id UUID NOT NULL UNIQUE REFERENCES calendar_entries(id) ON DELETE CASCADE,
  client_name       TEXT,
  client_phone      TEXT,
  event_type        TEXT,
  location_text     TEXT,
  price_amount      NUMERIC(12,2),
  currency          TEXT NOT NULL DEFAULT 'KZT',
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_entry_clients_entry ON calendar_entry_clients(calendar_entry_id);

-- ---- Migration 005: Telegram Bot Core ----

CREATE TYPE telegram_role AS ENUM ('owner', 'assistant', 'spouse', 'child', 'partner', 'other');
CREATE TYPE telegram_account_status AS ENUM ('pending', 'linked', 'unlinked', 'blocked');
CREATE TYPE actor_type AS ENUM ('web', 'telegram');

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

CREATE INDEX idx_telegram_accounts_provider ON telegram_accounts(provider_id);
CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(telegram_user_id);

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
