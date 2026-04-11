-- Migration 006: Subscription + Payment Core
-- Depends on: 001 (set_updated_at), 002 (accounts), 003 (providers)

CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'expiring', 'expired', 'blocked', 'cancelled');
CREATE TYPE payment_provider_type AS ENUM ('kaspi', 'other');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'expired', 'cancelled');

-- One active subscription per provider
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

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_subscriptions_provider ON subscriptions(provider_id);
CREATE INDEX idx_subscriptions_expires ON subscriptions(expires_at);

-- Payments linked to subscriptions
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

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_payments_provider ON payments(provider_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

-- Subscription event log
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
