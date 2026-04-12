-- Migration 015: Backfill trial subscriptions for providers without active subscription
-- Fixes: providers with publication_status='visible' not appearing in search
-- because the search view requires EXISTS(SELECT 1 FROM subscriptions ...)

INSERT INTO subscriptions (account_id, provider_id, plan_code, status, starts_at, expires_at, trial_ends_at)
SELECT
  p.account_id,
  p.id,
  'trial',
  'trial',
  NOW(),
  NOW() + INTERVAL '30 days',
  NOW() + INTERVAL '30 days'
FROM providers p
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s
  WHERE (s.account_id = p.account_id OR s.provider_id = p.id)
    AND s.status NOT IN ('cancelled', 'expired', 'blocked')
    AND s.expires_at > NOW()
);
