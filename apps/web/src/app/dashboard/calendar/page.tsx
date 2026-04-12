'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';
function getToken() { return localStorage.getItem('session_token') ?? ''; }
function authH() { return { Authorization: `Bearer ${getToken()}` }; }

type Provider = { id: string; display_name: string; timezone: string; };
type DayInfo = { date: string; status: string; count: number };
type Entry = {
  id: string; starts_at: string; ends_at: string;
  status: string; title: string | null; notes: string | null;
  client: { client_name: string | null; client_phone: string | null; event_type: string | null; price_amount: string | null; currency: string } | null;
};

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const ST: Record<string, { bg: string; color: string; label: string }> = {
  free:     { bg: '#dcfce7', color: '#166534', label: 'Свободно' },
  busy:     { bg: '#fee2e2', color: '#991b1b', label: 'Занято' },
  partial:  { bg: '#ffedd5', color: '#9a3412', label: 'Частично' },
  tentative:{ bg: '#fef9c3', color: '#92400e', label: 'Под вопросом' },
  past:     { bg: '#f3f4f6', color: '#9ca3af', label: 'Прошлое' },
};

const STATUS_ENTRY: Record<string, string> = {
  busy: 'Занято', free: 'Свободно', tentative: 'Под вопросом', blocked: 'Недоступно',
};

