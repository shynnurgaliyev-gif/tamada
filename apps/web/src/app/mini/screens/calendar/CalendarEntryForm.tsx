/* ── CalendarEntryForm ─────────────────────────────────────────────────────────
   Create / edit a calendar entry.
   All-day toggle collapses the time fields.
   Client section is collapsible.
────────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { CalendarEntryWithClient, CalendarEntryStatus, EntryInput } from '../../types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function toDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE'); // 'YYYY-MM-DD'
}
function toTimeStr(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function isAllDayEntry(entry: CalendarEntryWithClient): boolean {
  const s = new Date(entry.starts_at);
  const e = new Date(entry.ends_at);
  return (
    s.getHours() === 0 && s.getMinutes() === 0 &&
    ((e.getHours() === 23 && e.getMinutes() >= 55) ||
     (e.getHours() === 0  && e.getMinutes() === 0 && e.getDate() > s.getDate()))
  );
}
function buildISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}
function buildAllDayStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}
function buildAllDayEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:00`).toISOString();
}

/* ── Status options ────────────────────────────────────────────────────────── */

const STATUS_OPTIONS: { value: CalendarEntryStatus; icon: string; label: string }[] = [
  { value: 'busy',      icon: '🔴', label: 'Занят' },
  { value: 'tentative', icon: '🟡', label: 'Под вопросом' },
  { value: 'blocked',   icon: '⛔', label: 'Заблокировано' },
];

/* ── Component ─────────────────────────────────────────────────────────────── */

