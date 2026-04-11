-- Migration 007: Notification Jobs + Logs
-- Depends on: 001 (set_updated_at), 003 (providers), 005 (telegram_accounts)

CREATE TYPE job_type AS ENUM ('event_reminder', 'subscription_reminder', 'calendar_stale_reminder');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'sent', 'failed', 'cancelled');
CREATE TYPE delivery_status AS ENUM ('sent', 'failed');

CREATE TABLE notification_jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id    UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  job_type       job_type NOT NULL,
  target_type    TEXT,
  target_id      TEXT,
  scheduled_at   TIMESTAMPTZ NOT NULL,
  status         job_status NOT NULL DEFAULT 'pending',
  attempt_count  INT NOT NULL DEFAULT 0,
  last_error     TEXT,
  payload_json   JSONB,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER notification_jobs_updated_at
  BEFORE UPDATE ON notification_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Dedup: only one active job per (job_type, target_id)
-- Failed jobs can be retried (new row), cancelled jobs are gone
CREATE UNIQUE INDEX idx_notification_jobs_dedup
  ON notification_jobs(job_type, target_id)
  WHERE status NOT IN ('cancelled', 'failed');

CREATE INDEX idx_notification_jobs_pending
  ON notification_jobs(scheduled_at)
  WHERE status = 'pending';

CREATE INDEX idx_notification_jobs_provider
  ON notification_jobs(provider_id);

CREATE TABLE notification_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id          UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  telegram_account_id  UUID REFERENCES telegram_accounts(id) ON DELETE SET NULL,
  job_id               UUID REFERENCES notification_jobs(id) ON DELETE SET NULL,
  notification_type    TEXT NOT NULL,
  delivery_status      delivery_status NOT NULL,
  message_text         TEXT,
  error_text           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_logs_provider ON notification_logs(provider_id);
CREATE INDEX idx_notification_logs_job ON notification_logs(job_id);
