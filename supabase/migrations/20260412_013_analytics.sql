-- Migration 013: Contact reveals + provider analytics

-- contact_reveals: log every time a visitor opens contacts
CREATE TABLE contact_reveals (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id      UUID        NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  source_page      TEXT        NOT NULL DEFAULT 'profile'
                               CHECK (source_page IN ('profile', 'search', 'calendar')),
  selected_date    DATE,
  selected_time_from TIME,
  selected_time_to   TIME,
  viewer_session_id  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_contact_reveals_provider ON contact_reveals(provider_id);
CREATE INDEX idx_contact_reveals_created  ON contact_reveals(created_at);

-- provider_analytics_daily: aggregated daily stats per provider
CREATE TABLE provider_analytics_daily (
  id                 UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id        UUID    NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  date               DATE    NOT NULL,
  profile_views      INTEGER NOT NULL DEFAULT 0,
  contact_reveals    INTEGER NOT NULL DEFAULT 0,
  calendar_views     INTEGER NOT NULL DEFAULT 0,
  search_impressions INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at         TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (provider_id, date)
);

CREATE INDEX idx_analytics_daily_provider_date ON provider_analytics_daily(provider_id, date DESC);
