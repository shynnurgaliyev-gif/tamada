import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { pickPendingJobs, markJobSent, markJobFailed, insertLog } from './repositories';
import { findLinkedAccountsByProvider } from '../telegram/repositories';
import { findClientByEntryId, findEntryById } from '../calendar/repositories';
import { findActiveSubscription, daysLeft } from '../subscription/repositories';
import { sendMessage, FOOTER } from '../telegram/bot';

function formatDate(d: Date, tz: string): string {
  return d.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'long', year: 'numeric' });
}
function formatTime(d: Date, tz: string): string {
  return d.toLocaleTimeString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
}

async function buildEventMessage(db: Db, payload: Record<string, unknown>, tz: string): Promise<string> {
  const entryId = String(payload['entry_id'] ?? '');
  const reminderType = String(payload['reminder_type'] ?? '');

  const entry = await findEntryById(db, entryId);
  if (!entry) return '📅 Напоминание о мероприятии (данные не найдены)';

  const client = await findClientByEntryId(db, entryId);

  const dateStr = formatDate(entry.starts_at, tz);
  const startStr = formatTime(entry.starts_at, tz);
  const endStr = formatTime(entry.ends_at, tz);

  const label: Record<string, string> = {
    '1day':    '⏰ До мероприятия остался 1 день!',
    '3hours':  '⏰ До мероприятия 3 часа!',
    'morning': '🌅 Сегодня у вас мероприятие!',
  };

  let text = `📅 <b>Напоминание о мероприятии</b>\n${label[reminderType] ?? ''}\n\n`;
  text += `📆 Дата: ${dateStr}\n`;
  text += `🕐 Время: ${startStr} – ${endStr}\n`;
  if (entry.title) text += `📝 Название: ${entry.title}\n`;
  if (client) {
    if (client.client_name) text += `👤 Клиент: ${client.client_name}\n`;
    if (client.client_phone) text += `📞 Телефон: ${client.client_phone}\n`;
    if (client.event_type)   text += `🎉 Мероприятие: ${client.event_type}\n`;
    if (client.location_text) text += `📍 Место: ${client.location_text}\n`;
    if (client.price_amount) text += `💰 Стоимость: ${client.price_amount} ${client.currency}\n`;
  }
  return text + FOOTER;
}

async function buildSubscriptionMessage(db: Db, payload: Record<string, unknown>, tz: string): Promise<string> {
  const subId = String(payload['subscription_id'] ?? '');
  const reminderType = String(payload['reminder_type'] ?? '');

  const sub = await findActiveSubscription(db, String(payload['provider_id'] ?? ''));
  const days = sub ? daysLeft(sub) : 0;
  const expiresAt = sub
    ? sub.expires_at.toLocaleDateString('ru-RU', { timeZone: tz, day: '2-digit', month: 'long', year: 'numeric' })
    : String(payload['expires_at'] ?? '');

  let text = `💳 <b>Напоминание о подписке</b>\n\n`;
  if (reminderType === '3days') {
    text += `Ваша подписка истекает через ${days} дн. — ${expiresAt}.\n`;
  } else {
    text += `Сегодня истекает ваша подписка (${expiresAt}).\n`;
  }
  text += `\nДля продления оплатите <b>9 900 ₸</b> в разделе «Подписка» в личном кабинете.\n`;
  text += `\n⚠️ После окончания подписки профиль будет скрыт.`;
  return text + FOOTER;
}

function buildStaleMessage(payload: Record<string, unknown>): string {
  const staleDays = Number(payload['stale_days'] ?? 7);
  const lastUpdate = payload['last_update'];
  let text = `📅 <b>Проверьте свой календарь</b>\n\n`;
  if (!lastUpdate) {
    text += `Вы ещё не добавляли записи в календарь.\n`;
  } else {
    text += `Вы не обновляли календарь уже <b>${staleDays} дней</b>.\n`;
  }
  text += `\nПожалуйста, отметьте актуальную занятость — это поможет клиентам видеть ваши свободные даты.`;
  return text + FOOTER;
}

export async function processReminders(db: Db, env: AppEnv): Promise<{ processed: number; sent: number; failed: number }> {
  const token = env.TELEGRAM_BOT_TOKEN ?? '';
  if (!token) return { processed: 0, sent: 0, failed: 0 };

  const jobs = await pickPendingJobs(db, 50);
  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    const payload = (job.payload_json ?? {}) as Record<string, unknown>;
    const tgAccounts = await findLinkedAccountsByProvider(db, job.provider_id);

    if (tgAccounts.length === 0) {
      // No linked accounts — mark sent (no-op), no notification possible
      await markJobSent(db, job.id);
      continue;
    }

    // Get provider timezone from payload or fall back
    const tz = String(payload['timezone'] ?? 'Asia/Almaty');

    let messageText: string;
    try {
      if (job.job_type === 'event_reminder') {
        messageText = await buildEventMessage(db, payload, tz);
      } else if (job.job_type === 'subscription_reminder') {
        // inject provider_id into payload for lookup
        payload['provider_id'] = job.provider_id;
        messageText = await buildSubscriptionMessage(db, payload, tz);
      } else {
        messageText = buildStaleMessage(payload);
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      await markJobFailed(db, job.id, error);
      failed++;
      continue;
    }

    let jobHadError = false;
    for (const tgAccount of tgAccounts) {
      try {
        await sendMessage(token, tgAccount.telegram_user_id, messageText);
        await insertLog(db, {
          providerId: job.provider_id,
          telegramAccountId: tgAccount.id,
          jobId: job.id,
          notificationType: job.job_type,
          deliveryStatus: 'sent',
          messageText,
        });
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        jobHadError = true;
        await insertLog(db, {
          providerId: job.provider_id,
          telegramAccountId: tgAccount.id,
          jobId: job.id,
          notificationType: job.job_type,
          deliveryStatus: 'failed',
          messageText,
          errorText: error,
        });
      }
    }

    if (jobHadError) {
      await markJobFailed(db, job.id, 'One or more Telegram sends failed');
      failed++;
    } else {
      await markJobSent(db, job.id);
      sent++;
    }
  }

  return { processed: jobs.length, sent, failed };
}
