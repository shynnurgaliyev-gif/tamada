'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = { id: string; display_name: string; slug: string; timezone: string; };
type CalendarEntry = {
  id: string; starts_at: string; ends_at: string;
  status: string; title: string | null; notes: string | null;
  client: { client_name: string | null; client_phone: string | null; event_type: string | null; price_amount: string | null; currency: string; } | null;
};

const statusColor: Record<string, string> = {
  busy: '#ef4444', free: '#22c55e', tentative: '#f59e0b', blocked: '#6b7280',
};
const statusLabel: Record<string, string> = {
  busy: 'Занято', free: 'Свободно', tentative: 'Под вопросом', blocked: 'Недоступно',
};

function fmtDate(d: string, tz: string) {
  return new Date(d).toLocaleString('ru-RU', { timeZone: tz, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function CalendarPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [timezone, setTimezone] = useState('Asia/Almaty');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (!d.ok) { window.location.href = '/login'; return; }
        const list = d.providers ?? [];
        setProviders(list);
        if (list[0]) setSelectedId(list[0].id);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const token = localStorage.getItem('session_token') ?? '';
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 90 * 86400000).toISOString();
    fetch(`${API}/providers/${selectedId}/calendar?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; entries?: CalendarEntry[]; timezone?: string }) => {
        if (d.ok) {
          setEntries(d.entries ?? []);
          setTimezone(d.timezone ?? 'Asia/Almaty');
        }
      })
      .catch(() => null);
  }, [selectedId]);

  async function deleteEntry(id: string) {
    const token = localStorage.getItem('session_token') ?? '';
    await fetch(`${API}/providers/${selectedId}/calendar/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <h1 style={s.title}>Календарь</h1>
        <a href={selectedId ? `/dashboard/calendar/new?provider=${selectedId}` : '#'} style={s.btn}>+ Добавить</a>
      </div>

      {providers.length > 1 && (
        <select style={s.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      )}

      {entries.length === 0 ? (
        <div style={s.empty}><p>Нет записей на ближайшие 90 дней.</p></div>
      ) : (
        <div style={s.list}>
          {entries.map(e => (
            <div key={e.id} style={s.card}>
              <div style={s.cardLeft}>
                <span style={{ ...s.statusDot, background: statusColor[e.status] ?? '#888' }} />
                <div>
                  <div style={s.timeRow}>
                    <span style={s.time}>{fmtDate(e.starts_at, timezone)}</span>
                    <span style={s.timeSep}>→</span>
                    <span style={s.time}>{fmtDate(e.ends_at, timezone)}</span>
                  </div>
                  <div style={s.statusLabel}>{statusLabel[e.status] ?? e.status}{e.title ? ` · ${e.title}` : ''}</div>
                  {e.client?.client_name && <div style={s.clientName}>{e.client.client_name}{e.client.client_phone ? ` · ${e.client.client_phone}` : ''}</div>}
                  {e.client?.price_amount && <div style={s.price}>{e.client.price_amount} {e.client.currency}</div>}
                </div>
              </div>
              <div style={s.cardActions}>
                <a href={`/dashboard/calendar/${e.id}?provider=${selectedId}`} style={s.editBtn}>✎</a>
                <button onClick={() => { if (confirm('Удалить запись?')) void deleteEntry(e.id); }} style={s.delBtn}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <a href="/dashboard" style={s.back}>← Кабинет</a>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 680, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { margin: 0, fontSize: 22, fontWeight: 700 },
  btn: { background: '#111', color: '#fff', padding: '8px 16px', borderRadius: 8, textDecoration: 'none', fontSize: 14 },
  select: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 16 },
  empty: { textAlign: 'center', padding: '48px 0', color: '#9ca3af' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  card: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft: { display: 'flex', gap: 12, alignItems: 'flex-start' },
  statusDot: { width: 10, height: 10, borderRadius: '50%', marginTop: 5, flexShrink: 0 },
  timeRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time: { fontSize: 14, fontWeight: 600, color: '#111' },
  timeSep: { fontSize: 12, color: '#9ca3af' },
  statusLabel: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  clientName: { fontSize: 13, color: '#374151', marginTop: 4 },
  price: { fontSize: 13, fontWeight: 600, color: '#111', marginTop: 2 },
  cardActions: { display: 'flex', gap: 6, flexShrink: 0 },
  editBtn: { background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', textDecoration: 'none', fontSize: 14 },
  delBtn: { background: 'none', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px' },
  back: { color: '#9ca3af', textDecoration: 'none', fontSize: 14 },
};
