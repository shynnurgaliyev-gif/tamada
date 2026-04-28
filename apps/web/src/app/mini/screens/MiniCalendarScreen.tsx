/* ── MiniCalendarScreen ────────────────────────────────────────────────────────
   Calendar tab orchestrator. View routing:
     month → view-entry → edit-entry
     month → new-entry
   Uses Telegram BackButton for back-navigation.
────────────────────────────────────────────────────────────────────────────── */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { getTelegramWebApp }                from '@/lib/telegram';
import { useCalendar }                      from '../hooks/useCalendar';
import { CalendarMonthView }                from './calendar/CalendarMonthView';
import { CalendarEntryView }                from './calendar/CalendarEntryView';
import { CalendarEntryForm }                from './calendar/CalendarEntryForm';
import type { Provider, CalendarEntryWithClient, EntryInput } from '../types';

type CalView = 'month' | 'view-entry' | 'new-entry' | 'edit-entry';

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
  const [deleting,     setDeleting]     = useState(false);

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
  const goBack = useCallback(() => {
    if (view === 'view-entry') setView('month');
    if (view === 'new-entry')  setView('month');
    if (view === 'edit-entry') setView('view-entry');
  }, [view]);

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
      // After edit — go back to view; after new — go to month
      if (view === 'edit-entry') {
        setEditingEntry(result);
        setView('view-entry');
      } else {
        setView('month');
      }
    }
  }

  async function handleDelete() {
    if (!editingEntry) return;
    setDeleting(true);
    const ok = await cal.deleteEntry(editingEntry.id);
    setDeleting(false);
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
          onEditEntry={entry => { setEditingEntry(entry); setView('view-entry'); }}
          onAddEntry={() => { setEditingEntry(null); setView('new-entry'); }}
        />
      )}

      {view === 'view-entry' && editingEntry && (
        <CalendarEntryView
          entry={editingEntry}
          deleting={deleting}
          onEdit={() => setView('edit-entry')}
          onDelete={handleDelete}
          onBack={() => setView('month')}
        />
      )}

      {(view === 'new-entry' || view === 'edit-entry') && (
        <CalendarEntryForm
          entry={view === 'edit-entry' ? editingEntry : null}
          defaultDate={formDefaultDate}
          saving={cal.saving}
          saveError={cal.saveError}
          onSave={handleSave}
          {...(view === 'edit-entry' ? { onDelete: handleDelete } : {})}
          onCancel={goBack}
        />
      )}
    </div>
  );
}
