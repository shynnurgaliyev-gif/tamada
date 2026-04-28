-- ── Migration 027: provider_links.updated_at ─────────────────────────────────
-- Aligns provider_links with the convention used by other domain tables
-- (providers, provider_services, accounts, …). Without it there's no way to
-- tell when a link row was last touched, which makes debugging "when did this
-- 2gis link change" impossible.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE provider_links
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS provider_links_set_updated_at ON provider_links;
CREATE TRIGGER provider_links_set_updated_at
  BEFORE UPDATE ON provider_links
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
