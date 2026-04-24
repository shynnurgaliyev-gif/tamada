import type { Db } from '../db';

export type CalendarEntryStatus = 'busy' | 'free' | 'tentative' | 'blocked' | 'vacation';

export type CalendarEntry = {
  id: string;
  provider_id: string;
  starts_at: Date;
  ends_at: Date;
  status: CalendarEntryStatus;
  title: string | null;
  notes: string | null;
  created_by_account_id: string;
  updated_by_account_id: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CalendarEntryClient = {
  id: string;
  calendar_entry_id: string;
  client_name: string | null;
  client_phone: string | null;
  event_type: string | null;
  location_text: string | null;
  price_amount: string | null;
  currency: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CalendarEntryWithClient = CalendarEntry & { client: CalendarEntryClient | null };

const BLOCKING_STATUSES = ['busy', 'blocked', 'tentative'] as const;

export async function findEntriesByRange(
  db: Db,
  providerId: string,
  from: Date,
  to: Date,
): Promise<CalendarEntry[]> {
  return db<CalendarEntry[]>`
    SELECT * FROM calendar_entries
    WHERE provider_id = ${providerId}
      AND starts_at < ${to}
      AND ends_at > ${from}
    ORDER BY starts_at ASC
  `;
}

export async function findEntryById(db: Db, id: string): Promise<CalendarEntry | null> {
  const rows = await db<CalendarEntry[]>`SELECT * FROM calendar_entries WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function findClientByEntryId(db: Db, entryId: string): Promise<CalendarEntryClient | null> {
  const rows = await db<CalendarEntryClient[]>`
    SELECT * FROM calendar_entry_clients WHERE calendar_entry_id = ${entryId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function checkOverlap(
  db: Db,
  providerId: string,
  startsAt: Date,
  endsAt: Date,
  excludeId?: string,
): Promise<boolean> {
  const statusList = BLOCKING_STATUSES as unknown as string[];
  const rows = await db<{ count: string }[]>`
    SELECT COUNT(*) as count FROM calendar_entries
    WHERE provider_id = ${providerId}
      AND status = ANY(${statusList}::calendar_entry_status[])
      AND starts_at < ${endsAt}
      AND ends_at > ${startsAt}
      ${excludeId ? db`AND id != ${excludeId}` : db``}
  `;
  return parseInt(rows[0]?.count ?? '0', 10) > 0;
}

export async function createEntry(db: Db, data: {
  providerId: string;
  startsAt: Date;
  endsAt: Date;
  status: CalendarEntryStatus;
  title?: string | undefined;
  notes?: string | undefined;
  createdByAccountId: string;
}): Promise<CalendarEntry> {
  const rows = await db<CalendarEntry[]>`
    INSERT INTO calendar_entries
      (provider_id, starts_at, ends_at, status, title, notes, created_by_account_id)
    VALUES
      (${data.providerId}, ${data.startsAt}, ${data.endsAt}, ${data.status},
       ${data.title ?? null}, ${data.notes ?? null}, ${data.createdByAccountId})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create calendar entry');
  return rows[0];
}

export async function updateEntry(
  db: Db,
  id: string,
  data: Record<string, unknown>,
): Promise<CalendarEntry | null> {
  if (Object.keys(data).length === 0) return findEntryById(db, id);
  const rows = await db<CalendarEntry[]>`
    UPDATE calendar_entries SET ${db(data)} WHERE id = ${id} RETURNING *
  `;
  return rows[0] ?? null;
}

export async function deleteEntry(db: Db, id: string): Promise<void> {
  await db`DELETE FROM calendar_entries WHERE id = ${id}`;
}

export async function upsertClient(db: Db, entryId: string, data: {
  clientName?: string | undefined;
  clientPhone?: string | undefined;
  eventType?: string | undefined;
  locationText?: string | undefined;
  priceAmount?: number | undefined;
  currency?: string | undefined;
  notes?: string | undefined;
}): Promise<CalendarEntryClient> {
  const rows = await db<CalendarEntryClient[]>`
    INSERT INTO calendar_entry_clients
      (calendar_entry_id, client_name, client_phone, event_type, location_text, price_amount, currency, notes)
    VALUES
      (${entryId}, ${data.clientName ?? null}, ${data.clientPhone ?? null},
       ${data.eventType ?? null}, ${data.locationText ?? null},
       ${data.priceAmount ?? null}, ${data.currency ?? 'KZT'}, ${data.notes ?? null})
    ON CONFLICT (calendar_entry_id) DO UPDATE SET
      client_name   = EXCLUDED.client_name,
      client_phone  = EXCLUDED.client_phone,
      event_type    = EXCLUDED.event_type,
      location_text = EXCLUDED.location_text,
      price_amount  = EXCLUDED.price_amount,
      currency      = EXCLUDED.currency,
      notes         = EXCLUDED.notes,
      updated_at    = NOW()
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to upsert client');
  return rows[0];
}
