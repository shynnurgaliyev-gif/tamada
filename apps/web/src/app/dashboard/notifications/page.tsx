'use client';
import { useEffect, useState } from 'react';

import { API_URL as API } from '@/lib/env';

type Provider = { id: string; display_name: string };
type Log = {
  id: string;
  notification_type: string;
  delivery_status: 'sent' | 'failed';
  message_text: string | null;
  error_text: string | null;
  created_at: string;
};

const typeLabel: Record<string, string> = {
  event_reminder: 'Событие',
  subscription_reminder: 'Подписка',
  calendar_stale_reminder: 'Неактивный календарь',
};

import { getSessionToken as getToken } from '@/lib/auth';

export default function NotificationsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (!d.ok) { window.location.href = '/login'; return; }
        const list = d.providers ?? [];
        setProviders(list);
        if (list[0]) setSelectedId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setLogs([]);
    fetch(`${API}/providers/${selectedId}/notifications`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; logs?: Log[] }) => {
        if (d.ok) setLogs(d.logs ?? []);
      });
  }, [selectedId]);

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  return (
    <div style={s.page}>
      <a href="/dashboard" style={s.back}>← Кабинет</a>
      <h1 style={s.title}>Напоминания</h1>

      {providers.length > 1 && (
        <select style={s.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      )}

      <section style={s.section}>
        {logs.length === 0 ? (
          <p style={s.empty}>Напоминания ещё не отправлялись.</p>
        ) : (
          <div style={s.list}>
            {logs.map(log => (
              <div key={log.id} style={s.row}>
                <div style={s.rowTop}>
                  <span style={{ ...s.badge, background: log.delivery_status === 'sent' ? '#dcfce7' : '#fee2e2', color: log.delivery_status === 'sent' ? '#16a34a' : '#dc2626' }}>
                    {log.delivery_status === 'sent' ? '✓ Отправлено' : '✗ Ошибка'}
                  </span>
                  <span style={s.type}>{typeLabel[log.notification_type] ?? log.notification_type}</span>
                  <span style={s.date}>{new Date(log.created_at).toLocaleString('ru-RU')}</span>
                </div>
                {log.message_text && (
                  <pre style={s.preview}>{log.message_text.replace(/<[^>]+>/g, '').slice(0, 200)}</pre>
                )}
                {log.error_text && (
                  <p style={s.error}>{log.error_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 640, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' },
  back: { color: '#9ca3af', textDecoration: 'none', fontSize: 14 },
  title: { margin: '16px 0 24px', fontSize: 22, fontWeight: 700 },
  select: { width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, marginBottom: 20 },
  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  empty: { color: '#6b7280', fontSize: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: { border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 12px', background: '#fafafa' },
  rowTop: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 },
  badge: { padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  type: { fontSize: 13, fontWeight: 500, color: '#374151' },
  date: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },
  preview: { fontSize: 12, color: '#6b7280', whiteSpace: 'pre-wrap', margin: '4px 0 0', fontFamily: 'inherit' },
  error: { fontSize: 12, color: '#dc2626', margin: '4px 0 0' },
};
