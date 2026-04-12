import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import { getAuthAccount } from '../auth/middleware';
import { findProviderById, findProviderBySlug } from '../providers/repositories';
import * as repo from './repositories';

type DayInfo = { date: string; status: string; count: number };

function computeMonthDays(entries: repo.CalendarEntry[], year: number, month: number): DayInfo[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month, 0).getDate(); // month 1-based: new Date(y, m, 0) = last day of month

  const result: DayInfo[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayStart = new Date(Date.UTC(year, month - 1, d));
    const dayEnd = new Date(Date.UTC(year, month - 1, d + 1));
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    const isPast = dayStart.getTime() < today.getTime();
    const dayEntries = entries.filter(e =>
      e.starts_at.getTime() < dayEnd.getTime() && e.ends_at.getTime() > dayStart.getTime(),
    );

    let status: string;
    if (isPast) {
      status = 'past';
    } else if (dayEntries.length === 0) {
      status = 'free';
    } else {
      const hasBusy = dayEntries.some(e => e.status === 'busy' || e.status === 'blocked');
      const hasTentative = dayEntries.some(e => e.status === 'tentative');
      if (hasBusy && hasTentative) status = 'partial';
      else if (hasBusy) status = 'busy';
      else status = 'tentative';
    }
    result.push({ date: dateStr, status, count: dayEntries.length });
  }
  return result;
}

