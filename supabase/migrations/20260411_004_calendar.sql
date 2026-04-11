-- Migration 004: Calendar Core
-- Depends on: 001 (set_updated_at), 002 (accounts), 003 (providers)

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

CREATE TRIGGER calendar_entries_updated_at
  BEFORE UPDATE ON calendar_entries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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

CREATE TRIGGER calendar_entry_clients_updated_at
  BEFORE UPDATE ON calendar_entry_clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_calendar_entry_clients_entry ON calendar_entry_clients(calendar_entry_id);
