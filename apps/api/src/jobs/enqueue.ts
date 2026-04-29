import type { Db } from '../db';
import type { AppEnv } from '@octiqa/config';
import { insertJobIfNotExists } from './repositories';

// Convert local time (hour:00) on a given date to UTC, using the provider's timezone
function localHourToUTC(date: Date, hour: number, timezone: string): Date {
  const localDate = date.toLocaleDateString('sv-SE', { timeZone: timezone }); // YYYY-MM-DD
  // Find UTC offset by checking what hour noon UTC shows as in this timezone
  const refUTC = new Date(`${localDate}T12:00:00.000Z`);
  const localHourAtNoonUTC = parseInt(
    new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', hour12: false })
      .format(refUTC),
    10,
  );
  const offsetHours = localHourAtNoonUTC - 12; // positive = ahead of UTC
  const localTarget = new Date(`${localDate}T${String(hour).padStart(2, '0')}:00:00.000Z`);
  return new Date(localTarget.getTime() - offsetHours * 3600000);
}

type EntryRow = {
  id: string;
  provider_id: string;
  starts_at: Date;
  ends_at: Date;
  status: string;
  title: string | null;
  timezone: string;
};

type SubscriptionRow = {
  id: string;
  provider_id: string;
  expires_at: Date;
  status: string;
  timezone: string;
};

type ProviderStaleRow = {
  provider_id: string;
  timezone: string;
  last_update: Date | null;
};

export async function enqueueEventReminders(db: Db, morningHour: number): Promise<number> {
  const rows = await db<EntryRow[]>`
    SELECT ce.id, ce.provider_id, ce.starts_at, ce.ends_at, ce.status, ce.title,
           COALESCE(p.timezone, 'Asia/Almaty') AS timezone
    FROM calendar_entries ce
    JOIN providers p ON p.id = ce.provider_id
    WHERE ce.status IN ('busy', 'tentative')
      AND ce.starts_at > NOW()
    ORDER BY ce.starts_at ASC
  `;

  let count = 0;
  for (const row of rows) {
    const tz = row.timezone;
    const payload = { entry_id: row.id, status: row.status, title: row.title };

    const reminders: Array<{ suffix: string; scheduledAt: Date }> = [
      { suffix: '1day',    scheduledAt: new Date(row.starts_at.getTime() - 24 * 3600000) },
      { suffix: '3hours',  scheduledAt: new Date(row.starts_at.getTime() - 3 * 3600000) },
      { suffix: 'morning', scheduledAt: localHourToUTC(row.starts_at, morningHour, tz) },
    ];

    for (const r of reminders) {
      if (r.scheduledAt <= new Date()) continue; // already past
      await insertJobIfNotExists(db, {
        providerId: row.provider_id,
        jobType: 'event_reminder',
        targetType: 'calendar_entry',
        targetId: `${row.id}:${r.suffix}`,
        scheduledAt: r.scheduledAt,
        payloadJson: { ...payload, reminder_type: r.suffix },
      });
      count++;
    }
  }
  return count;
}

export async function enqueueSubscriptionReminders(db: Db): Promise<number> {
  const rows = await db<SubscriptionRow[]>`
    SELECT s.id, s.provider_id, s.expires_at, s.status,
           COALESCE(p.timezone, 'Asia/Almaty') AS timezone
    FROM subscriptions s
    JOIN providers p ON p.id = s.provider_id
    WHERE s.status NOT IN ('cancelled', 'blocked')
      AND s.expires_at > NOW()
  `;

  let count = 0;
  for (const row of rows) {
    const payload = { subscription_id: row.id, expires_at: row.expires_at.toISOString(), status: row.status };
    const threeDaysBefore = new Date(row.expires_at.getTime() - 3 * 86400000);
    const expiryDay = localHourToUTC(row.expires_at, 9, row.timezone);

    const reminders: Array<{ suffix: string; scheduledAt: Date }> = [
      { suffix: '3days',  scheduledAt: threeDaysBefore },
      { suffix: 'expiry', scheduledAt: expiryDay },
    ];

    for (const r of reminders) {
      if (r.scheduledAt <= new Date()) continue;
      await insertJobIfNotExists(db, {
        providerId: row.provider_id,
        jobType: 'subscription_reminder',
        targetType: 'subscription',
        targetId: `${row.id}:${r.suffix}`,
        scheduledAt: r.scheduledAt,
        payloadJson: { ...payload, reminder_type: r.suffix },
      });
      count++;
    }
  }
  return count;
}

export async function enqueueCalendarStaleReminders(db: Db, staleDays: number): Promise<number> {
  const rows = await db<ProviderStaleRow[]>`
    SELECT p.id AS provider_id,
           COALESCE(p.timezone, 'Asia/Almaty') AS timezone,
           MAX(ce.updated_at) AS last_update
    FROM providers p
    LEFT JOIN calendar_entries ce ON ce.provider_id = p.id
    GROUP BY p.id, p.timezone
    HAVING MAX(ce.updated_at) < NOW() - INTERVAL '1 day' * ${staleDays}
       OR MAX(ce.updated_at) IS NULL
  `;

  let count = 0;
  const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD
  for (const row of rows) {
    await insertJobIfNotExists(db, {
      providerId: row.provider_id,
      jobType: 'calendar_stale_reminder',
      targetType: 'provider',
      targetId: `${row.provider_id}:${today}`,
      scheduledAt: new Date(), // send now
      payloadJson: {
        provider_id: row.provider_id,
        last_update: row.last_update?.toISOString() ?? null,
        stale_days: staleDays,
      },
    });
    count++;
  }
  return count;
}