export function CalendarEntryForm({
  entry,          // null = new entry
  defaultDate,    // 'YYYY-MM-DD' — pre-fill date for new entries
  saving,
  saveError,
  onSave,
  onDelete,
  onCancel,
}: {
  entry:       CalendarEntryWithClient | null;
  defaultDate: string | null;
  saving:      boolean;
  saveError:   string | null;
  onSave:      (data: EntryInput) => Promise<void>;
  onDelete?:   () => Promise<void>;
  onCancel:    () => void;
}) {
  const isEdit = !!entry;

  /* ── Initial state ────────────────────────────────────────────────────── */
  const today = new Date().toLocaleDateString('sv-SE');
  const initDate  = entry ? toDateStr(entry.starts_at) : (defaultDate ?? today);
  const initAllDay = entry ? isAllDayEntry(entry) : false;
  const initStart = (entry && !initAllDay) ? toTimeStr(entry.starts_at) : '10:00';
  const initEnd   = (entry && !initAllDay) ? toTimeStr(entry.ends_at)   : '12:00';

  const [date,    setDate]    = useState(initDate);
  const [allDay,  setAllDay]  = useState(initAllDay);
  const [timeS,   setTimeS]   = useState(initStart);
  const [timeE,   setTimeE]   = useState(initEnd);
  const [status,  setStatus]  = useState<CalendarEntryStatus>(entry?.status ?? 'busy');
  const [title,   setTitle]   = useState(entry?.title ?? '');
  const [notes,   setNotes]   = useState(entry?.notes ?? '');

  /* Client fields */
  const cl = entry?.client;
  const [showClient,  setShowClient]  = useState(!!cl);
  const [clientName,  setClientName]  = useState(cl?.client_name  ?? '');
  const [clientPhone, setClientPhone] = useState(cl?.client_phone ?? '');
  const [eventType,   setEventType]   = useState(cl?.event_type   ?? '');
  const [location,    setLocation]    = useState(cl?.location_text ?? '');
  const [price,       setPrice]       = useState(cl?.price_amount  ?? '');
  const [currency,    setCurrency]    = useState(cl?.currency      ?? 'KZT');
  const [clientNotes, setClientNotes] = useState(cl?.notes         ?? '');

  /* ── Submit ────────────────────────────────────────────────────────────── */

  async function handleSave() {
    const starts_at = allDay ? buildAllDayStart(date) : buildISO(date, timeS);
    const ends_at   = allDay ? buildAllDayEnd(date)   : buildISO(date, timeE);

    const hasClient = showClient && (clientName || clientPhone || eventType || location || price || clientNotes);

    await onSave({
      starts_at,
      ends_at,
      status,
      title:  title.trim() || null,
      notes:  notes.trim() || null,
      client: hasClient ? {
        client_name:   clientName.trim()   || null,
        client_phone:  clientPhone.trim()  || null,
        event_type:    eventType.trim()    || null,
        location_text: location.trim()     || null,
        price_amount:  price.trim()        || null,
        currency,
        notes:         clientNotes.trim()  || null,
      } : undefined,
    });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */

  return (
    <div>
      {/* ── Inline header: Отмена | title | Сохранить ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 14,
        borderBottom: '1px solid rgba(0,0,0,.07)',
      }}>
        <button
          className="mini-tap"
          onClick={onCancel}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: 'var(--tg-theme-hint-color,#6b7280)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Отмена
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>
          {isEdit ? 'Редактировать' : 'Новая запись'}
        </span>
        <button
          className="mini-tap"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: saving ? 'rgba(124,58,237,.45)' : '#7c3aed', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      {saveError && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, fontSize: 13, color: '#dc2626' }}>
          {saveError}
        </div>
      )}

      {/* Date */}
      <div className="mini-field">
        <label>Дата</label>
        <input type="date" className="mini-input" value={date} onChange={e => setDate(e.target.value)} />
      </div>

      {/* All-day toggle */}
      <div className="mini-toggle-row" style={{ marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Весь день занят</div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
            Без конкретного времени
          </div>
        </div>
        <label className="mini-toggle">
          <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
          <span className="mini-toggle-track" />
          <span className="mini-toggle-thumb" />
        </label>
      </div>

      {/* Time fields — hidden when all-day */}
      {!allDay && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="mini-field" style={{ marginBottom: 0 }}>
            <label>Начало</label>
            <input type="time" className="mini-input" value={timeS} onChange={e => setTimeS(e.target.value)} />
          </div>
          <div className="mini-field" style={{ marginBottom: 0 }}>
            <label>Конец</label>
            <input type="time" className="mini-input" value={timeE} onChange={e => setTimeE(e.target.value)} />
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mcal-form-section">Статус</div>
      <div className="mcal-status-grid">
        {STATUS_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className="mcal-status-btn mini-tap"
            data-selected={status === opt.value}
            onClick={() => setStatus(opt.value)}
          >
            <span style={{ fontSize: 20 }}>{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {/* Title / notes */}
      <div className="mini-field">
        <label>Заголовок (необязательно)</label>
        <input
          className="mini-input"
          value={title}
          maxLength={120}
          placeholder="Свадьба, стрижка, маникюр…"
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="mini-field">
        <label>Заметки</label>
        <textarea
          className="mini-input"
          rows={3}
          value={notes}
          maxLength={500}
          placeholder="Внутренние заметки…"
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Client section toggle */}
      <button
        className="mini-tap"
        onClick={() => setShowClient(v => !v)}
        style={{
          width: '100%', padding: '11px 14px', marginBottom: 10,
          border: '1px solid rgba(0,0,0,.09)', borderRadius: 12,
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', textAlign: 'left', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>👤 Данные клиента</span>
        <span style={{ fontSize: 16, color: 'rgba(0,0,0,.3)' }}>{showClient ? '▾' : '›'}</span>
      </button>

      {showClient && (
        <div style={{ padding: '0 4px' }}>
          <div className="mini-field">
            <label>Имя клиента</label>
            <input className="mini-input" value={clientName} maxLength={100}
              placeholder="Алия Сейткали"
              onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="mini-field">
            <label>Телефон</label>
            <input className="mini-input" type="tel" value={clientPhone} maxLength={20}
              placeholder="+7 700 000 0000"
              onChange={e => setClientPhone(e.target.value)} />
          </div>
          <div className="mini-field">
            <label>Тип события / услуги</label>
            <input className="mini-input" value={eventType} maxLength={80}
              placeholder="Свадьба, день рождения, маникюр…"
              onChange={e => setEventType(e.target.value)} />
          </div>
          <div className="mini-field">
            <label>Место / адрес</label>
            <input className="mini-input" value={location} maxLength={200}
              placeholder="Алматы, зал «Арман»"
              onChange={e => setLocation(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
            <div className="mini-field" style={{ marginBottom: 0 }}>
              <label>Сумма</label>
              <input className="mini-input" type="number" inputMode="decimal" value={price} maxLength={12}
                placeholder="150000"
                onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="mini-field" style={{ marginBottom: 0 }}>
              <label>Валюта</label>
              <select
                className="mini-input"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                style={{ width: 80 }}
              >
                <option value="KZT">KZT</option>
                <option value="USD">USD</option>
                <option value="RUB">RUB</option>
              </select>
            </div>
          </div>
          <div className="mini-field" style={{ marginTop: 10 }}>
            <label>Заметки клиента</label>
            <textarea className="mini-input" rows={2} value={clientNotes} maxLength={300}
              placeholder="Пожелания, нюансы…"
              onChange={e => setClientNotes(e.target.value)} />
          </div>
        </div>
      )}

      {isEdit && onDelete && (
        <button
          className="mcal-delete-btn mini-tap"
          onClick={onDelete}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1, marginTop: 8 }}
        >
          Удалить запись
        </button>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
