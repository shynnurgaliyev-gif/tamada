import type { FastifyPluginAsync } from 'fastify';
import type { AppEnv } from '@tamada/config';
import type { Db } from '../db';
import { getAuthAccount } from '../auth/middleware';
import { findProviderById, findProviderBySlug } from '../providers/repositories';
import { onCalendarChange, publishCalendarChange } from './events';
import * as repo from './repositories';
import * as telegramRepo from '../telegram/repositories';
import * as bot from '../telegram/bot';
import { hasMiniPermission } from '../telegram/permissions';
import { badRequest, unauthorized, forbidden, notFound, conflict, serverError } from '../replies';

type DayInfo = { date: string; status: string; count: number };

async function canAccessProvider(db: Db, req: Parameters<typeof getAuthAccount>[1], providerId: string): Promise<{ ok: boolean; accountId: string | null; telegramAccountId: string | null }> {
  const provider = await findProviderById(db, providerId);
  if (!provider) return { ok: false, accountId: null, telegramAccountId: null };

  const account = await getAuthAccount(db, req);
  if (account && provider.account_id === account.id) {
    return { ok: true, accountId: account.id, telegramAccountId: null };
  }

  const miniAuthHeader = req.headers['x-mini-auth'];
  const miniAuthToken = Array.isArray(miniAuthHeader) ? miniAuthHeader[0] : miniAuthHeader;
  if (!miniAuthToken) return { ok: false, accountId: null, telegramAccountId: null };

  const miniSession = await telegramRepo.findValidMiniSession(db, telegramRepo.hashToken(miniAuthToken));
  if (!miniSession) return { ok: false, accountId: null, telegramAccountId: null };
  if (!hasMiniPermission(miniSession.role, 'can_manage_calendar')) return { ok: false, accountId: null, telegramAccountId: null };

  const tgAccount = await telegramRepo.findTelegramAccountById(db, miniSession.telegram_account_id);
  if (!tgAccount) return { ok: false, accountId: null, telegramAccountId: null };
  if (tgAccount.is_primary && tgAccount.account_id === provider.account_id) {
    return { ok: true, accountId: provider.account_id, telegramAccountId: tgAccount.id };
  }
  const access = await telegramRepo.findActiveProfileAccess(db, tgAccount.id, providerId);
  return { ok: !!access, accountId: provider.account_id, telegramAccountId: tgAccount.id };
}

function entryRange(entry: Pick<repo.CalendarEntry, 'starts_at' | 'ends_at'>) {
  return {
    starts_at: entry.starts_at.toISOString(),
    ends_at: entry.ends_at.toISOString(),
  };
}

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
      const hasBusy      = dayEntries.some(e => e.status === 'busy');
      const hasVacation  = dayEntries.some(e => e.status === 'vacation');
      const hasTentative = dayEntries.some(e => e.status === 'tentative');
      if ((hasBusy || hasVacation) && hasTentative) status = 'partial';
      else if (hasBusy)     status = 'busy';
      else if (hasVacation) status = 'vacation';
      else                  status = 'tentative';
    }
    result.push({ date: dateStr, status, count: dayEntries.length });
  }
  return result;
}

async function notifyCalendarChangeByAssistant(db: Db, env: AppEnv, providerId: string, telegramAccountId: string | null, text: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN ?? '';
  if (!token || !telegramAccountId) return;
  const accounts = await telegramRepo.findLinkedAccountsByProvider(db, providerId);
  const actor = accounts.find(a => a.id === telegramAccountId);
  if (actor?.is_primary) return;
  const actorName = actor ? `${actor.telegram_first_name ?? ''} ${actor.telegram_username ? '@' + actor.telegram_username : ''}`.trim() : 'Помощник';
  for (const account of accounts) {
    if (!account.is_primary || account.id === telegramAccountId) continue;
    await bot.sendMessage(token, account.telegram_user_id, `👤 ${actorName}\n${text}` + bot.FOOTER).catch(() => null);
  }
}

