import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { getAuthAccount } from '../auth/middleware';
import { findProviderById } from '../providers/repositories';
import { findEntriesByRange, createEntry, CalendarEntryStatus } from '../calendar/repositories';
import * as repo from './repositories';
import * as bot from './bot';

export function createTelegramRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {

    // POST /telegram/link-token  (auth required)
    app.post('/telegram/link-token', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const providerId = typeof body['provider_id'] === 'string' ? body['provider_id'] : null;
      if (!providerId) return reply.code(400).send({ ok: false, error: 'provider_id required' });

      const provider = await findProviderById(db, providerId);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const count = await repo.countLinkedAccounts(db, providerId);
      if (count >= 3) return reply.code(400).send({ ok: false, error: 'Maximum 3 Telegram accounts per provider' });

      const tokenRow = await repo.createLinkToken(db, providerId);
      const rawToken = tokenRow.id; // raw token returned in id field
      const botUsername = env.TELEGRAM_BOT_USERNAME ?? 'tamada_bot';
      const deepLink = `https://t.me/${botUsername}?start=link_${rawToken}`;

      return reply.send({ ok: true, deep_link: deepLink, expires_in_minutes: 15 });
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

          // Check if already linked to another provider
          const existing = await repo.findAccountByTelegramUserId(db, telegramUserId);
          if (existing && existing.status === 'linked' && existing.provider_id !== tokenRow.provider_id) {
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

          let tgAccount: repo.TelegramAccount;
          if (existing) {
            tgAccount = (await repo.relinkTelegramAccount(db, existing.id, {
              providerId: tokenRow.provider_id,
              telegramUsername: msg.from.username,
              telegramFirstName: msg.from.first_name,
              telegramLastName: msg.from.last_name,
              role: 'other',
            })) ?? existing;
          } else {
            tgAccount = await repo.createTelegramAccount(db, {
              providerId: tokenRow.provider_id,
              telegramUserId,
              telegramUsername: msg.from.username,
              telegramFirstName: msg.from.first_name,
              telegramLastName: msg.from.last_name,
              role: 'other',
            });
          }

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

      // помощь
      if (lower === 'помощь' || lower === '/help') {
        await bot.sendMessage(token, chatId, bot.HELP_TEXT);
        return reply.send({ ok: true });
      }

      // отвязать
      if (lower === 'отвязать') {
        await repo.unlinkTelegramAccount(db, tgAccount.id);
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
        const entry = await createEntry(db, { providerId, startsAt, endsAt, status: 'free', createdByAccountId: tgAccount.id });
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
        const entry = await createEntry(db, { providerId, startsAt, endsAt, status, createdByAccountId: tgAccount.id });
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

      // Unknown
      await bot.sendMessage(token, chatId, '🤔 Не понял команду.' + bot.FOOTER);
      return reply.send({ ok: true });
    });

    // POST /telegram/unlink  (auth required)
    app.post('/telegram/unlink', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const telegramAccountId = typeof body['telegram_account_id'] === 'string' ? body['telegram_account_id'] : null;
      if (!telegramAccountId) return reply.code(400).send({ ok: false, error: 'telegram_account_id required' });

      const tgAccount = await db<repo.TelegramAccount[]>`SELECT * FROM telegram_accounts WHERE id = ${telegramAccountId} LIMIT 1`;
      const ta = tgAccount[0];
      if (!ta) return reply.code(404).send({ ok: false, error: 'Not found' });

      const provider = await findProviderById(db, ta.provider_id);
      if (!provider || provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      await repo.unlinkTelegramAccount(db, telegramAccountId);
      await repo.logActivity(db, { providerId: ta.provider_id, actorType: 'web', actorAccountId: account.id, telegramAccountId, actionType: 'telegram_unlinked' });

      const token = env.TELEGRAM_BOT_TOKEN ?? '';
      if (token) {
        await bot.sendMessage(token, ta.telegram_user_id, '🔓 Ваш Telegram был отвязан от профиля через веб-кабинет.' + bot.FOOTER);
      }

      return reply.send({ ok: true });
    });

    // GET /providers/:id/telegram-accounts  (auth required)
    app.get('/providers/:id/telegram-accounts', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const accounts = await repo.findAllAccountsByProvider(db, id);
      return reply.send({ ok: true, accounts });
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
