'use client';

import { useEffect, useState } from 'react';
import type { Provider } from '../../types';
import { API_URL as API } from '@/lib/env';
import { auth, ToolTitle } from './_shared';

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

export function NotificationsTool({ provider }: { provider: Provider | null }) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!provider) return;
    setLoading(true);
    fetch(`${API}/providers/${provider.id}/notifications`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; logs?: Log[] }) => { if (d.ok) setLogs(d.logs ?? []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [provider?.id]);

  return (
    <div>
      <ToolTitle title="Напоминания" subtitle={provider ? provider.display_name : 'Выберите профиль'} />
      <div className="mini-card">
        {loading ? (
          <div className="mini-skeleton" style={{ height: 72 }} />
        ) : logs.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            Напоминания ещё не отправлялись.
          </div>
        ) : (
          logs.map(log => <NotificationRow key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
}

function NotificationRow({ log }: { log: Log }) {
  const sent = log.delivery_status === 'sent';
  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{
          background: sent ? 'rgba(22,163,74,.12)' : 'rgba(220,38,38,.12)',
          color: sent ? '#15803d' : '#b91c1c',
          padding: '2px 8px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 800,
        }}>
          {sent ? '✓ Отправлено' : '✗ Ошибка'}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700 }}>
          {typeLabel[log.notification_type] ?? log.notification_type}
        </span>
        <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)', marginLeft: 'auto' }}>
          {new Date(log.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      {log.message_text && (
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
          {log.message_text.replace(/<[^>]+>/g, '').slice(0, 200)}
        </div>
      )}
      {log.error_text && (
        <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>{log.error_text}</div>
      )}
    </div>
  );
}
