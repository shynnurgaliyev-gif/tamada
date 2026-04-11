import { CITIES, CATEGORIES, TIME_PERIODS, MONTHS, WEEKDAYS } from './aliases';

export type ParsedFilters = {
  city?: string | undefined;
  region?: string | undefined;
  category?: string | undefined;
  subcategory?: string | undefined;
  date?: string | undefined;          // YYYY-MM-DD
  time_from?: string | undefined;     // HH:MM
  time_to?: string | undefined;       // HH:MM
  price_from?: number | undefined;
  price_to?: number | undefined;
  only_free?: boolean | undefined;
  featured?: boolean | undefined;
  has_instagram?: boolean | undefined;
  has_whatsapp?: boolean | undefined;
  has_two_gis?: boolean | undefined;
};

export type ParseResult = {
  filters: ParsedFilters;
  understood: string[];   // human-readable list of what was detected
  mode: 'rule-based' | 'llm';
};

// Returns next weekday from today (or today if matches)
function nextWeekday(targetDay: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const diff = (targetDay - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + (diff === 0 ? 7 : diff));
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function parseQueryRuleBased(text: string): ParseResult {
  const filters: ParsedFilters = {};
  const understood: string[] = [];
  const lower = text.toLowerCase().replace(/[,!?.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = lower.split(' ');

  // ---- City ----
  // Try multi-word first (up to 3 words), then single
  outer: for (let len = 3; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (CITIES[phrase]) {
        filters.city = CITIES[phrase];
        understood.push(`Город: ${filters.city}`);
        break outer;
      }
    }
  }

  // ---- Category ----
  // Try multi-word (up to 3), then single
  outer2: for (let len = 3; len >= 1; len--) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(' ');
      if (CATEGORIES[phrase]) {
        filters.category = CATEGORIES[phrase];
        understood.push(`Категория: ${filters.category}`);
        break outer2;
      }
    }
  }

  // ---- Date ----
  // "сегодня" / "today"
  if (/сегодня|today/.test(lower)) {
    filters.date = toISODate(new Date());
    understood.push('Дата: сегодня');
  }
  // "завтра" / "tomorrow"
  else if (/завтра|tomorrow/.test(lower)) {
    const d = new Date(); d.setDate(d.getDate() + 1);
    filters.date = toISODate(d);
    understood.push('Дата: завтра');
  }
  // Weekday: "в субботу", "в пятницу", etc.
  else {
    for (const [kw, day] of Object.entries(WEEKDAYS)) {
      if (lower.includes(kw)) {
        const d = nextWeekday(day);
        filters.date = toISODate(d);
        understood.push(`Дата: ${kw}`);
        break;
      }
    }
  }

  // "ДД месяц" or "ДД мес" — e.g. "12 августа", "12 авг"
  if (!filters.date) {
    for (const [monthKw, monthNum] of Object.entries(MONTHS)) {
      const re = new RegExp(`(\\d{1,2})\\s+${monthKw}`);
      const m = lower.match(re);
      if (m?.[1]) {
        const day = parseInt(m[1], 10);
        const year = new Date().getFullYear();
        const d = new Date(year, monthNum - 1, day);
        // If date already passed, use next year
        if (d < new Date()) d.setFullYear(year + 1);
        filters.date = toISODate(d);
        understood.push(`Дата: ${day} ${monthKw}`);
        break;
      }
    }
  }

  // ---- Time ----
  for (const [kw, period] of Object.entries(TIME_PERIODS)) {
    if (lower.includes(kw)) {
      filters.time_from = period.from;
      filters.time_to   = period.to;
      understood.push(`Время: ${period.label}`);
      break;
    }
  }

  // Explicit HH:MM patterns
  if (!filters.time_from) {
    const timeRe = /(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/;
    const tm = lower.match(timeRe);
    if (tm) {
      filters.time_from = `${tm[1]!.padStart(2,'0')}:${tm[2]}`;
      filters.time_to   = `${tm[3]!.padStart(2,'0')}:${tm[4]}`;
      understood.push(`Время: ${filters.time_from}–${filters.time_to}`);
    }
  }

  // ---- Price ----
  // "до NNNN", "не дороже NNNN", "максимум NNNN"
  const priceTo = lower.match(/(?:до|не дороже|максимум|max)\s+(\d[\d\s]*)/);
  if (priceTo?.[1]) {
    filters.price_to = parseInt(priceTo[1].replace(/\s/g, ''), 10);
    understood.push(`Цена до: ${filters.price_to.toLocaleString('ru-RU')} ₸`);
  }
  // "от NNNN", "минимум NNNN"
  const priceFrom = lower.match(/(?:от|минимум)\s+(\d[\d\s]*)/);
  if (priceFrom?.[1]) {
    filters.price_from = parseInt(priceFrom[1].replace(/\s/g, ''), 10);
    understood.push(`Цена от: ${filters.price_from.toLocaleString('ru-RU')} ₸`);
  }

  // ---- Flags ----
  if (/свободен|свободна|свободного|свободную|доступен|незанятый/.test(lower)) {
    filters.only_free = true;
    understood.push('Только свободные');
  }
  if (/instagram|инстаграм/.test(lower)) {
    filters.has_instagram = true;
    understood.push('Есть Instagram');
  }
  if (/whatsapp|ватсап|вацап/.test(lower)) {
    filters.has_whatsapp = true;
    understood.push('Есть WhatsApp');
  }
  if (/2gis|2гис|двгис/.test(lower)) {
    filters.has_two_gis = true;
    understood.push('Есть 2GIS');
  }

  return { filters, understood, mode: 'rule-based' };
}
