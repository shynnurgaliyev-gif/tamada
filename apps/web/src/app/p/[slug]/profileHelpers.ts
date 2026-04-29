/* ── profileHelpers ──────────────────────────────────────────────────────────
   Pure constants + functions extracted from ProfileClient.tsx.
   No React state, no DOM access (except getSessionId which uses sessionStorage).
────────────────────────────────────────────────────────────────────────────── */

import type { IconType } from 'react-icons';
import {
  FaWhatsapp, FaTelegram, FaInstagram, FaYoutube, FaTiktok,
  FaGlobe, FaPhone, FaLink, FaMapMarkerAlt,
} from 'react-icons/fa';
import type { DayInfo } from '@octiqa/types';

export type PublicCalendarEntry = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'busy' | 'free' | 'tentative' | 'blocked';
};

export const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
export const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

export const CAL_ST: Record<string, { bg: string; color: string; border: string; label: string }> = {
  free:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Свободно'    },
  busy:     { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3', label: 'Занято'       },
  partial:  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'Частично'     },
  tentative:{ bg: '#fefce8', color: '#ca8a04', border: '#fde68a', label: 'Под вопросом' },
  past:     { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Прошлое'     },
};

export const TIMELINE_ST: Record<string, { bg: string; color: string; border: string; label: string }> = {
  free:      { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Свободно' },
  busy:      { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', label: 'Занято' },
  tentative: { bg: '#fefce8', color: '#a16207', border: '#fde68a', label: 'Под вопросом' },
  blocked:   { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Недоступно' },
};

export type LinkCfg = { Icon: IconType; label: string; bg: string; text: string };
export const LINK_CFG: Record<string, LinkCfg> = {
  phone:     { Icon: FaPhone,         label: 'Позвонить', bg: 'var(--brand)',  text: '#fff' },
  whatsapp:  { Icon: FaWhatsapp,      label: 'WhatsApp',  bg: '#25D366',       text: '#fff' },
  telegram:  { Icon: FaTelegram,      label: 'Telegram',  bg: '#229ED9',       text: '#fff' },
  instagram: { Icon: FaInstagram,     label: 'Instagram', bg: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', text: '#fff' },
  tiktok:    { Icon: FaTiktok,        label: 'TikTok',    bg: '#010101',       text: '#fff' },
  youtube:   { Icon: FaYoutube,       label: 'YouTube',   bg: '#FF0000',       text: '#fff' },
  website:   { Icon: FaGlobe,         label: 'Сайт',      bg: 'var(--surface-2)', text: 'var(--ink)' },
  two_gis:   { Icon: FaMapMarkerAlt,  label: '2GIS',      bg: 'var(--surface-2)', text: 'var(--ink)' },
  map:       { Icon: FaMapMarkerAlt,  label: 'Карта',     bg: 'var(--surface-2)', text: 'var(--ink)' },
  other:     { Icon: FaLink,          label: 'Ссылка',    bg: 'var(--surface-2)', text: 'var(--ink)' },
};

const GRADIENTS = [
  'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)',
  'linear-gradient(135deg,#db2777 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#059669 0%,#0284c7 100%)',
  'linear-gradient(135deg,#d97706 0%,#b45309 100%)',
  'linear-gradient(135deg,#dc2626 0%,#9d174d 100%)',
  'linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)',
  'linear-gradient(135deg,#0f172a 0%,#1e40af 100%)',
];
export function nameToGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!;
}

export function getSessionId(): string {
  const key = 'lk_sid';
  let id = sessionStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem(key, id); }
  return id;
}

export function calendarDaysEqual(a: DayInfo[], b: DayInfo[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (left.date !== right.date || left.status !== right.status || left.count !== right.count) {
      return false;
    }
  }
  return true;
}

export function rangeTouchesMonth(range: { starts_at: string; ends_at: string }, year: number, month: number): boolean {
  const startsAt = new Date(range.starts_at);
  const endsAt = new Date(range.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return true;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  return startsAt.getTime() < monthEnd.getTime() && endsAt.getTime() > monthStart.getTime();
}

export function dayBounds(date: string): { start: Date; end: Date; from: string; to: string } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, from: start.toISOString(), to: end.toISOString() };
}

export function rangeTouchesDate(range: { starts_at: string; ends_at: string }, date: string): boolean {
  const startsAt = new Date(range.starts_at);
  const endsAt = new Date(range.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return true;
  const { start, end } = dayBounds(date);
  return startsAt.getTime() < end.getTime() && endsAt.getTime() > start.getTime();
}

export function calendarEntriesEqual(a: PublicCalendarEntry[], b: PublicCalendarEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.id !== right.id ||
      left.starts_at !== right.starts_at ||
      left.ends_at !== right.ends_at ||
      left.status !== right.status
    ) return false;
  }
  return true;
}

function minutesInDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

export function formatMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, total));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

export function isAllDayEntry(entry: PublicCalendarEntry, date: string): boolean {
  const { start, end } = dayBounds(date);
  const startsAt = new Date(entry.starts_at);
  const endsAt = new Date(entry.ends_at);
  return startsAt.getTime() <= start.getTime() && endsAt.getTime() >= end.getTime() - 60000;
}

export type TimelineSegment = {
  key: string;
  status: 'free' | 'busy' | 'tentative' | 'blocked';
  fromMin: number;
  toMin: number;
};

export function buildTimelineSegments(entries: PublicCalendarEntry[], date: string): TimelineSegment[] {
  const { start, end } = dayBounds(date);
  const timedEntries = entries
    .filter(entry => !isAllDayEntry(entry, date))
    .map(entry => {
      const startsAt = new Date(entry.starts_at);
      const endsAt = new Date(entry.ends_at);
      const clippedStart = new Date(Math.max(startsAt.getTime(), start.getTime()));
      const clippedEnd = new Date(Math.min(endsAt.getTime(), end.getTime()));
      return {
        ...entry,
        fromMin: minutesInDay(clippedStart),
        toMin: clippedEnd.getTime() >= end.getTime() ? 24 * 60 : minutesInDay(clippedEnd),
      };
    })
    .filter(entry => entry.toMin > entry.fromMin)
    .sort((a, b) => a.fromMin - b.fromMin || a.toMin - b.toMin);

  const segments: TimelineSegment[] = [];
  let cursor = 0;

  for (const entry of timedEntries) {
    if (entry.fromMin > cursor) {
      segments.push({ key: `free-${cursor}-${entry.fromMin}`, status: 'free', fromMin: cursor, toMin: entry.fromMin });
    }
    const fromMin = Math.max(cursor, entry.fromMin);
    if (entry.toMin > fromMin) {
      segments.push({ key: entry.id, status: entry.status === 'free' ? 'free' : entry.status, fromMin, toMin: entry.toMin });
      cursor = Math.max(cursor, entry.toMin);
    }
  }

  if (cursor < 24 * 60) {
    segments.push({ key: `free-${cursor}-1440`, status: 'free', fromMin: cursor, toMin: 24 * 60 });
  }

  return segments.filter(segment => segment.toMin - segment.fromMin >= 15);
}
