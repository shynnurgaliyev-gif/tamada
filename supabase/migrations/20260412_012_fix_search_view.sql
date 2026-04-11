-- Migration 012: Fix public_providers_search view for account-level subscriptions
-- After migration 011, subscriptions are account-level (account_id FK, provider_id nullable).
-- The old INNER JOIN on s.provider_id = p.id now misses all account-level subscriptions.

DROP VIEW IF EXISTS public_providers_search;

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
  AND p.provider_status    = 'active'
  AND EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE (s.account_id = p.account_id OR s.provider_id = p.id)
      AND s.status NOT IN ('cancelled', 'blocked')
      AND s.expires_at > NOW()
  );
