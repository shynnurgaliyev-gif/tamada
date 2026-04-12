-- Migration 014: Provider onboarding state

CREATE TABLE provider_onboarding (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id  UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  status       TEXT        NOT NULL DEFAULT 'in_progress'
                           CHECK (status IN ('in_progress', 'completed', 'skipped')),
  current_step INTEGER     NOT NULL DEFAULT 1,
  started_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (provider_id)
);

CREATE INDEX idx_provider_onboarding_provider ON provider_onboarding(provider_id);
