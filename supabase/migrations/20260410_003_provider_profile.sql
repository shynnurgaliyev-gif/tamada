-- Migration 003: Provider Profile Core
-- Depends on: 001 (set_updated_at), 002 (accounts)

CREATE TYPE provider_status AS ENUM ('active', 'inactive', 'sick', 'vacation', 'blocked');
CREATE TYPE publication_status AS ENUM ('draft', 'visible', 'hidden', 'suspended');
CREATE TYPE link_type AS ENUM ('instagram', 'whatsapp', 'telegram', 'tiktok', 'youtube', 'website', 'two_gis', 'map', 'other');

-- One account can own multiple provider profiles
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

CREATE TRIGGER providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_providers_account_id ON providers(account_id);
CREATE INDEX idx_providers_slug ON providers(slug);
CREATE INDEX idx_providers_visible ON providers(publication_status) WHERE publication_status = 'visible';

-- Services offered by a provider
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

CREATE TRIGGER provider_services_updated_at
  BEFORE UPDATE ON provider_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_provider_services_provider ON provider_services(provider_id);

-- Photos (max 5 per provider, enforced at app level)
CREATE TABLE provider_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id  UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_cover     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_photos_provider ON provider_photos(provider_id);

-- Social / geo links
CREATE TABLE provider_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  link_type   link_type NOT NULL,
  url         TEXT NOT NULL,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_provider_links_provider ON provider_links(provider_id);
