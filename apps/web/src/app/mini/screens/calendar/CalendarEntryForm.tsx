/* ── CalendarEntryForm ─────────────────────────────────────────────────────────
   Create / edit a calendar entry.
   Order: статус (dropdown) → дата/диапазон → время → заголовок → заметки → клиент
   Vacation: диапазон дат, без времени, без клиента.
────────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { CalendarEntryWithClient, CalendarEntryStatus, EntryInput } from '../../types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function toDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE');
}
function toTimeStr(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function isAllDayEntry(entry: CalendarEntryWithClient): boolean {
  const s = new Date(entry.starts_at), e = new Date(entry.ends_at);
  return s.getHours() === 0 && s.getMinutes() === 0 &&
    ((e.getHours() === 23 && e.getMinutes() >= 55) ||
     (e.getHours() === 0  && e.getMinutes() === 0 && e.getDate() > s.getDate()));
}
function buildISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}
function buildDayStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toISOString();
}
function buildDayEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:00`).toISOString();
}

/* ── Status options ────────────────────────────────────────────────────────── */

const STATUS_OPTIONS: { value: CalendarEntryStatus; icon: string; label: string; color: string }[] = [
  { value: 'busy',      icon: '🔴', label: 'Занят',        color: '#ef4444' },
  { value: 'tentative', icon: '🟡', label: 'Под вопросом', color: '#ca8a04' },
  { value: 'vacation',  icon: '🏖️', label: 'Отпуск',       color: '#0891b2' },
];

/* ── Component ─────────────────────────────────────────────────────────────── */

