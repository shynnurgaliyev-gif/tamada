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
    voice?: { file_id: string; file_unique_id?: string; duration?: number; mime_type?: string; file_size?: number };
    audio?: { file_id: string; file_unique_id?: string; duration?: number; mime_type?: string; file_size?: number; file_name?: string };
  };
};

export type TelegramFile = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path: string;
};

export async function getFile(token: string, fileId: string): Promise<TelegramFile | null> {
  if (!token) return null;
  const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`).catch(() => null);
  if (!res?.ok) return null;
  const json = await res.json() as { ok?: boolean; result?: TelegramFile };
  return json.ok && json.result?.file_path ? json.result : null;
}

export async function downloadFile(token: string, filePath: string): Promise<Buffer | null> {
  if (!token || !filePath) return null;
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${filePath}`).catch(() => null);
  if (!res?.ok) return null;
  return Buffer.from(await res.arrayBuffer());
}

export function helpText(profileName: string | null, hasMultipleProfiles: boolean): string {
  const context = profileName
    ? `\nАктивный профиль: <b>${escapeHtml(profileName)}</b>\n`
    : '';
  const profileHelp = hasMultipleProfiles
    ? '\n<b>Профили</b>\n<b>профили</b> — список доступных профилей\n<b>профиль 1</b> — переключиться по номеру\n<b>профиль Название</b> — переключиться по названию\n<b>сменить профиль</b> — открыть список\n'
    : '';
  return `<b>Команды Octiqa:</b>${context}

📅 <b>календарь</b> — ближайшие 7 дней
✅ <b>свободно 12.04</b> — отметить день свободным
🔴 <b>занято 12.04 13:00 18:00</b> — занять слот
🟡 <b>подвопросом 12.04 13:00 18:00</b> — под вопросом
👤 <b>клиент 12.04</b> — данные клиента на дату
📋 <b>подписка</b> — статус и дней осталось
🔗 <b>отвязать</b> — отключить этот Telegram
${profileHelp}
При нескольких профилях бот сохраняет записи только в активный профиль.

<i>Для списка команд напишите: помощь</i>`;
}

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

export type QuickBookingDraft = {
  date: string;
  time_from: string | null;
  time_to: string | null;
  all_day: boolean;
  status: 'busy' | 'free' | 'tentative' | 'blocked';
  event_type: string | null;
  service_type: string | null;
  client_name: string | null;
  note: string | null;
  raw_text: string;
};

const MONTHS: Record<string, number> = {
  'янв': 1, 'января': 1, 'январь': 1,
  'фев': 2, 'февраля': 2, 'февраль': 2,
  'мар': 3, 'марта': 3, 'март': 3,
  'апр': 4, 'апреля': 4, 'апрель': 4,
  'мая': 5, 'май': 5,
  'июн': 6, 'июня': 6, 'июнь': 6,
  'июл': 7, 'июля': 7, 'июль': 7,
  'авг': 8, 'августа': 8, 'август': 8,
  'сен': 9, 'сентября': 9, 'сентябрь': 9,
  'окт': 10, 'октября': 10, 'октябрь': 10,
  'ноя': 11, 'ноября': 11, 'ноябрь': 11,
  'дек': 12, 'декабря': 12, 'декабрь': 12,
};

const SERVICE_WORDS = new Set([
  'кыз', 'узату', 'свадьба', 'свадбу', 'свадебный', 'той', 'примерка', 'маникюр',
  'макияж', 'прическа', 'фотосессия', 'банкет', 'встреча', 'консультация',
]);

