-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 010: Safe Model Refactor — add reference ID columns
-- Strategy: add nullable FK columns alongside existing text columns
--           old text columns stay intact for backwards compatibility
--           backfill can be done separately once reference data is seeded
-- ─────────────────────────────────────────────────────────────────────────────

-- ── providers ─────────────────────────────────────────────────────────────────
ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS country_id  uuid REFERENCES ref_countries(id),
  ADD COLUMN IF NOT EXISTS region_id   uuid REFERENCES ref_regions(id),
  ADD COLUMN IF NOT EXISTS city_id     uuid REFERENCES ref_cities(id);

-- ── provider_services ─────────────────────────────────────────────────────────
ALTER TABLE provider_services
  ADD COLUMN IF NOT EXISTS category_id    uuid REFERENCES ref_categories(id),
  ADD COLUMN IF NOT EXISTS subcategory_id uuid REFERENCES ref_subcategories(id),
  ADD COLUMN IF NOT EXISTS currency_id    uuid REFERENCES ref_currencies(id);

-- ── provider_links ─────────────────────────────────────────────────────────────
ALTER TABLE provider_links
  ADD COLUMN IF NOT EXISTS link_type_id uuid REFERENCES ref_link_types(id);

-- ── Indexes for FK lookups ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS providers_country_id_idx    ON providers(country_id);
CREATE INDEX IF NOT EXISTS providers_region_id_idx     ON providers(region_id);
CREATE INDEX IF NOT EXISTS providers_city_id_idx       ON providers(city_id);
CREATE INDEX IF NOT EXISTS provider_services_cat_idx   ON provider_services(category_id);
CREATE INDEX IF NOT EXISTS provider_links_type_idx     ON provider_links(link_type_id);
