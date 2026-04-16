-- Migration 019: Account-level subscription limits + related profiles setting

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS show_related_profiles BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS included_profile_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_profile_slots INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_active_profiles INT NOT NULL DEFAULT 3;

UPDATE subscriptions
SET included_profile_count = COALESCE(included_profile_count, 1),
    extra_profile_slots = COALESCE(extra_profile_slots, 0),
    max_active_profiles = COALESCE(max_active_profiles, 3);
