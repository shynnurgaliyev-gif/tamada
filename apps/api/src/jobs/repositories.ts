import type { Db } from '../db';

export type JobType = 'event_reminder' | 'subscription_reminder' | 'calendar_stale_reminder';
export type JobStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled';
export type DeliveryStatus = 'sent' | 'failed';

export type NotificationJob = {
  id: string;
  provider_id: string;
  job_type: JobType;
  target_type: string | null;
  target_id: string | null;
  scheduled_at: Date;
  status: JobStatus;
  attempt_count: number;
  last_error: string | null;
  payload_json: unknown;
  sent_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type NotificationLog = {
  id: string;
  provider_id: string;
  telegram_account_id: string | null;
  job_id: string | null;
  notification_type: string;
  delivery_status: DeliveryStatus;
  message_text: string | null;
  error_text: string | null;
  created_at: Date;
};

// ---- Jobs ----

export async function insertJobIfNotExists(db: Db, data: {
  providerId: string;
  jobType: JobType;
  targetType: string;
  targetId: string;
  scheduledAt: Date;
  payloadJson: object;
}): Promise<void> {
  await db`
    INSERT INTO notification_jobs
      (provider_id, job_type, target_type, target_id, scheduled_at, payload_json)
    VALUES
      (${data.providerId}, ${data.jobType}, ${data.targetType}, ${data.targetId},
       ${data.scheduledAt}, ${JSON.stringify(data.payloadJson)})
    ON CONFLICT DO NOTHING
  `;
}

export async function pickPendingJobs(db: Db, limit = 50): Promise<NotificationJob[]> {
  return db<NotificationJob[]>`
    UPDATE notification_jobs
    SET status = 'processing', attempt_count = attempt_count + 1
    WHERE id IN (
      SELECT id FROM notification_jobs
      WHERE status = 'pending' AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING *
  `;
}

export async function markJobSent(db: Db, id: string): Promise<void> {
  await db`
    UPDATE notification_jobs SET status = 'sent', sent_at = NOW() WHERE id = ${id}
  `;
}

export async function markJobFailed(db: Db, id: string, error: string): Promise<void> {
  await db`
    UPDATE notification_jobs SET status = 'failed', last_error = ${error} WHERE id = ${id}
  `;
}

export async function findRecentLogs(db: Db, providerId: string, limit = 20): Promise<NotificationLog[]> {
  return db<NotificationLog[]>`
    SELECT * FROM notification_logs
    WHERE provider_id = ${providerId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

export async function findAllRecentLogs(db: Db, limit = 50): Promise<NotificationLog[]> {
  return db<NotificationLog[]>`
    SELECT * FROM notification_logs
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
}

// ---- Logs ----

export async function insertLog(db: Db, data: {
  providerId: string;
  telegramAccountId?: string | undefined;
  jobId: string;
  notificationType: string;
  deliveryStatus: DeliveryStatus;
  messageText?: string | undefined;
  errorText?: string | undefined;
}): Promise<void> {
  await db`
    INSERT INTO notification_logs
      (provider_id, telegram_account_id, job_id, notification_type, delivery_status, message_text, error_text)
    VALUES
      (${data.providerId}, ${data.telegramAccountId ?? null}, ${data.jobId},
       ${data.notificationType}, ${data.deliveryStatus},
       ${data.messageText ?? null}, ${data.errorText ?? null})
  `;
}
