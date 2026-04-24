/* ── useCalendar ───────────────────────────────────────────────────────────────
   Manages calendar month overview + selected day entries + CRUD mutations.
   All times stored as ISO strings (UTC) by the backend; displayed in local
   device time (acceptable for KZ-based specialists).
────────────────────────────────────────────────────────────────────────────── */

import { useState, useCallback, useEffect } from 'react';
import type {
  DayInfo,
  CalendarEntryWithClient,
  EntryInput,
} from '../types';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';
function auth() {
  const token = localStorage.getItem('session_token') ?? '';
  const miniAuthToken = localStorage.getItem('mini_auth_token') ?? '';
  return {
    Authorization: `Bearer ${token}`,
    ...(miniAuthToken ? { 'X-Mini-Auth': miniAuthToken } : {}),
  };
}

/* ── Return shape ─────────────────────────────────────────────────────────── */

export interface CalendarHook {
  /* Month */
  year:         number;
  month:        number;          // 1-based
  days:         DayInfo[];
  monthLoading: boolean;
  timezone:     string;
  prevMonth:    () => void;
  nextMonth:    () => void;
  reloadMonth:  () => void;

  /* Day */
  selectedDate: string | null;   // 'YYYY-MM-DD'
  dayEntries:   CalendarEntryWithClient[];
  dayLoading:   boolean;
  selectDate:   (date: string | null) => void;

  /* Mutations */
  saving:       boolean;
  saveError:    string | null;
  createEntry:  (data: EntryInput)                          => Promise<CalendarEntryWithClient | null>;
  updateEntry:  (id: string, data: Partial<EntryInput>)     => Promise<CalendarEntryWithClient | null>;
  deleteEntry:  (id: string)                                => Promise<boolean>;
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export function useCalendar(providerId: string | null): CalendarHook {
  const now = new Date();

  const [year,         setYear]         = useState(now.getFullYear());
  const [month,        setMonth]        = useState(now.getMonth() + 1);  // 1-based
  const [days,         setDays]         = useState<DayInfo[]>([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [timezone,     setTimezone]     = useState('Asia/Almaty');

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEntries,   setDayEntries]   = useState<CalendarEntryWithClient[]>([]);
  const [dayLoading,   setDayLoading]   = useState(false);

  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ── Month loader ──────────────────────────────────────────────────────── */

  const reloadMonth = useCallback(() => {
    if (!providerId) return;
    setMonthLoading(true);
    fetch(`${API}/providers/${providerId}/calendar/month?year=${year}&month=${month}`, {
      headers: auth(),
    })
      .then(r => r.json())
      .then((d: { ok: boolean; days?: DayInfo[]; timezone?: string }) => {
        if (d.ok) {
          setDays(d.days ?? []);
          if (d.timezone) setTimezone(d.timezone);
        }
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setMonthLoading(false));
  }, [providerId, year, month]);

  useEffect(() => { reloadMonth(); }, [reloadMonth]);

  /* ── Month navigation ─────────────────────────────────────────────────── */

  const prevMonth = useCallback(() => {
    setSelectedDate(null);
    setDayEntries([]);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else             { setMonth(m => m - 1); }
  }, [month]);

  const nextMonth = useCallback(() => {
    setSelectedDate(null);
    setDayEntries([]);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else              { setMonth(m => m + 1); }
  }, [month]);

  /* ── Day loader ────────────────────────────────────────────────────────── */

  const selectDate = useCallback((date: string | null) => {
    setSelectedDate(date);
    if (!date || !providerId) return;

    // from = day start, to = day end (exclusive next day)
    const from = `${date}T00:00:00.000Z`;
    const next = new Date(date);
    next.setDate(next.getDate() + 1);
    const to   = next.toISOString().slice(0, 10) + 'T00:00:00.000Z';

    setDayLoading(true);
    fetch(`${API}/providers/${providerId}/calendar?from=${from}&to=${to}`, {
      headers: auth(),
    })
      .then(r => r.json())
      .then((d: { ok: boolean; entries?: CalendarEntryWithClient[] }) => {
        if (d.ok) setDayEntries(d.entries ?? []);
      })
      .catch(() => {/* non-fatal */})
      .finally(() => setDayLoading(false));
  }, [providerId]);

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  async function afterMutation() {
    reloadMonth();
    if (selectedDate) selectDate(selectedDate);
  }

  const createEntry = useCallback(async (data: EntryInput): Promise<CalendarEntryWithClient | null> => {
    if (!providerId) return null;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`${API}/providers/${providerId}/calendar`, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d: { ok: boolean; entry?: CalendarEntryWithClient; error?: string } = await r.json();
      if (d.ok && d.entry) { await afterMutation(); return d.entry; }
      setSaveError(d.error ?? 'Ошибка сохранения');
      return null;
    } catch {
      setSaveError('Нет соединения');
      return null;
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, selectedDate]);

  const updateEntry = useCallback(async (
    id: string,
    data: Partial<EntryInput>,
  ): Promise<CalendarEntryWithClient | null> => {
    if (!providerId) return null;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`${API}/providers/${providerId}/calendar/${id}`, {
        method: 'PATCH',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const d: { ok: boolean; entry?: CalendarEntryWithClient; error?: string } = await r.json();
      if (d.ok && d.entry) { await afterMutation(); return d.entry; }
      setSaveError(d.error ?? 'Ошибка сохранения');
      return null;
    } catch {
      setSaveError('Нет соединения');
      return null;
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, selectedDate]);

  const deleteEntry = useCallback(async (id: string): Promise<boolean> => {
    if (!providerId) return false;
    setSaving(true);
    setSaveError(null);
    try {
      const r = await fetch(`${API}/providers/${providerId}/calendar/${id}`, {
        method: 'DELETE',
        headers: auth(),
      });
      const d: { ok: boolean } = await r.json();
      if (d.ok) await afterMutation();
      return d.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerId, selectedDate]);

  return {
    year, month, days, monthLoading, timezone,
    prevMonth, nextMonth, reloadMonth,
    selectedDate, dayEntries, dayLoading, selectDate,
    saving, saveError,
    createEntry, updateEntry, deleteEntry,
  };
}