export function parseQuickBookingText(input: string, now = new Date()): QuickBookingDraft | null {
  const raw = input.trim();
  if (!raw || raw.length > 300) return null;

  let text = raw.toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

  const dateInfo = extractBookingDate(text, now);
  if (!dateInfo) return null;
  text = removeSpan(text, dateInfo.start, dateInfo.end);

  const allDay = /\b(весь день|целый день|на весь день|занят целый день)\b/.test(text);
  text = text.replace(/\b(на весь день|весь день|целый день|занят целый день)\b/g, ' ');

  let timeFrom: string | null = null;
  let timeTo: string | null = null;
  const dateOnlyFree = /\b(свободно|свободен|free)\b/.test(text) && !/\d{1,2}(?::\d{2})?\s*(?:-|до|\s+)\s*\d{1,2}(?::\d{2})?/.test(text);
  if (!allDay && !dateOnlyFree) {
    const timeInfo = extractTimeRange(text);
    if (!timeInfo) return null;
    timeFrom = timeInfo.from;
    timeTo = timeInfo.to;
    text = removeSpan(text, timeInfo.start, timeInfo.end);
  }

  const status = /\b(под вопросом|предварительно|предвар|tentative)\b/.test(text)
    ? 'tentative'
    : /\b(заблок|блок|нельзя|blocked)\b/.test(text)
      ? 'blocked'
      : /\b(свободно|свободен|free)\b/.test(text)
        ? 'free'
        : 'busy';

  text = text
    .replace(/\b(занято|занят|занята|busy|под вопросом|предварительно|предвар|tentative|заблокировано|заблок|блок|blocked|свободно|свободен|free)\b/g, ' ')
    .replace(/\b(с|до|на|в)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const note = text || null;
  const words = text.split(/\s+/).filter(Boolean);
  const serviceWords = words.filter(w => SERVICE_WORDS.has(w));
  const eventType = serviceWords.length ? serviceWords.join(' ') : words.slice(0, Math.min(2, words.length)).join(' ') || null;
  const clientWords = words.filter(w => !serviceWords.includes(w));
  const clientName = clientWords.find(w => /^[а-яa-z][а-яa-z-]*$/i.test(w) && !SERVICE_WORDS.has(w)) ?? null;

  if (allDay || dateOnlyFree) {
    timeFrom = null;
    timeTo = null;
  }

  return {
    date: formatYmd(dateInfo.date),
    time_from: timeFrom,
    time_to: timeTo,
    all_day: allDay || dateOnlyFree,
    status,
    event_type: eventType,
    service_type: eventType,
    client_name: clientName,
    note,
    raw_text: raw,
  };
}

export function bookingPreview(profileName: string, draft: QuickBookingDraft): string {
  const statusLabel: Record<QuickBookingDraft['status'], string> = {
    busy: 'занято',
    free: 'свободно',
    tentative: 'под вопросом',
    blocked: 'заблокировано',
  };
  return [
    '<b>Проверьте запись</b>',
    `Активный профиль: <b>${escapeHtml(profileName)}</b>`,
    `Дата: <b>${formatRuDate(draft.date)}</b>`,
    `Время: <b>${draft.all_day ? 'весь день' : `${draft.time_from}-${draft.time_to}`}</b>`,
    `Статус: <b>${statusLabel[draft.status]}</b>`,
    `Клиент: <b>${draft.client_name ? escapeHtml(draft.client_name) : 'не указан'}</b>`,
    `Заметка: <b>${draft.note ? escapeHtml(draft.note) : 'нет'}</b>`,
    '',
    'Напишите: <b>Подтвердить</b>, <b>Отмена</b> или <b>Изменить</b>.',
  ].join('\n');
}

export function draftToDates(draft: QuickBookingDraft): { startsAt: Date; endsAt: Date } {
  const [year, month, day] = draft.date.split('-').map(Number);
  const startsAt = new Date(year!, month! - 1, day!, 0, 0, 0, 0);
  const endsAt = new Date(year!, month! - 1, day!, 23, 59, 0, 0);
  if (!draft.all_day && draft.time_from && draft.time_to) {
    const from = parseTime(draft.time_from)!;
    const to = parseTime(draft.time_to)!;
    startsAt.setHours(from.h, from.m, 0, 0);
    endsAt.setHours(to.h, to.m, 0, 0);
  }
  return { startsAt, endsAt };
}

function extractBookingDate(text: string, now: Date): { date: Date; start: number; end: number } | null {
  const relative = /\b(сегодня|завтра|послезавтра)\b/.exec(text);
  if (relative) {
    const date = atStartOfDay(now);
    if (relative[1] === 'завтра') date.setDate(date.getDate() + 1);
    if (relative[1] === 'послезавтра') date.setDate(date.getDate() + 2);
    return { date, start: relative.index, end: relative.index + relative[0].length };
  }

  const dotted = /\b(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?\b/.exec(text);
  if (dotted) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const year = dotted[3] ? normalizeYear(Number(dotted[3])) : now.getFullYear();
    if (!validDateParts(day, month, year)) return null;
    return { date: new Date(year, month - 1, day), start: dotted.index, end: dotted.index + dotted[0].length };
  }

  const named = /\b(\d{1,2})\s+([а-я]+)\b/i.exec(text);
  if (named) {
    const day = Number(named[1]);
    const month = MONTHS[named[2] ?? ''];
    const year = now.getFullYear();
    if (!month || !validDateParts(day, month, year)) return null;
    return { date: new Date(year, month - 1, day), start: named.index, end: named.index + named[0].length };
  }

  return null;
}

function extractTimeRange(text: string): { from: string; to: string; start: number; end: number } | null {
  const range = /\b(?:с\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:-|до|\s+)\s*(\d{1,2})(?::(\d{2}))?\b/.exec(text);
  if (!range) return null;
  const from = normalizeTime(range[1], range[2] ?? '00');
  const to = normalizeTime(range[3], range[4] ?? '00');
  if (!from || !to || from >= to) return null;
  return { from, to, start: range.index, end: range.index + range[0].length };
}

function normalizeTime(hh?: string, mm?: string): string | null {
  const h = Number(hh);
  const m = Number(mm);
  if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function atStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatYmd(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatRuDate(ymd: string): string {
  return new Date(`${ymd}T00:00:00`).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
}

function normalizeYear(year: number): number {
  return year < 100 ? 2000 + year : year;
}

function validDateParts(day: number, month: number, year: number): boolean {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function removeSpan(text: string, start: number, end: number): string {
  return `${text.slice(0, start)} ${text.slice(end)}`.replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