export function createCalendarRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {

    // GET /providers/:id/calendar?from=&to=
    app.get('/providers/:id/calendar', async (req, reply) => {
      const { id } = req.params as { id: string };
      const access = await canAccessProvider(db, req, id);
      if (!access.ok) return forbidden(reply);
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');

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
      const { id } = req.params as { id: string };
      const access = await canAccessProvider(db, req, id);
      if (!access.ok) return forbidden(reply);
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');

      const body = req.body as Record<string, unknown>;
      const startsAt = new Date(body['starts_at'] as string);
      const endsAt = new Date(body['ends_at'] as string);
      const status = (body['status'] as repo.CalendarEntryStatus) ?? 'busy';

      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) {
        return badRequest(reply, 'Неверная дата начала или окончания');
      }
      if (startsAt >= endsAt) {
        return badRequest(reply, 'Время начала должно быть раньше времени окончания');
      }

      const validStatuses: repo.CalendarEntryStatus[] = ['busy', 'free', 'tentative', 'vacation'];
      if (!validStatuses.includes(status)) {
        return badRequest(reply, 'Неверный статус записи');
      }

      if (['busy', 'tentative', 'vacation'].includes(status)) {
        const overlap = await repo.checkOverlap(db, id, startsAt, endsAt);
        if (overlap) return conflict(reply, 'Это время пересекается с существующей записью');
      }

      const entry = await repo.createEntry(db, {
        providerId: id,
        startsAt,
        endsAt,
        status,
        title: typeof body['title'] === 'string' ? body['title'] : undefined,
        notes: typeof body['notes'] === 'string' ? body['notes'] : undefined,
        createdByAccountId: access.accountId ?? provider.account_id,
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

      publishCalendarChange({
        provider_id: id,
        action: 'create',
        entry_id: entry.id,
        ranges: [entryRange(entry)],
      });
      await telegramRepo.logActivity(db, {
        providerId: id,
        actorType: access.telegramAccountId ? 'telegram' : 'web',
        actorAccountId: access.accountId ?? provider.account_id,
        telegramAccountId: access.telegramAccountId ?? undefined,
        actionType: 'calendar_created',
        targetType: 'calendar_entry',
        targetId: entry.id,
        payloadJson: { status: entry.status, ...entryRange(entry) },
      });
      await notifyCalendarChangeByAssistant(db, env, id, access.telegramAccountId, `добавил запись в календарь профиля ${provider.display_name}.`);

      return reply.code(201).send({ ok: true, entry: { ...entry, client } });
    });

    // PATCH /providers/:id/calendar/:entryId
    app.patch('/providers/:id/calendar/:entryId', async (req, reply) => {
      const { id, entryId } = req.params as { id: string; entryId: string };
      const access = await canAccessProvider(db, req, id);
      if (!access.ok) return forbidden(reply);
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');

      const entry = await repo.findEntryById(db, entryId);
      if (!entry || entry.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Запись не найдена' });

      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = { updated_by_account_id: access.accountId ?? provider.account_id };

      if (body['starts_at'] !== undefined) updates['starts_at'] = new Date(body['starts_at'] as string);
      if (body['ends_at'] !== undefined) updates['ends_at'] = new Date(body['ends_at'] as string);
      if (body['status'] !== undefined) updates['status'] = body['status'];
      if (body['title'] !== undefined) updates['title'] = body['title'];
      if (body['notes'] !== undefined) updates['notes'] = body['notes'];

      const newStartsAt = (updates['starts_at'] as Date | undefined) ?? entry.starts_at;
      const newEndsAt = (updates['ends_at'] as Date | undefined) ?? entry.ends_at;
      if (newStartsAt >= newEndsAt) {
        return badRequest(reply, 'Время начала должно быть раньше времени окончания');
      }

      const newStatus = (updates['status'] as repo.CalendarEntryStatus | undefined) ?? entry.status;
      if (['busy', 'blocked', 'tentative'].includes(newStatus)) {
        const overlap = await repo.checkOverlap(db, id, newStartsAt, newEndsAt, entryId);
        if (overlap) return conflict(reply, 'Это время пересекается с существующей записью');
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

      if (updated) {
        publishCalendarChange({
          provider_id: id,
          action: 'update',
          entry_id: entryId,
          ranges: [entryRange(entry), entryRange(updated)],
        });
        await telegramRepo.logActivity(db, {
          providerId: id,
          actorType: access.telegramAccountId ? 'telegram' : 'web',
          actorAccountId: access.accountId ?? provider.account_id,
          telegramAccountId: access.telegramAccountId ?? undefined,
          actionType: 'calendar_updated',
          targetType: 'calendar_entry',
          targetId: entryId,
          payloadJson: { previous: entryRange(entry), next: entryRange(updated), status: updated.status },
        });
        await notifyCalendarChangeByAssistant(db, env, id, access.telegramAccountId, `изменил запись в календаре профиля ${provider.display_name}.`);
      }

      return reply.send({ ok: true, entry: { ...updated, client } });
    });

    // DELETE /providers/:id/calendar/:entryId
    app.delete('/providers/:id/calendar/:entryId', async (req, reply) => {
      const { id, entryId } = req.params as { id: string; entryId: string };
      const access = await canAccessProvider(db, req, id);
      if (!access.ok) return forbidden(reply);
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');

      const entry = await repo.findEntryById(db, entryId);
      if (!entry || entry.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Запись не найдена' });

      await repo.deleteEntry(db, entryId);
      publishCalendarChange({
        provider_id: id,
        action: 'delete',
        entry_id: entryId,
        ranges: [entryRange(entry)],
      });
      await telegramRepo.logActivity(db, {
        providerId: id,
        actorType: access.telegramAccountId ? 'telegram' : 'web',
        actorAccountId: access.accountId ?? provider.account_id,
        telegramAccountId: access.telegramAccountId ?? undefined,
        actionType: 'calendar_deleted',
        targetType: 'calendar_entry',
        targetId: entryId,
        payloadJson: { status: entry.status, ...entryRange(entry) },
      });
      await notifyCalendarChangeByAssistant(db, env, id, access.telegramAccountId, `удалил запись из календаря профиля ${provider.display_name}.`);
      return reply.send({ ok: true });
    });

    // GET /providers/:id/calendar/month?year=&month=
    app.get('/providers/:id/calendar/month', async (req, reply) => {
      const { id } = req.params as { id: string };
      const access = await canAccessProvider(db, req, id);
      if (!access.ok) return forbidden(reply);
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');

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
      if (!provider) return notFound(reply, 'Профиль не найден');

      const q = req.query as Record<string, string>;
      const year = parseInt(q['year'] ?? String(new Date().getFullYear()), 10);
      const month = parseInt(q['month'] ?? String(new Date().getMonth() + 1), 10);
      const monthStart = new Date(Date.UTC(year, month - 1, 1));
      const monthEnd = new Date(Date.UTC(year, month, 1));

      const entries = await repo.findEntriesByRange(db, provider.id, monthStart, monthEnd);
      return reply.send({ ok: true, year, month, days: computeMonthDays(entries, year, month), timezone: provider.timezone });
    });

    // GET /public/providers/:slug/calendar/stream
    app.get('/public/providers/:slug/calendar/stream', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await findProviderBySlug(db, slug);
      if (!provider) return notFound(reply, 'Профиль не найден');

      reply.hijack();
      reply.raw.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      });
      reply.raw.write(`event: ready\ndata: ${JSON.stringify({ ok: true, provider_id: provider.id })}\n\n`);

      const off = onCalendarChange(event => {
        if (event.provider_id !== provider.id) return;
        if (!reply.raw.writableEnded) {
          reply.raw.write(`event: calendar-change\ndata: ${JSON.stringify(event)}\n\n`);
        }
      });
      const keepAlive = setInterval(() => {
        if (!reply.raw.writableEnded) {
          reply.raw.write(`: keep-alive ${Date.now()}\n\n`);
        }
      }, 25000);

      req.raw.on('close', () => {
        clearInterval(keepAlive);
        off();
      });
    });

    // GET /public/providers/:slug/calendar?from=&to=
    app.get('/public/providers/:slug/calendar', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await findProviderBySlug(db, slug);
      if (!provider) return notFound(reply, 'Профиль не найден');

      const query = req.query as Record<string, string>;
      const from = query['from'] ? new Date(query['from']) : new Date();
      const to = query['to'] ? new Date(query['to']) : new Date(Date.now() + 90 * 86400000);

      const entries = await repo.findEntriesByRange(db, provider.id, from, to);
      const publicEntries = entries.map(e => ({
        id: e.id,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        status: e.status,
      }));

      return reply.send({ ok: true, entries: publicEntries, timezone: provider.timezone });
    });
  };

  return plugin;
}
