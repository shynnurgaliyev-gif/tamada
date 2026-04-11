-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 011: Account-level subscriptions
-- One subscription per account covers ALL provider profiles of that account.
-- Strategy: add account_id to subscriptions, make provider_id optional,
--           backfill account_id from providers table.
-- ─────────────────────────────────────────────────────────────────────────────

-- Add account_id to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;

-- Backfill: set account_id from the provider's account
UPDATE subscriptions s
SET account_id = p.account_id
FROM providers p
WHERE s.provider_id = p.id AND s.account_id IS NULL;

-- Make provider_id optional (subscription now lives at account level)
ALTER TABLE subscriptions ALTER COLUMN provider_id DROP NOT NULL;

-- Index for fast lookup by account
CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_id);

-- Same for payments: track which account triggered the payment
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE payments p2
SET account_id = pr.account_id
FROM providers pr
WHERE p2.provider_id = pr.id AND p2.account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);

-- subscription_events: make provider_id optional (events can be account-level)
ALTER TABLE subscription_events ALTER COLUMN provider_id DROP NOT NULL;

-- Add account_id to subscription_events
ALTER TABLE subscription_events
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES accounts(id) ON DELETE CASCADE;

UPDATE subscription_events se
SET account_id = p.account_id
FROM providers p
WHERE se.provider_id = p.id AND se.account_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sub_events_account ON subscription_events(account_id);
