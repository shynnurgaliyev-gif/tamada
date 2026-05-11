'use client';
import { useEffect, useState, useCallback } from 'react';

import { API_URL as API } from '@/lib/env';
import { getSessionToken as getToken, authHeaders as authH, redirectToLogin } from '@/lib/auth';

type Provider = { id: string; display_name: string; timezone: string; };
type DayInfo  = { date: string; status: string; count: number };
type Entry    = {
  id: string; starts_at: string; ends_at: string;
  status: string; title: string | null; notes: string | null;
  client: { client_name: string | null; client_phone: string | null; event_type: string | null; price_amount: string | null; currency: string } | null;
};

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

// ── Status colours — vivid, consistent with landing page calendar ─────────────
const ST: Record<string, { bg: string; color: string; border: string; label: string }> = {
  free:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Свободно'      },
  busy:     { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3', label: 'Занято'         },
  partial:  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'Частично'       },
  tentative:{ bg: '#fefce8', color: '#ca8a04', border: '#fde68a', label: 'Под вопросом'   },
  past:     { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Прошлое'        },
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
  const [year, setYear]               = useState(now.getFullYear());
  const [month, setMonth]             = useState(now.getMonth() + 1);
  const [providers, setProviders]     = useState<Provider[]>([]);
  const [selectedId, setSelectedId]   = useState('');
  const [timezone, setTimezone]       = useState('Asia/Almaty');
  const [days, setDays]               = useState<DayInfo[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEntries, setDayEntries]   = useState<Entry[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [loadingDay, setLoadingDay]   = useState(false);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!getToken()) { redirectToLogin(); return; }
    fetch(`${API}/providers/me`, { headers: authH() })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (!d.ok) { redirectToLogin(); return; }
        const list = d.providers ?? [];
        setProviders(list);
        if (list[0]) { setSelectedId(list[0].id); setTimezone(list[0].timezone); }
      })
      .catch(() => { redirectToLogin(); })
      .finally(() => setLoading(false));
  }, []);

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

  useEffect(() => {
    if (!selectedDate || !selectedId) return;
    setLoadingDay(true);
    const from = `${selectedDate}T00:00:00.000Z`;
    const to   = `${selectedDate}T23:59:59.999Z`;
    fetch(`${API}/providers/${selectedId}/calendar?from=${from}&to=${to}`, { headers: authH() })
      .then(r => r.json())
      .then((d: { ok: boolean; entries?: Entry[] }) => { if (d.ok) setDayEntries(d.entries ?? []); })
      .catch(() => null)
      .finally(() => setLoadingDay(false));
  }, [selectedDate, selectedId]);

  function prevMonth() {
    setSelectedDate(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    setSelectedDate(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1);
  }

  async function deleteEntry(id: string) {
    if (!confirm('Удалить запись?')) return;
    await fetch(`${API}/providers/${selectedId}/calendar/${id}`, { method: 'DELETE', headers: authH() });
    setDayEntries(prev => prev.filter(e => e.id !== id));
    loadMonth();
  }

  const firstDow  = new Date(year, month - 1, 1).getDay();
  const startPad  = (firstDow + 6) % 7;
  const cells: (DayInfo | null)[] = [...Array(startPad).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const selectedInfo = days.find(d => d.date === selectedDate);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav className="nav-frosted">
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Кабинет</a>
        <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Календарь</h1>
        {selectedId && (
          <a
            href={`/dashboard/calendar/new?provider=${selectedId}${selectedDate ? `&date=${selectedDate}` : ''}`}
            className="btn btn-brand btn-sm"
          >
            + Добавить
          </a>
        )}
      </nav>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 16px 64px' }}>

        {/* Provider selector */}
        {providers.length > 1 && (
          <select className="input" style={{ marginBottom: 16 }} value={selectedId} onChange={e => {
            const p = providers.find(x => x.id === e.target.value);
            setSelectedId(e.target.value);
            if (p) setTimezone(p.timezone);
            setSelectedDate(null);
          }}>
            {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        )}

        {/* Calendar card */}
        <div className="card" style={{ padding: '20px 16px', marginBottom: 16 }}>

          {/* Month navigator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>{MONTHS_RU[month - 1]} {year}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={prevMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <button onClick={nextMonth} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', padding: '2px 0', textTransform: 'uppercase', letterSpacing: '.04em' }}>{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, opacity: loadingMonth ? .6 : 1, transition: 'opacity .2s' }}>
            {cells.map((cell, i) => {
              if (!cell) return <div key={`ep-${i}`} style={{ minHeight: 52 }} />;
              const st       = ST[cell.status] ?? ST.free!;
              const isToday  = cell.date === todayStr;
              const isSel    = cell.date === selectedDate;
              const dayNum   = parseInt(cell.date.slice(8), 10);
              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedDate(isSel ? null : cell.date)}
                  style={{
                    minHeight: 52, border: `1.5px solid ${isSel ? '#6d28d9' : isToday ? '#6d28d9' : st.border}`,
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: isSel ? '#ede9fe' : st.bg,
                    color: isSel ? '#6d28d9' : st.color,
                    fontWeight: isToday ? 800 : 500,
                    fontSize: 14,
                    transition: 'transform .1s, box-shadow .1s',
                    boxShadow: isSel ? '0 0 0 3px rgba(109,40,217,.2)' : undefined,
                  }}
                >
                  {dayNum}
                  {cell.count > 0 && (
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? '#6d28d9' : st.color, flexShrink: 0 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            {Object.entries(ST).map(([key, val]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: val.color, flexShrink: 0 }} />
                {val.label}
              </span>
            ))}
          </div>
        </div>

        {/* Day panel */}
        {selectedDate && (
          <div className="card anim-fadeUp" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
              <strong style={{ fontSize: 15 }}>{fmtDate(selectedDate + 'T12:00:00Z', timezone)}</strong>
              {selectedInfo && (
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: ST[selectedInfo.status]?.bg ?? '#f3f4f6', color: ST[selectedInfo.status]?.color ?? 'var(--ink)', border: `1px solid ${ST[selectedInfo.status]?.border ?? 'var(--border)'}` }}>
                  {ST[selectedInfo.status]?.label ?? selectedInfo.status}
                </span>
              )}
              <a href={`/dashboard/calendar/new?provider=${selectedId}&date=${selectedDate}`} className="btn btn-brand btn-sm" style={{ marginLeft: 'auto' }}>
                + Добавить запись
              </a>
            </div>

            {loadingDay ? (
              <p style={{ color: 'var(--ink-4)', fontSize: 13 }}>Загрузка...</p>
            ) : dayEntries.length === 0 ? (
              <p style={{ color: 'var(--ink-4)', fontSize: 13, margin: 0 }}>Нет записей на этот день</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEntries.map(e => {
                  const entryColor = e.status === 'busy' ? ST.busy!.color : e.status === 'tentative' ? ST.tentative!.color : 'var(--ink-3)';
                  return (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 14px', background: 'var(--surface-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: entryColor, marginTop: 5, flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                          {fmt(e.starts_at, timezone)} — {fmt(e.ends_at, timezone)}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                          {STATUS_ENTRY[e.status] ?? e.status}{e.title ? ` · ${e.title}` : ''}
                        </span>
                        {e.client?.client_name && (
                          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                            {e.client.client_name}{e.client.client_phone ? ` · ${e.client.client_phone}` : ''}
                          </span>
                        )}
                        {e.client?.price_amount && (
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>
                            {e.client.price_amount} {e.client.currency}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <a href={`/dashboard/calendar/${e.id}?provider=${selectedId}`} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px', fontSize: 13 }}>✎</a>
                        <button onClick={() => void deleteEntry(e.id)} className="btn btn-sm" style={{ padding: '4px 8px', fontSize: 13, background: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca' }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