export function CalendarEntryForm({
  entry,
  defaultDate,
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
  const today  = new Date().toLocaleDateString('sv-SE');

  /* ── Initial state ────────────────────────────────────────────────────── */
  const initStatus  = entry?.status ?? 'busy';
  const initDate    = entry ? toDateStr(entry.starts_at) : (defaultDate ?? today);
  const initDateTo  = entry ? toDateStr(entry.ends_at) : initDate;
  const initAllDay  = entry ? isAllDayEntry(entry) : false;
  const initStart   = (entry && !initAllDay) ? toTimeStr(entry.starts_at) : '10:00';
  const initEnd     = (entry && !initAllDay) ? toTimeStr(entry.ends_at)   : '12:00';

  const [status,       setStatus]       = useState<CalendarEntryStatus>(initStatus);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dateFrom,     setDateFrom]     = useState(initDate);
  const [dateTo,       setDateTo]       = useState(initDateTo);
  const [allDay,       setAllDay]       = useState(initAllDay);
  const [timeS,        setTimeS]        = useState(initStart);
  const [timeE,        setTimeE]        = useState(initEnd);
  const [title,        setTitle]        = useState(entry?.title ?? '');
  const [notes,        setNotes]        = useState(entry?.notes ?? '');

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

  const isVacation = status === 'vacation';
  const currentOpt = STATUS_OPTIONS.find(o => o.value === status) ?? STATUS_OPTIONS[0]!;

  /* ── Submit ────────────────────────────────────────────────────────────── */
  async function handleSave() {
    let starts_at: string, ends_at: string;
    if (isVacation) {
      starts_at = buildDayStart(dateFrom);
      ends_at   = buildDayEnd(dateTo >= dateFrom ? dateTo : dateFrom);
    } else if (allDay) {
      starts_at = buildDayStart(dateFrom);
      ends_at   = buildDayEnd(dateFrom);
    } else {
      starts_at = buildISO(dateFrom, timeS);
      ends_at   = buildISO(dateFrom, timeE);
    }

    const hasClient = !isVacation && showClient &&
      (clientName || clientPhone || eventType || location || price || clientNotes);

    await onSave({
      starts_at, ends_at, status,
      title: title.trim() || null,
      notes: notes.trim() || null,
      client: hasClient ? {
        client_name:   clientName.trim()  || null,
        client_phone:  clientPhone.trim() || null,
        event_type:    eventType.trim()   || null,
        location_text: location.trim()    || null,
        price_amount:  price.trim()       || null,
        currency,
        notes:         clientNotes.trim() || null,
      } : undefined,
    });
  }

  /* ── Render ────────────────────────────────────────────────────────────── */
  return (
    <div>
      {/* ── Header ── */}
      <div className="mini-inline-header">
        <button className="mini-tap" onClick={onCancel}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: 'var(--tg-theme-hint-color,#6b7280)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
          Отмена
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{isEdit ? 'Редактировать' : 'Новая запись'}</span>
        <button className="mini-tap" onClick={() => void handleSave()} disabled={saving}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: saving ? 'rgba(124,58,237,.45)' : '#7c3aed', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      {saveError && (
        <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, fontSize: 13, color: '#dc2626' }}>
          {saveError}
        </div>
      )}

      {/* ── Status dropdown ── */}
      <div className="mini-field" style={{ position: 'relative' }}>
        <label>Статус</label>
        <button
          className="mini-tap"
          onClick={() => setDropdownOpen(v => !v)}
          style={{
            width: '100%', padding: '12px 14px',
            background: 'var(--tg-theme-bg-color, #f7f6ff)',
            border: `1.5px solid ${dropdownOpen ? currentOpt.color : 'var(--mini-border-input)'}`,
            borderRadius: 12, fontFamily: 'inherit', fontSize: 15,
            color: 'var(--tg-theme-text-color, #0a0a0f)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <span>{currentOpt.icon} {currentOpt.label}</span>
          <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color,#9ca3af)', marginLeft: 8 }}>
            {dropdownOpen ? '▴' : '▾'}
          </span>
        </button>

        {/* Backdrop */}
        {dropdownOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setDropdownOpen(false)} />
        )}

        {/* Dropdown list */}
        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--tg-theme-secondary-bg-color, #fff)',
            border: '1px solid var(--mini-border)',
            borderRadius: 12, overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,.12)',
            zIndex: 100,
          }}>
            {STATUS_OPTIONS.map((opt, i) => (
              <button
                key={opt.value}
                className="mini-tap"
                onClick={() => { setStatus(opt.value); setDropdownOpen(false); }}
                style={{
                  width: '100%', padding: '13px 16px',
                  background: status === opt.value ? `${opt.color}12` : 'transparent',
                  border: 'none',
                  borderTop: i > 0 ? '1px solid var(--mini-border)' : 'none',
                  fontFamily: 'inherit', fontSize: 15, fontWeight: status === opt.value ? 700 : 500,
                  color: status === opt.value ? opt.color : 'var(--tg-theme-text-color, #0a0a0f)',
                  textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.icon}</span>
                {opt.label}
                {status === opt.value && <span style={{ marginLeft: 'auto', fontSize: 14 }}>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Date / range ── */}
      {isVacation ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          <div className="mini-field" style={{ marginBottom: 0 }}>
            <label>С</label>
            <input type="date" className="mini-input" value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); if (dateTo < e.target.value) setDateTo(e.target.value); }} />
          </div>
          <div className="mini-field" style={{ marginBottom: 0 }}>
            <label>По</label>
            <input type="date" className="mini-input" value={dateTo} min={dateFrom}
              onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
      ) : (
        <>
          <div className="mini-field">
            <label>Дата</label>
            <input type="date" className="mini-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>

          {/* All-day toggle */}
          <div className="mini-toggle-row" style={{ marginBottom: 14 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Весь день</div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>Без конкретного времени</div>
            </div>
            <label className="mini-toggle">
              <input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} />
              <span className="mini-toggle-track" />
              <span className="mini-toggle-thumb" />
            </label>
          </div>

          {/* Time fields */}
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
        </>
      )}

      {/* ── Title / notes ── */}
      <div className="mini-field">
        <label>Заголовок (необязательно)</label>
        <input className="mini-input" value={title} maxLength={120}
          placeholder={isVacation ? 'Море, горы, поездка…' : 'Свадьба, стрижка, маникюр…'}
          onChange={e => setTitle(e.target.value)} />
      </div>

      <div className="mini-field">
        <label>Заметки</label>
        <textarea className="mini-input" rows={3} value={notes} maxLength={500}
          placeholder="Внутренние заметки…"
          onChange={e => setNotes(e.target.value)} />
      </div>

      {/* ── Client section — скрыто для отпуска ── */}
      {!isVacation && (
        <>
          <button className="mini-tap" onClick={() => setShowClient(v => !v)}
            style={{
              width: '100%', padding: '11px 14px', marginBottom: 10,
              border: '1px solid var(--mini-border)', borderRadius: 12,
              background: 'var(--tg-theme-secondary-bg-color, #fff)',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', textAlign: 'left', display: 'flex',
              alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span>👤 Данные клиента</span>
            <span style={{ fontSize: 16, color: 'var(--tg-theme-hint-color,#9ca3af)' }}>{showClient ? '▾' : '›'}</span>
          </button>

          {showClient && (
            <div style={{ padding: '0 4px' }}>
              <div className="mini-field">
                <label>Имя клиента</label>
                <input className="mini-input" value={clientName} maxLength={100}
                  placeholder="Алия Сейткали" onChange={e => setClientName(e.target.value)} />
              </div>
              <div className="mini-field">
                <label>Телефон</label>
                <input className="mini-input" type="tel" value={clientPhone} maxLength={20}
                  placeholder="+7 700 000 0000" onChange={e => setClientPhone(e.target.value)} />
              </div>
              <div className="mini-field">
                <label>Тип события / услуги</label>
                <input className="mini-input" value={eventType} maxLength={80}
                  placeholder="Свадьба, день рождения…" onChange={e => setEventType(e.target.value)} />
              </div>
              <div className="mini-field">
                <label>Место / адрес</label>
                <input className="mini-input" value={location} maxLength={200}
                  placeholder="Алматы, зал «Арман»" onChange={e => setLocation(e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                <div className="mini-field" style={{ marginBottom: 0 }}>
                  <label>Сумма</label>
                  <input className="mini-input" type="number" inputMode="decimal" value={price} maxLength={12}
                    placeholder="150000" onChange={e => setPrice(e.target.value)} />
                </div>
                <div className="mini-field" style={{ marginBottom: 0 }}>
                  <label>Валюта</label>
                  <select className="mini-input" value={currency} onChange={e => setCurrency(e.target.value)} style={{ width: 80 }}>
                    <option value="KZT">KZT</option>
                    <option value="USD">USD</option>
                    <option value="RUB">RUB</option>
                  </select>
                </div>
              </div>
              <div className="mini-field" style={{ marginTop: 10 }}>
                <label>Заметки клиента</label>
                <textarea className="mini-input" rows={2} value={clientNotes} maxLength={300}
                  placeholder="Пожелания, нюансы…" onChange={e => setClientNotes(e.target.value)} />
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Delete ── */}
      {isEdit && onDelete && (
        <button className="mcal-delete-btn mini-tap" onClick={onDelete} disabled={saving}
          style={{ opacity: saving ? 0.6 : 1, marginTop: 8 }}>
          Удалить запись
        </button>
      )}

      <div style={{ height: 24 }} />
    </div>
  );
}
