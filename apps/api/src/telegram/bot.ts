// Telegram Bot API helper — direct HTTP calls, no library needed

export async function sendMessage(token: string, chatId: number, text: string): Promise<void> {
  if (!token) return;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => null);
}

export async function setWebhook(token: string, webhookUrl: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/setWebhook`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });
}

export type TelegramUpdate = {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string; first_name?: string; last_name?: string; };
    chat: { id: number; };
    text?: string;
  };
};

export const HELP_TEXT = `<b>Команды тамады:</b>

📅 <b>календарь</b> — ближайшие 7 дней
✅ <b>свободно 12.04</b> — отметить день свободным
🔴 <b>занято 12.04 13:00 18:00</b> — занять слот
🟡 <b>подвопросом 12.04 13:00 18:00</b> — под вопросом
👤 <b>клиент 12.04</b> — данные клиента на дату
🔗 <b>отвязать</b> — отключить этот Telegram

<i>Для списка команд напишите: помощь</i>`;

export const FOOTER = '\n\n<i>Для списка команд напишите: помощь</i>';

export function parseDate(dateStr: string): Date | null {
  // Accepts: 12.04, 12.04.2026, today/сегодня
  const s = dateStr.trim().toLowerCase();
  if (s === 'сегодня' || s === 'today') {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
  const parts = s.split('.');
  if (parts.length < 2) return null;
  const day = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10) - 1;
  const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month, day);
}

export function parseTime(timeStr: string): { h: number; m: number } | null {
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0] ?? '0', 10);
  const m = parseInt(parts[1] ?? '0', 10);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}