function fmt(d: string, tz: string) {
  return new Date(d).toLocaleString('ru-RU', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
}
function fmtDate(d: string, tz: string) {
  return new Date(d).toLocaleDateString('ru-RU', { timeZone: tz, day: 'numeric', month: 'long' });
}

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [timezone, setTimezone] = useState('Asia/Almaty');
  const [days, setDays] = useState<DayInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<Entry[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load providers
  useEffect(() => {
    if (!getToken()) { window.location.href = '/login'; return; }
    fetch(`${API}/providers/me`, { headers: authH() })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (!d.ok) { window.location.href = '/login'; return; }
        const list = d.providers ?? [];
        setProviders(list);
        if (list[0]) { setSelectedId(list[0].id); setTimezone(list[0].timezone); }
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  // Load month statuses
  const loadMonth = useCallback(() => {
    if (!selectedId) return;
    setLoadingMonth(true);
    fetch(`${API}/providers/${selectedId}/calendar/month?year=${year}&month=${month}`, { headers: authH() })
      .then(r => r.json())
      .then((d: { ok: boolean; days?: DayInfo[]; timezone?: string }) => {
        if (d.ok) { setDays(d.days ?? []); if (d.timezone) setTimezone(d.timezone); }
      })
      .catch(() => null)
      .finally(() => setLoadingMonth(false));
  }, [selectedId, year, month]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // Load day entries when date selected
  useEffect(() => {
    if (!selectedDate || !selectedId) return;
    setLoadingDay(true);
    const from = `${selectedDate}T00:00:00.000Z`;
    const to = `${selectedDate}T23:59:59.999Z`;
    fetch(`${API}/providers/${selectedId}/calendar?from=${from}&to=${to}`, { headers: authH() })
      .then(r => r.json())
      .then((d: { ok: boolean; entries?: Entry[] }) => {
        if (d.ok) setDayEntries(d.entries ?? []);
      })
      .catch(() => null)
      .finally(() => setLoadingDay(false));
  }, [selectedDate, selectedId]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  }

  async function deleteEntry(id: string) {
    if (!confirm('Удалить запись?')) return;
    await fetch(`${API}/providers/${selectedId}/calendar/${id}`, { method: 'DELETE', headers: authH() });
    setDayEntries(prev => prev.filter(e => e.id !== id));
    loadMonth();
  }

  // Build 7-column grid
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const startPad = (firstDow + 6) % 7; // Mon=0
  const cells: (DayInfo | null)[] = [
    ...Array(startPad).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const selectedInfo = days.find(d => d.date === selectedDate);

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <a href="/dashboard" style={s.back}>← Кабинет</a>
          <h1 style={s.title}>Календарь</h1>
        </div>
        {selectedId && (
          <a href={`/dashboard/calendar/new?provider=${selectedId}${selectedDate ? `&date=${selectedDate}` : ''}`} style={s.addBtn}>
            + Добавить
          </a>
        )}
      </div>

      {/* Provider selector */}
      {providers.length > 1 && (
        <select style={s.select} value={selectedId} onChange={e => {
          const p = providers.find(x => x.id === e.target.value);
          setSelectedId(e.target.value);
          if (p) setTimezone(p.timezone);
          setSelectedDate(null);
        }}>
          {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      )}

      {/* Month navigator */}
      <div style={s.monthNav}>
        <button onClick={prevMonth} style={s.navBtn}>‹</button>
        <span style={s.monthLabel}>{MONTHS_RU[month - 1]} {year}</span>
        <button onClick={nextMonth} style={s.navBtn}>›</button>
      </div>

      {/* Calendar grid */}
      <div style={s.grid}>
        {DAYS_SHORT.map(d => (
          <div key={d} style={s.dayHeader}>{d}</div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} style={s.emptyCell} />;
          const st = ST[cell.status] ?? ST.free;
          const isToday = cell.date === todayStr;
          const isSelected = cell.date === selectedDate;
          const dayNum = parseInt(cell.date.slice(8), 10);
          return (
            <button
              key={cell.date}
              onClick={() => setSelectedDate(cell.date)}
              style={{
                ...s.dayCell,
                background: st.bg,
                color: st.color,
                boxShadow: isSelected
                  ? 'inset 0 0 0 2px #111'
                  : isToday
                    ? 'inset 0 0 0 2px #3b82f6'
                    : undefined,
                fontWeight: isToday ? 700 : 400,
              }}
            >
              <span style={s.dayNum}>{dayNum}</span>
              {cell.count > 0 && <span style={{ ...s.dot, background: st.color }} />}
            </button>
          );
        })}
      </div>

      {loadingMonth && <p style={s.hint}>Загрузка...</p>}

      {/* Legend */}
      <div style={s.legend}>
        {Object.entries(ST).map(([key, val]) => (
          <span key={key} style={s.legendItem}>
            <span style={{ ...s.legendDot, background: val.color }} />
            {val.label}
          </span>
        ))}
      </div>

      {/* Day panel */}
      {selectedDate && (
        <div style={s.dayPanel}>
          <div style={s.dayPanelHeader}>
            <strong>{fmtDate(selectedDate + 'T12:00:00Z', timezone)}</strong>
            {selectedInfo && (
              <span style={{ ...s.dayPanelBadge, background: ST[selectedInfo.status]?.bg ?? '#f3f4f6', color: ST[selectedInfo.status]?.color ?? '#111' }}>
                {ST[selectedInfo.status]?.label ?? selectedInfo.status}
              </span>
            )}
            <a href={`/dashboard/calendar/new?provider=${selectedId}&date=${selectedDate}`} style={s.addDayBtn}>
              + Добавить запись
            </a>
          </div>

          {loadingDay ? (
            <p style={s.hint}>Загрузка...</p>
          ) : dayEntries.length === 0 ? (
            <p style={s.hint}>Нет записей на этот день</p>
          ) : (
            <div style={s.entryList}>
              {dayEntries.map(e => (
                <div key={e.id} style={s.entryRow}>
                  <div style={{ ...s.entryDot, background: e.status === 'busy' ? '#ef4444' : e.status === 'tentative' ? '#f59e0b' : '#6b7280' }} />
                  <div style={s.entryInfo}>
                    <span style={s.entryTime}>{fmt(e.starts_at, timezone)} — {fmt(e.ends_at, timezone)}</span>
                    <span style={s.entryStatus}>{STATUS_ENTRY[e.status] ?? e.status}{e.title ? ` · ${e.title}` : ''}</span>
                    {e.client?.client_name && <span style={s.entryClient}>{e.client.client_name}{e.client.client_phone ? ` · ${e.client.client_phone}` : ''}</span>}
                    {e.client?.price_amount && <span style={s.entryPrice}>{e.client.price_amount} {e.client.currency}</span>}
                  </div>
                  <div style={s.entryActions}>
                    <a href={`/dashboard/calendar/${e.id}?provider=${selectedId}`} style={s.editBtn}>✎</a>
                    <button onClick={() => void deleteEntry(e.id)} style={s.delBtn}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page:           { maxWidth: 680, margin: '0 auto', padding: '20px 12px', fontFamily: 'system-ui, sans-serif' },
  header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 },
  back:           { color: '#9ca3af', textDecoration: 'none', fontSize: 13, display: 'block', marginBottom: 4 },
  title:          { margin: 0, fontSize: 22, fontWeight: 700 },
  addBtn:         { background: '#111', color: '#fff', padding: '9px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, whiteSpace: 'nowrap' },
  select:         { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 12 },
  monthNav:       { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  navBtn:         { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#374151' },
  monthLabel:     { fontSize: 17, fontWeight: 600, minWidth: 160, textAlign: 'center' },
  grid:           { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 },
  dayHeader:      { textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#9ca3af', padding: '4px 0', textTransform: 'uppercase' },
  emptyCell:      { minHeight: 44 },
  dayCell:        { minHeight: 52, border: 'none', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4, transition: 'opacity .15s' },
  dayNum:         { fontSize: 15, lineHeight: 1 },
  dot:            { width: 6, height: 6, borderRadius: '50%' },
  hint:           { fontSize: 13, color: '#9ca3af', margin: '8px 0' },
  legend:         { display: 'flex', flexWrap: 'wrap', gap: 12, margin: '14px 0 0', padding: '12px 0', borderTop: '1px solid #f3f4f6' },
  legendItem:     { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6b7280' },
  legendDot:      { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  dayPanel:       { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 16 },
  dayPanelHeader: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 },
  dayPanelBadge:  { padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  addDayBtn:      { marginLeft: 'auto', background: '#111', color: '#fff', padding: '6px 14px', borderRadius: 8, textDecoration: 'none', fontSize: 13, whiteSpace: 'nowrap' },
  entryList:      { display: 'flex', flexDirection: 'column', gap: 8 },
  entryRow:       { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '1px solid #f3f4f6' },
  entryDot:       { width: 10, height: 10, borderRadius: '50%', marginTop: 4, flexShrink: 0 },
  entryInfo:      { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
  entryTime:      { fontSize: 14, fontWeight: 600, color: '#111' },
  entryStatus:    { fontSize: 13, color: '#6b7280' },
  entryClient:    { fontSize: 13, color: '#374151' },
  entryPrice:     { fontSize: 13, fontWeight: 600, color: '#111' },
  entryActions:   { display: 'flex', gap: 4, flexShrink: 0 },
  editBtn:        { background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '4px 8px', textDecoration: 'none', fontSize: 13, border: 'none', cursor: 'pointer' },
  delBtn:         { background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 13, padding: '4px 6px' },
};
