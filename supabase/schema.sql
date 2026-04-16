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
  archived_at        TIMESTAMPTZ,
  archived_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  archive_reason     TEXT,
  pending_delete_at  TIMESTAMPTZ,
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

CREATE TYPE telegram_role AS ENUM ('owner', 'assistant', 'manager', 'spouse', 'child', 'partner', 'other');
CREATE TYPE telegram_account_status AS ENUM ('pending', 'linked', 'unlinked', 'blocked');
CREATE TYPE telegram_profile_access_status AS ENUM ('active', 'revoked', 'expired');
CREATE TYPE actor_type AS ENUM ('web', 'telegram');

CREATE TABLE telegram_accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id         UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  account_id          UUID REFERENCES accounts(id) ON DELETE CASCADE,
  telegram_user_id    BIGINT NOT NULL UNIQUE,
  telegram_username   TEXT,
  telegram_first_name TEXT,
  telegram_last_name  TEXT,
  telegram_role       telegram_role NOT NULL DEFAULT 'other',
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  status              telegram_account_status NOT NULL DEFAULT 'pending',
  linked_at           TIMESTAMPTZ,
  unlinked_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_telegram_primary_owner CHECK (is_primary = FALSE OR telegram_role = 'owner')
);

CREATE INDEX idx_telegram_accounts_provider ON telegram_accounts(provider_id);
CREATE INDEX idx_telegram_accounts_account ON telegram_accounts(account_id);
CREATE INDEX idx_telegram_accounts_user_id ON telegram_accounts(telegram_user_id);
CREATE UNIQUE INDEX idx_telegram_accounts_primary_owner
  ON telegram_accounts(account_id)
  WHERE is_primary = TRUE AND status = 'linked';

CREATE TABLE telegram_profile_access (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_account_id   UUID NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE,
  provider_id           UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  role                  telegram_role NOT NULL DEFAULT 'assistant',
  status                telegram_profile_access_status NOT NULL DEFAULT 'active',
  granted_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at            TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (telegram_account_id, provider_id)
);

CREATE INDEX idx_telegram_profile_access_provider ON telegram_profile_access(provider_id, status);
CREATE INDEX idx_telegram_profile_access_account ON telegram_profile_access(telegram_account_id, status);

CREATE TABLE telegram_link_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  invite_role telegram_role NOT NULL DEFAULT 'owner',
  created_by_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
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

CREATE TYPE ownership_transfer_status AS ENUM ('pending', 'accepted', 'cancelled', 'expired');

CREATE TABLE provider_ownership_transfer_requests (
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

CREATE INDEX idx_provider_transfer_provider_status ON provider_ownership_transfer_requests(provider_id, status);
CREATE INDEX idx_provider_transfer_to_account ON provider_ownership_transfer_requests(to_account_id, status);

-- ---- Migration 006: Subscription + Payment Core ----

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expiring', 'expired', 'blocked', 'cancelled');
CREATE TYPE payment_provider_type AS ENUM ('kaspi', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'expired', 'cancelled');

CREATE TABLE subscriptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  plan_code      TEXT NOT NULL DEFAULT 'basic',
  status         subscription_status NOT NULL DEFAULT 'trial',
  starts_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,
  trial_ends_at  TIMESTAMPTZ,
  grace_until    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

CREATE TABLE payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id        UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  subscription_id    UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_provider   payment_provider_type NOT NULL DEFAULT 'kaspi',
  invoice_id         TEXT,
  external_reference TEXT,
  amount             NUMERIC(12,2) NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'KZT',
  status             payment_status NOT NULL DEFAULT 'pending',
  phone              TEXT,
  payload_json       JSONB,
  paid_at            TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_provider ON payments(provider_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

CREATE TABLE subscription_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  payload_json    JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscription_events_provider ON subscription_events(provider_id);
CREATE INDEX idx_subscription_events_subscription ON subscription_events(subscription_id);
