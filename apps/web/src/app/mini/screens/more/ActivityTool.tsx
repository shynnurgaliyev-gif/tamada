'use client';

import { useEffect, useState } from 'react';
import type { Provider } from '../../types';
import { API_URL as API } from '@/lib/env';
import {
  ActivityRow,
  auth,
  ToolTitle,
  type ActivityLog,
} from './_shared';

export function ActivityTool({ provider }: { provider: Provider | null }) {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'calendar' | 'team' | 'profile'>('all');
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!provider) return;
    setLoading(true);
    const query = filter === 'all' ? '?limit=50' : `?limit=50&category=${filter}`;
    fetch(`${API}/providers/${provider.id}/activity${query}`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; activity?: ActivityLog[] }) => { if (d.ok) setItems(d.activity ?? []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [provider?.id, filter]);

  return (
    <div>
      <ToolTitle title="История действий" subtitle={provider ? provider.display_name : 'Выберите профиль'} />
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10 }}>
        {[
          ['all', 'Все'],
          ['calendar', 'Календарь'],
          ['team', 'Команда'],
          ['profile', 'Профиль'],
        ].map(([id, label]) => (
          <button
            key={id}
            className="mini-tap"
            onClick={() => setFilter(id as typeof filter)}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '8px 10px',
              background: filter === id ? '#111827' : 'rgba(0,0,0,.06)',
              color: filter === id ? '#fff' : 'var(--tg-theme-text-color, #111827)',
              fontWeight: 900,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mini-card">
        {loading ? (
          <div className="mini-skeleton" style={{ height: 72 }} />
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Действий пока нет.</div>
        ) : items.map(item => <ActivityRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}
