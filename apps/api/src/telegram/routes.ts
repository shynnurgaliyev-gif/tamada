import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { getAuthAccount } from '../auth/middleware';
import { findProviderById } from '../providers/repositories';
import { findEntriesByRange, createEntry, CalendarEntryStatus } from '../calendar/repositories';
import { getSubscriptionStatus } from '../subscription/routes';
import * as repo from './repositories';
import * as bot from './bot';
import { verifyTelegramInitData } from './mini-auth';
import { permissionsForTelegramRole } from './permissions';
import { getMiniSessionContext } from './mini-session';

export function createTelegramRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {

    // POST /telegram/link-token  (auth required)
    app.post('/telegram/link-token', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_integrations');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const providerId = typeof body['provider_id'] === 'string' ? body['provider_id'] : null;
      if (!providerId) return reply.code(400).send({ ok: false, error: 'provider_id required' });

      const provider = await findProviderById(db, providerId);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const count = await repo.countLinkedAccounts(db, providerId);
      if (count >= 3) return reply.code(400).send({ ok: false, error: 'Maximum 3 Telegram accounts per provider' });

      const tokenRow = await repo.createLinkToken(db, providerId, 'owner', accountId);
      const rawToken = tokenRow.id; // raw token returned in id field
      const botUsername = env.TELEGRAM_BOT_USERNAME ?? 'tamada_bot';
      const deepLink = `https://t.me/${botUsername}?start=link_${rawToken}`;

      return reply.send({ ok: true, deep_link: deepLink, expires_in_minutes: 15 });
    });

    // POST /providers/:id/assistant-invite
    app.post('/providers/:id/assistant-invite', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const tokenRow = await repo.createLinkToken(db, id, 'assistant', accountId);
      const rawToken = tokenRow.id;
      const botUsername = env.TELEGRAM_BOT_USERNAME ?? 'tamada_bot';
      const deepLink = `https://t.me/${botUsername}?start=link_${rawToken}`;
      return reply.send({ ok: true, deep_link: deepLink, expires_in_minutes: 15 });
    });

    // POST /telegram/mini/auth
    app.post('/telegram/mini/auth', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const initData = typeof body['init_data'] === 'string'
        ? body['init_data']
        : typeof body['initData'] === 'string' ? body['initData'] : '';
      if (!initData) return reply.code(400).send({ ok: false, error: 'init_data required' });

      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      if (!token) return reply.code(503).send({ ok: false, error: 'Telegram Mini App auth is not configured' });

      const verified = verifyTelegramInitData(initData, token);
      if (!verified) return reply.code(401).send({ ok: false, error: 'Invalid Telegram Mini App auth data' });

      const tgAccount = await repo.findLinkedAccountByTelegramUserId(db, verified.user.id);
      if (!tgAccount) return reply.send({ ok: true, providers: [], role: null, permissions: permissionsForTelegramRole(null), mini_token: null, expires_at: null });

      const providers = await listMiniAccessibleProviders(db, tgAccount);
      if (providers.length === 0) {
        return reply.send({ ok: true, providers: [], role: tgAccount.telegram_role, permissions: permissionsForTelegramRole(tgAccount.telegram_role), mini_token: null, expires_at: null });
      }

      const rawSessionToken = repo.generateMiniSessionToken();
      const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
      await repo.createMiniSession(db, {
        telegramAccountId: tgAccount.id,
        telegramUserId: verified.user.id,
        role: tgAccount.telegram_role,
        tokenHash: repo.hashToken(rawSessionToken),
        expiresAt,
      });

      return reply.send({
        ok: true,
        providers,
        role: tgAccount.telegram_role,
        permissions: permissionsForTelegramRole(tgAccount.telegram_role),
        mini_token: rawSessionToken,
        expires_at: expiresAt.toISOString(),
      });
    });

    // POST /telegram/webhook  (called by Telegram)
    app.post('/telegram/webhook', async (req, reply) => {
      const update = req.body as bot.TelegramUpdate;
      const msg = update.message;
      if (!msg?.text || !msg.from) return reply.send({ ok: true });

      const chatId = msg.chat.id;
      const telegramUserId = msg.from.id;
      const text = msg.text.trim();
      const lower = text.toLowerCase();
      const token = env.TELEGRAM_BOT_TOKEN ?? '';

      // /start link_<token>
      if (lower.startsWith('/start')) {
        const parts = text.split(' ');
        const param = parts[1];
        if (param?.startsWith('link_')) {
          const rawToken = param.slice(5);
          const tokenRow = await repo.findValidLinkToken(db, rawToken);
          if (!tokenRow) {
            await bot.sendMessage(token, chatId, '❌ Ссылка недействительна или истекла. Запросите новую в кабинете.' + bot.FOOTER);
            return reply.send({ ok: true });
          }

          const tokenProvider = await findProviderById(db, tokenRow.provider_id);
          if (!tokenProvider) {
            await bot.sendMessage(token, chatId, 'Профиль для этой ссылки не найден.' + bot.FOOTER);
            return reply.send({ ok: true });
          }

          // Check if already linked to another provider
          const existing = await repo.findAccountByTelegramUserId(db, telegramUserId);
          const existingProvider = existing ? await findProviderById(db, existing.provider_id) : null;
          if (
            existing &&
            existing.status === 'linked' &&
            existing.provider_id !== tokenRow.provider_id &&
            existingProvider?.account_id !== tokenProvider.account_id
          ) {
            await bot.sendMessage(token, chatId,
              '⚠️ Этот Telegram уже привязан к другому исполнителю.\n\nСначала отвяжитесь командой <b>отвязать</b>, потом используйте новую ссылку.' + bot.FOOTER
            );
            return reply.send({ ok: true });
          }

          const count = await repo.countLinkedAccounts(db, tokenRow.provider_id);
          if (count >= 3) {
            await bot.sendMessage(token, chatId, '❌ Максимум 3 Telegram-аккаунта уже привязано.' + bot.FOOTER);
            return reply.send({ ok: true });
          }

          await repo.markTokenUsed(db, repo.hashToken(rawToken));

          const inviteRole = tokenRow.invite_role ?? 'owner';
          const hasPrimary = await repo.hasPrimaryTelegramOwner(db, tokenProvider.account_id);
          const isPrimary = inviteRole === 'owner' && (existing?.is_primary === true || !hasPrimary);
          const role: repo.TelegramRole = inviteRole === 'assistant'
            ? 'assistant'
            : isPrimary ? 'owner' : (existing?.telegram_role ?? 'other');

          let tgAccount: repo.TelegramAccount;
          if (existing) {
            tgAccount = (await repo.relinkTelegramAccount(db, existing.id, {
              providerId: tokenRow.provider_id,
              accountId: tokenProvider.account_id,
              telegramUsername: msg.from.username,
              telegramFirstName: msg.from.first_name,
              telegramLastName: msg.from.last_name,
              role,
              isPrimary,
            })) ?? existing;
          } else {
            tgAccount = await repo.createTelegramAccount(db, {
              providerId: tokenRow.provider_id,
              accountId: tokenProvider.account_id,
              telegramUserId,
              telegramUsername: msg.from.username,
              telegramFirstName: msg.from.first_name,
              telegramLastName: msg.from.last_name,
              role,
              isPrimary,
            });
          }

          await repo.upsertProfileAccess(db, {
            telegramAccountId: tgAccount.id,
            providerId: tokenRow.provider_id,
            role,
            grantedByAccountId: tokenProvider.account_id,
          });

          await repo.logActivity(db, {
            providerId: tokenRow.provider_id,
            actorType: 'telegram',
            telegramAccountId: tgAccount.id,
            actionType: 'telegram_linked',
          });

          const name = msg.from.first_name ?? msg.from.username ?? 'вы';
          await bot.sendMessage(token, chatId, `✅ <b>${name}</b>, Telegram успешно привязан!` + bot.FOOTER);

          // Notify all other linked accounts
          await notifyAll(db, token, tokenRow.provider_id, tgAccount.id,
            `🔗 К профилю привязан новый Telegram: ${msg.from.first_name ?? ''} ${msg.from.username ? '@' + msg.from.username : ''}`
          );

          return reply.send({ ok: true });
        }

        await bot.sendMessage(token, chatId, '👋 Привет! Используйте ссылку из кабинета для привязки.' + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // All other commands — need linked account
      const tgAccount = await repo.findLinkedAccountByTelegramUserId(db, telegramUserId);
      if (!tgAccount) {
        await bot.sendMessage(token, chatId, '❌ Ваш Telegram не привязан ни к одному исполнителю.\n\nПолучите ссылку в кабинете на сайте.' + bot.FOOTER);
        return reply.send({ ok: true });
      }

      const providerId = tgAccount.provider_id;
      const provider = await findProviderById(db, providerId);
      const tz = provider?.timezone ?? 'Asia/Almaty';
      const actorAccountId = provider?.account_id ?? tgAccount.id;

      // помощь
      if (lower === 'помощь' || lower === '/help') {
        await bot.sendMessage(token, chatId, bot.HELP_TEXT);
        return reply.send({ ok: true });
      }

      // отвязать
      if (lower === 'отвязать') {
        await repo.unlinkTelegramAccount(db, tgAccount.id);
        await repo.revokeMiniSessionsForTelegramAccount(db, tgAccount.id);
        await repo.logActivity(db, { providerId, actorType: 'telegram', telegramAccountId: tgAccount.id, actionType: 'telegram_unlinked' });
        await bot.sendMessage(token, chatId, '🔓 Telegram отвязан от профиля.' + bot.FOOTER);
        await notifyAll(db, token, providerId, tgAccount.id,
          `🔓 Telegram ${msg.from.first_name ?? ''} ${msg.from.username ? '@' + msg.from.username : ''} был отвязан от профиля.`
        );
        return reply.send({ ok: true });
      }

      // календарь
      if (lower === 'календарь' || lower === '/calendar') {
        const from = new Date();
        const to = new Date(Date.now() + 7 * 86400000);
        const entries = await findEntriesByRange(db, providerId, from, to);
        if (entries.length === 0) {
          await bot.sendMessage(token, chatId, '📅 На ближайшие 7 дней записей нет.' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const lines = entries.map(e => {
          const start = new Date(e.starts_at).toLocaleString('ru-RU', { timeZone: tz, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
          const end = new Date(e.ends_at).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          const emoji = e.status === 'busy' ? '🔴' : e.status === 'tentative' ? '🟡' : e.status === 'blocked' ? '⚫' : '🟢';
          return `${emoji} ${start}–${end}${e.title ? ' · ' + e.title : ''}`;
        });
        await bot.sendMessage(token, chatId, `📅 <b>Ближайшие 7 дней:</b>\n\n${lines.join('\n')}` + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // свободно <дата>
      if (lower.startsWith('свободно ')) {
        const parts = text.split(/\s+/);
        const dateStr = parts[1];
        if (!dateStr) { await bot.sendMessage(token, chatId, '❌ Укажите дату: свободно 12.04' + bot.FOOTER); return reply.send({ ok: true }); }
        const date = bot.parseDate(dateStr);
        if (!date) { await bot.sendMessage(token, chatId, '❌ Неверный формат даты. Пример: свободно 12.04' + bot.FOOTER); return reply.send({ ok: true }); }
        const startsAt = new Date(date); startsAt.setHours(0, 0, 0, 0);
        const endsAt = new Date(date); endsAt.setHours(23, 59, 0, 0);
        const entry = await createEntry(db, { providerId, startsAt, endsAt, status: 'free', createdByAccountId: actorAccountId });
        await repo.logActivity(db, { providerId, actorType: 'telegram', telegramAccountId: tgAccount.id, actionType: 'calendar_created', targetType: 'calendar_entry', targetId: entry.id });
        await bot.sendMessage(token, chatId, `🟢 ${dateStr} отмечен как свободный.` + bot.FOOTER);
        await notifyAll(db, token, providerId, tgAccount.id, `🟢 ${msg.from.first_name ?? 'Помощник'} отметил ${dateStr} свободным.`);
        return reply.send({ ok: true });
      }

      // занято <дата> <время_начала> <время_конца>
      // подвопросом <дата> <время_начала> <время_конца>
      const isBusy = lower.startsWith('занято ');
      const isTentative = lower.startsWith('подвопросом ');
      if (isBusy || isTentative) {
        const status: CalendarEntryStatus = isBusy ? 'busy' : 'tentative';
        const parts = text.split(/\s+/);
        if (parts.length < 4) {
          await bot.sendMessage(token, chatId, `❌ Формат: ${isBusy ? 'занято' : 'подвопросом'} 12.04 13:00 18:00` + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const dateStr = parts[1]!;
        const date = bot.parseDate(dateStr);
        const startTime = bot.parseTime(parts[2]!);
        const endTime = bot.parseTime(parts[3]!);
        if (!date || !startTime || !endTime) {
          await bot.sendMessage(token, chatId, '❌ Неверный формат. Пример: занято 12.04 13:00 18:00' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const startsAt = new Date(date); startsAt.setHours(startTime.h, startTime.m, 0, 0);
        const endsAt = new Date(date); endsAt.setHours(endTime.h, endTime.m, 0, 0);
        if (startsAt >= endsAt) {
          await bot.sendMessage(token, chatId, '❌ Время начала должно быть раньше конца.' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const entry = await createEntry(db, { providerId, startsAt, endsAt, status, createdByAccountId: actorAccountId });
        await repo.logActivity(db, { providerId, actorType: 'telegram', telegramAccountId: tgAccount.id, actionType: 'calendar_created', targetType: 'calendar_entry', targetId: entry.id });
        const emoji = status === 'busy' ? '🔴' : '🟡';
        const label = status === 'busy' ? 'занятым' : 'под вопросом';
        await bot.sendMessage(token, chatId, `${emoji} ${dateStr} ${parts[2]}–${parts[3]} отмечен как ${label}.` + bot.FOOTER);
        await notifyAll(db, token, providerId, tgAccount.id,
          `${emoji} ${msg.from.first_name ?? 'Помощник'} добавил запись: ${dateStr} ${parts[2]}–${parts[3]} (${label}).`
        );
        return reply.send({ ok: true });
      }

      // клиент <дата>
      if (lower.startsWith('клиент ')) {
        const parts = text.split(/\s+/);
        const dateStr = parts[1];
        if (!dateStr) { await bot.sendMessage(token, chatId, '❌ Укажите дату: клиент 12.04' + bot.FOOTER); return reply.send({ ok: true }); }
        const date = bot.parseDate(dateStr);
        if (!date) { await bot.sendMessage(token, chatId, '❌ Неверный формат даты.' + bot.FOOTER); return reply.send({ ok: true }); }
        const from = new Date(date); from.setHours(0, 0, 0, 0);
        const to = new Date(date); to.setHours(23, 59, 59, 999);
        const entries = await findEntriesByRange(db, providerId, from, to);
        if (entries.length === 0) {
          await bot.sendMessage(token, chatId, `📭 На ${dateStr} записей нет.` + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const { findClientByEntryId } = await import('../calendar/repositories');
        const lines: string[] = [];
        for (const e of entries) {
          const client = await findClientByEntryId(db, e.id);
          const start = new Date(e.starts_at).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          const end = new Date(e.ends_at).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
          lines.push(`🕐 ${start}–${end}${e.title ? ' · ' + e.title : ''}`);
          if (client?.client_name) lines.push(`  👤 ${client.client_name}${client.client_phone ? ' · ' + client.client_phone : ''}`);
          if (client?.event_type) lines.push(`  🎉 ${client.event_type}`);
          if (client?.location_text) lines.push(`  📍 ${client.location_text}`);
          if (client?.price_amount) lines.push(`  💰 ${client.price_amount} ${client.currency}`);
        }
        await bot.sendMessage(token, chatId, `👤 <b>Клиенты на ${dateStr}:</b>\n\n${lines.join('\n')}` + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // подписка / сколько дней осталось
      if (lower === 'подписка' || lower === 'сколько дней осталось') {
        const subInfo = await getSubscriptionStatus(db, providerId);
        if (!subInfo.status) {
          await bot.sendMessage(token, chatId, '📋 Подписка не найдена. Зайдите в кабинет на сайте.' + bot.FOOTER);
          return reply.send({ ok: true });
        }
        const statusLabel: Record<string, string> = {
          trial: '🟡 Пробный период', active: '🟢 Активна', expiring: '🟠 Скоро истекает',
          expired: '🔴 Истекла', blocked: '⛔ Заблокирована', cancelled: '❌ Отменена',
        };
        const expires = subInfo.expires_at ? new Date(subInfo.expires_at).toLocaleDateString('ru-RU', { timeZone: tz }) : '—';
        let text = `📋 <b>Подписка:</b> ${statusLabel[subInfo.status] ?? subInfo.status}\n`;
        text += `📅 Действует до: ${expires}\n`;
        text += `⏳ Осталось: ${subInfo.days_left} дн.\n`;
        if (!subInfo.is_visible) {
          text += `\n⚠️ Профиль скрыт. Зайдите в кабинет и оплатите подписку.`;
        }
        await bot.sendMessage(token, chatId, text + bot.FOOTER);
        return reply.send({ ok: true });
      }

      // Unknown
      await bot.sendMessage(token, chatId, '🤔 Не понял команду.' + bot.FOOTER);
      return reply.send({ ok: true });
    });

    // POST /telegram/unlink  (auth required)
    app.post('/telegram/unlink', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_integrations');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const telegramAccountId = typeof body['telegram_account_id'] === 'string' ? body['telegram_account_id'] : null;
      if (!telegramAccountId) return reply.code(400).send({ ok: false, error: 'telegram_account_id required' });

      const tgAccount = await db<repo.TelegramAccount[]>`SELECT * FROM telegram_accounts WHERE id = ${telegramAccountId} LIMIT 1`;
      const ta = tgAccount[0];
      if (!ta) return reply.code(404).send({ ok: false, error: 'Not found' });

      const provider = await findProviderById(db, ta.provider_id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      await repo.unlinkTelegramAccount(db, telegramAccountId);
      await repo.revokeMiniSessionsForTelegramAccount(db, telegramAccountId);
      await repo.logActivity(db, { providerId: ta.provider_id, actorType: 'web', actorAccountId: accountId, telegramAccountId, actionType: 'telegram_unlinked' });

      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      if (token) {
        await bot.sendMessage(token, ta.telegram_user_id, '🔓 Ваш Telegram был отвязан от профиля через веб-кабинет.' + bot.FOOTER);
      }

      return reply.send({ ok: true });
    });

    // GET /providers/:id/telegram-accounts  (auth required)
    app.get('/providers/:id/telegram-accounts', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_integrations');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const accounts = await repo.findAllAccountsByProvider(db, id);
      return reply.send({ ok: true, accounts });
    });

    // GET /providers/:id/team  (auth required)
    app.get('/providers/:id/team', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const rows = await db<Array<repo.TelegramAccount & { access_role: repo.TelegramRole | null; access_status: string | null; access_granted_at: Date | null }>>`
        SELECT ta.*, tpa.role AS access_role, tpa.status AS access_status, tpa.granted_at AS access_granted_at
        FROM telegram_accounts ta
        LEFT JOIN telegram_profile_access tpa
          ON tpa.telegram_account_id = ta.id
          AND tpa.provider_id = ${id}
          AND tpa.status = 'active'
        WHERE ta.status = 'linked'
          AND (
            tpa.id IS NOT NULL
            OR (ta.account_id = ${provider.account_id} AND ta.is_primary = TRUE AND ta.telegram_role = 'owner')
          )
        ORDER BY ta.is_primary DESC, tpa.granted_at ASC NULLS FIRST, ta.created_at ASC
      `;

      return reply.send({ ok: true, team: rows });
    });

    // POST /providers/:id/team/:telegramAccountId/revoke
    app.post('/providers/:id/team/:telegramAccountId/revoke', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, telegramAccountId } = req.params as { id: string; telegramAccountId: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const rows = await db<repo.TelegramAccount[]>`SELECT * FROM telegram_accounts WHERE id = ${telegramAccountId} LIMIT 1`;
      const tgAccount = rows[0];
      if (!tgAccount) return reply.code(404).send({ ok: false, error: 'Telegram account not found' });
      if (tgAccount.is_primary) return reply.code(400).send({ ok: false, error: 'Primary owner cannot be revoked' });

      await repo.revokeProfileAccess(db, telegramAccountId, id);
      await repo.revokeMiniSessionsForTelegramAccount(db, telegramAccountId);
      return reply.send({ ok: true });
    });

    // POST /providers/:id/team/:telegramAccountId/make-primary
    app.post('/providers/:id/team/:telegramAccountId/make-primary', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_team');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, telegramAccountId } = req.params as { id: string; telegramAccountId: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const rows = await db<repo.TelegramAccount[]>`
        SELECT ta.* FROM telegram_accounts ta
        LEFT JOIN telegram_profile_access tpa
          ON tpa.telegram_account_id = ta.id
          AND tpa.provider_id = ${id}
          AND tpa.status = 'active'
        WHERE ta.id = ${telegramAccountId}
          AND ta.account_id = ${accountId}
          AND ta.status = 'linked'
          AND (ta.telegram_role = 'owner' OR tpa.id IS NOT NULL)
        LIMIT 1
      `;
      const target = rows[0];
      if (!target) return reply.code(404).send({ ok: false, error: 'Telegram account not found' });

      const updated = await repo.replacePrimaryTelegramOwner(db, accountId, telegramAccountId);
      if (!updated) return reply.code(400).send({ ok: false, error: 'Cannot replace primary owner' });
      await repo.upsertProfileAccess(db, { telegramAccountId, providerId: id, role: 'owner', grantedByAccountId: accountId });
      return reply.send({ ok: true, telegram_account: updated });
    });
  };

  return plugin;
}

async function notifyAll(db: Db, token: string, providerId: string, excludeId: string, text: string): Promise<void> {
  if (!token) return;
  const accounts = await repo.findLinkedAccountsByProvider(db, providerId);
  for (const a of accounts) {
    if (a.id === excludeId) continue;
    await bot.sendMessage(token, a.telegram_user_id, text);
  }
}

async function listMiniAccessibleProviders(db: Db, tgAccount: repo.TelegramAccount): Promise<readonly unknown[]> {
  if (tgAccount.is_primary && tgAccount.account_id) {
    return db`
      SELECT p.* FROM providers p
      WHERE p.account_id = ${tgAccount.account_id}
        AND p.archived_at IS NULL
        AND p.pending_delete_at IS NULL
      ORDER BY p.created_at ASC
    `;
  }

  return db`
    SELECT p.* FROM providers p
    JOIN telegram_profile_access tpa ON tpa.provider_id = p.id
    WHERE tpa.telegram_account_id = ${tgAccount.id}
      AND tpa.status = 'active'
      AND p.archived_at IS NULL
      AND p.pending_delete_at IS NULL
    ORDER BY p.created_at ASC
  `;
}