export function createCalendarRoutes(db: Db) {
  const plugin: FastifyPluginAsync = async (app) => {

    // GET /providers/:id/calendar?from=&to=
    app.get('/providers/:id/calendar', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const query = req.query as Record<string, string>;
      const from = query['from'] ? new Date(query['from']) : new Date(Date.now() - 30 * 86400000);
      const to = query['to'] ? new Date(query['to']) : new Date(Date.now() + 90 * 86400000);

      const entries = await repo.findEntriesByRange(db, id, from, to);
      const withClients = await Promise.all(entries.map(async e => ({
        ...e,
        client: await repo.findClientByEntryId(db, e.id),
      })));

      return reply.send({ ok: true, entries: withClients, timezone: provider.timezone });
    });

    // POST /providers/:id/calendar
    app.post('/providers/:id/calendar', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const startsAt = new Date(body['starts_at'] as string);
      const endsAt = new Date(body['ends_at'] as string);
      const status = (body['status'] as repo.CalendarEntryStatus) ?? 'busy';

      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
        return reply.code(400).send({ ok: false, error: 'Invalid starts_at or ends_at' });
      }
      if (startsAt >= endsAt) {
        return reply.code(400).send({ ok: false, error: 'starts_at must be before ends_at' });
      }

      const validStatuses: repo.CalendarEntryStatus[] = ['busy', 'free', 'tentative', 'blocked'];
      if (!validStatuses.includes(status)) {
        return reply.code(400).send({ ok: false, error: 'Invalid status' });
      }

      if (['busy', 'blocked', 'tentative'].includes(status)) {
        const overlap = await repo.checkOverlap(db, id, startsAt, endsAt);
        if (overlap) return reply.code(409).send({ ok: false, error: 'Time slot overlaps with existing entry' });
      }

      const entry = await repo.createEntry(db, {
        providerId: id,
        startsAt,
        endsAt,
        status,
        title: typeof body['title'] === 'string' ? body['title'] : undefined,
        notes: typeof body['notes'] === 'string' ? body['notes'] : undefined,
        createdByAccountId: account.id,
      });

      let client = null;
      if (body['client'] && typeof body['client'] === 'object') {
        const c = body['client'] as Record<string, unknown>;
        client = await repo.upsertClient(db, entry.id, {
          clientName: typeof c['client_name'] === 'string' ? c['client_name'] : undefined,
          clientPhone: typeof c['client_phone'] === 'string' ? c['client_phone'] : undefined,
          eventType: typeof c['event_type'] === 'string' ? c['event_type'] : undefined,
          locationText: typeof c['location_text'] === 'string' ? c['location_text'] : undefined,
          priceAmount: typeof c['price_amount'] === 'number' ? c['price_amount'] : undefined,
          currency: typeof c['currency'] === 'string' ? c['currency'] : undefined,
          notes: typeof c['notes'] === 'string' ? c['notes'] : undefined,
        });
      }

      return reply.code(201).send({ ok: true, entry: { ...entry, client } });
    });

    // PATCH /providers/:id/calendar/:entryId
    app.patch('/providers/:id/calendar/:entryId', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, entryId } = req.params as { id: string; entryId: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const entry = await repo.findEntryById(db, entryId);
      if (!entry || entry.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Entry not found' });

      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = { updated_by_account_id: account.id };

      if (body['starts_at'] !== undefined) updates['starts_at'] = new Date(body['starts_at'] as string);
      if (body['ends_at'] !== undefined) updates['ends_at'] = new Date(body['ends_at'] as string);
      if (body['status'] !== undefined) updates['status'] = body['status'];
      if (body['title'] !== undefined) updates['title'] = body['title'];
      if (body['notes'] !== undefined) updates['notes'] = body['notes'];

      const newStartsAt = (updates['starts_at'] as Date | undefined) ?? entry.starts_at;
      const newEndsAt = (updates['ends_at'] as Date | undefined) ?? entry.ends_at;
      if (newStartsAt >= newEndsAt) {
        return reply.code(400).send({ ok: false, error: 'starts_at must be before ends_at' });
      }

      const newStatus = (updates['status'] as repo.CalendarEntryStatus | undefined) ?? entry.status;
      if (['busy', 'blocked', 'tentative'].includes(newStatus)) {
        const overlap = await repo.checkOverlap(db, id, newStartsAt, newEndsAt, entryId);
        if (overlap) return reply.code(409).send({ ok: false, error: 'Time slot overlaps with existing entry' });
      }

      const updated = await repo.updateEntry(db, entryId, updates);

      let client = await repo.findClientByEntryId(db, entryId);
      if (body['client'] && typeof body['client'] === 'object') {
        const c = body['client'] as Record<string, unknown>;
        client = await repo.upsertClient(db, entryId, {
          clientName: typeof c['client_name'] === 'string' ? c['client_name'] : undefined,
          clientPhone: typeof c['client_phone'] === 'string' ? c['client_phone'] : undefined,
          eventType: typeof c['event_type'] === 'string' ? c['event_type'] : undefined,
          locationText: typeof c['location_text'] === 'string' ? c['location_text'] : undefined,
          priceAmount: typeof c['price_amount'] === 'number' ? c['price_amount'] : undefined,
          currency: typeof c['currency'] === 'string' ? c['currency'] : undefined,
          notes: typeof c['notes'] === 'string' ? c['notes'] : undefined,
        });
      }

      return reply.send({ ok: true, entry: { ...updated, client } });
    });

    // DELETE /providers/:id/calendar/:entryId
    app.delete('/providers/:id/calendar/:entryId', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, entryId } = req.params as { id: string; entryId: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const entry = await repo.findEntryById(db, entryId);
      if (!entry || entry.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Entry not found' });

      await repo.deleteEntry(db, entryId);
      return reply.send({ ok: true });
    });

    // GET /providers/:id/calendar/month?year=&month=
    app.get('/providers/:id/calendar/month', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const q = req.query as Record<string, string>;
      const year = parseInt(q['year'] ?? String(new Date().getFullYear()), 10);
      const month = parseInt(q['month'] ?? String(new Date().getMonth() + 1), 10);
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 1));

      const entries = await repo.findEntriesByRange(db, id, monthStart, monthEnd);
      return reply.send({ ok: true, year, month, days: computeMonthDays(entries, year, month), timezone: provider.timezone });
    });

    // GET /public/providers/:slug/calendar/month?year=&month=
    app.get('/public/providers/:slug/calendar/month', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await findProviderBySlug(db, slug);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });

      const q = req.query as Record<string, string>;
      const year = parseInt(q['year'] ?? String(new Date().getFullYear()), 10);
      const month = parseInt(q['month'] ?? String(new Date().getMonth() + 1), 10);
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 1));

      const entries = await repo.findEntriesByRange(db, provider.id, monthStart, monthEnd);
      return reply.send({ ok: true, year, month, days: computeMonthDays(entries, year, month), timezone: provider.timezone });
    });

    // GET /public/providers/:slug/calendar?from=&to=
    app.get('/public/providers/:slug/calendar', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await findProviderBySlug(db, slug);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });

      const query = req.query as Record<string, string>;
      const from = query['from'] ? new Date(query['from']) : new Date();
      const to = query['to'] ? new Date(query['to']) : new Date(Date.now() + 90 * 86400000);

      const entries = await repo.findEntriesByRange(db, provider.id, from, to);
      const publicEntries = entries.map(e => ({
        id: e.id,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        status: e.status,
        title: e.status !== 'busy' && e.status !== 'blocked' ? e.title : null,
      }));

      return reply.send({ ok: true, entries: publicEntries, timezone: provider.timezone });
    });
  };

  return plugin;
}
