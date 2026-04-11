-- Migration 008: Search indexes + public search view
-- Depends on: 003 (providers, services, photos, links), 004 (calendar), 006 (subscriptions)

-- ---- Providers ----
CREATE INDEX idx_providers_search
  ON providers(publication_status, provider_status, is_featured, created_at DESC);

CREATE INDEX idx_providers_location
  ON providers(country_code, region, city);

-- ---- Services ----
CREATE INDEX idx_services_search
  ON provider_services(provider_id, category, is_active);

CREATE INDEX idx_services_price
  ON provider_services(provider_id, price_from)
  WHERE is_active = true AND price_from IS NOT NULL;

-- ---- Links ----
CREATE INDEX idx_links_type
  ON provider_links(provider_id, link_type);

-- ---- Calendar ----
CREATE INDEX idx_calendar_overlap
  ON calendar_entries(provider_id, starts_at, ends_at)
  WHERE status IN ('busy', 'blocked', 'tentative');

-- ---- Subscriptions ----
CREATE INDEX idx_subscriptions_visible
  ON subscriptions(provider_id, expires_at)
  WHERE status NOT IN ('cancelled', 'blocked');

-- ---- Public search view ----
-- Pre-joins cover photo, min price, categories, link flags
-- Subscription inner join ensures only paying/trial providers appear
CREATE VIEW public_providers_search AS
SELECT
  p.id,
  p.display_name,
  p.slug,
  p.bio,
  p.country_code,
  p.region,
  p.city,
  p.is_featured,
  p.is_verified,
  p.created_at,
  ph.storage_path                            AS cover_path,
  pr.min_price,
  pr.min_currency,
  cats.categories,
  COALESCE(lnk.has_instagram, false)         AS has_instagram,
  COALESCE(lnk.has_whatsapp,  false)         AS has_whatsapp,
  COALESCE(lnk.has_two_gis,   false)         AS has_two_gis
FROM providers p
INNER JOIN subscriptions s
  ON  s.provider_id = p.id
  AND s.status NOT IN ('cancelled', 'blocked')
  AND s.expires_at > NOW()
LEFT JOIN LATERAL (
  SELECT storage_path
  FROM   provider_photos
  WHERE  provider_id = p.id AND is_cover = true
  LIMIT  1
) ph ON true
LEFT JOIN LATERAL (
  SELECT
    MIN(price_from)    AS min_price,
    MIN(currency)      AS min_currency
  FROM provider_services
  WHERE provider_id = p.id
    AND is_active = true
    AND price_from IS NOT NULL
) pr ON true
LEFT JOIN LATERAL (
  SELECT array_agg(DISTINCT category::text) AS categories
  FROM   provider_services
  WHERE  provider_id = p.id AND is_active = true
) cats ON true
LEFT JOIN LATERAL (
  SELECT
    bool_or(link_type = 'instagram') AS has_instagram,
    bool_or(link_type = 'whatsapp')  AS has_whatsapp,
    bool_or(link_type = 'two_gis')   AS has_two_gis
  FROM provider_links
  WHERE provider_id = p.id
) lnk ON true
WHERE p.publication_status = 'visible'
  AND p.provider_status    = 'active';
