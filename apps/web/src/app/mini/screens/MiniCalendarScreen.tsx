/* ── MiniCalendarScreen ────────────────────────────────────────────────────────
   Calendar tab orchestrator. View routing:
     month → new-entry / edit-entry  (day entries shown inline on month view)
   Uses Telegram BackButton for back-navigation.
────────────────────────────────────────────────────────────────────────────── */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTelegramWebApp }                from '@/lib/telegram';
import { useCalendar }                      from '../hooks/useCalendar';
import { CalendarMonthView }                from './calendar/CalendarMonthView';
import { CalendarEntryForm }                from './calendar/CalendarEntryForm';
import type { Provider, CalendarEntryWithClient, EntryInput } from '../types';

type CalView = 'month' | 'new-entry' | 'edit-entry';

export function MiniCalendarScreen({
  provider,
  openNewEntry,
  onNewEntryHandled,
  onCreateFirstProfile,
}: {
  provider:               Provider | null;
  openNewEntry:           boolean;
  onNewEntryHandled:      () => void;
  onCreateFirstProfile?:  () => void;
}) {
  const [view,         setView]         = useState<CalView>('month');
  const [editingEntry, setEditingEntry] = useState<CalendarEntryWithClient | null>(null);

  const cal = useCalendar(provider?.id ?? null);

  /* ── Handle openNewEntry signal from parent ───────────────────────────── */
  useEffect(() => {
    if (openNewEntry) {
      setEditingEntry(null);
      setView('new-entry');
      onNewEntryHandled();
    }
  }, [openNewEntry, onNewEntryHandled]);

  /* ── Telegram BackButton ──────────────────────────────────────────────── */
  const goBack = useCallback(() => setView('month'), []);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    if (view !== 'month') {
      tg.BackButton.show();
      tg.BackButton.onClick(goBack);
      return () => { tg.BackButton.offClick(goBack); tg.BackButton.hide(); };
    }
    tg.BackButton.hide();
  }, [view, goBack]);

  /* ── No provider ─────────────────────────────────────────────────────── */
  if (!provider) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 56 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📅</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Создайте профиль</div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 28, lineHeight: 1.5 }}>
          Календарь доступен после создания профиля
        </div>
        {onCreateFirstProfile && (
          <button
            onClick={onCreateFirstProfile}
            className="mini-btn mini-btn-primary mini-tap"
            style={{ width: 'auto', padding: '13px 28px', display: 'inline-flex' }}
          >
            Создать профиль
          </button>
        )}
      </div>
    );
  }

  /* ── Mutation handlers ───────────────────────────────────────────────── */
  async function handleSave(data: EntryInput) {
    let result: CalendarEntryWithClient | null = null;
    if (view === 'edit-entry' && editingEntry) {
      result = await cal.updateEntry(editingEntry.id, data);
    } else {
      result = await cal.createEntry(data);
    }
    if (result) {
      const localDate = new Date(result.starts_at).toLocaleDateString('sv-SE');
      cal.selectDate(localDate);
      setView('month');
    }
  }

  async function handleDelete() {
    if (!editingEntry) return;
    const ok = await cal.deleteEntry(editingEntry.id);
    if (ok) {
      setEditingEntry(null);
      setView('month');
    }
  }

  const formDefaultDate = cal.selectedDate ?? new Date().toLocaleDateString('sv-SE');

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div>
      {view === 'month' && (
        <CalendarMonthView
          year={cal.year}
          month={cal.month}
          days={cal.days}
          loading={cal.monthLoading}
          selectedDate={cal.selectedDate}
          onSelectDate={date => cal.selectDate(date)}
          onPrev={cal.prevMonth}
          onNext={cal.nextMonth}
          dayEntries={cal.dayEntries}
          dayLoading={cal.dayLoading}
          onEditEntry={entry => { setEditingEntry(entry); setView('edit-entry'); }}
          onAddEntry={() => { setEditingEntry(null); setView('new-entry'); }}
        />
      )}

      {(view === 'new-entry' || view === 'edit-entry') && (
        <CalendarEntryForm
          entry={view === 'edit-entry' ? editingEntry : null}
          defaultDate={formDefaultDate}
          saving={cal.saving}
          saveError={cal.saveError}
          onSave={handleSave}
          onDelete={view === 'edit-entry' ? handleDelete : undefined}
          onCancel={goBack}
        />
      )}
    </div>
  );
}
