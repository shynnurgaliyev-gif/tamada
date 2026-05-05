'use client';

import { useEffect, useState } from 'react';
import type { Provider } from '../../types';
import { API_URL as API } from '@/lib/env';
import {
  auth,
  SmallDangerButton,
  ToolTitle,
  TransferRow,
  type TransferRequest,
} from './_shared';

export function TransfersTool({ provider, onProvidersChanged }: { provider: Provider | null; onProvidersChanged: () => Promise<void> }) {
  const [incoming, setIncoming] = useState<TransferRequest[]>([]);
  const [outgoing, setOutgoing] = useState<TransferRequest[]>([]);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    fetch(`${API}/telegram/mini/transfers/incoming`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; transfer_requests?: TransferRequest[] }) => { if (d.ok) setIncoming(d.transfer_requests ?? []); })
      .catch(() => null);
    const suffix = provider ? `?provider_id=${provider.id}` : '';
    fetch(`${API}/telegram/mini/transfers/outgoing${suffix}`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; transfer_requests?: TransferRequest[] }) => { if (d.ok) setOutgoing(d.transfer_requests ?? []); })
      .catch(() => null);
  };

  useEffect(() => { load(); }, [provider?.id]);

  async function act(requestId: string, action: 'accept' | 'reject') {
    setBusyId(requestId);
    setMessage('');
    const res = await fetch(`${API}/telegram/mini/transfers/${requestId}/${action}`, {
      method: 'POST',
      headers: auth(),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; error?: string } : null;
    if (data?.ok) {
      setMessage(action === 'accept' ? 'Профиль принят. Список профилей обновлен.' : 'Запрос отклонен.');
      await onProvidersChanged();
      load();
    } else {
      setMessage(data?.error ?? 'Не удалось выполнить действие.');
    }
    setBusyId('');
  }

  return (
    <div>
      <ToolTitle title="Передачи" subtitle="Принятие профиля всегда требует отдельного подтверждения новым владельцем." />
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Входящие запросы</div>
        {incoming.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Входящих запросов нет.</div>
        ) : incoming.map(req => (
          <TransferRow key={req.id} request={req} mode="incoming" action={
            req.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="mini-tap"
                  disabled={!!busyId}
                  onClick={() => void act(req.id, 'accept')}
                  style={{ border: 'none', borderRadius: 8, padding: '8px 10px', background: '#16a34a', color: '#fff', fontWeight: 900, fontSize: 12 }}
                >
                  {busyId === req.id ? '...' : 'Принять'}
                </button>
                <SmallDangerButton disabled={!!busyId} onClick={() => void act(req.id, 'reject')}>Отклонить</SmallDangerButton>
              </div>
            ) : null
          } />
        ))}
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Исходящие запросы</div>
        {outgoing.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Исходящих запросов нет.</div>
        ) : outgoing.map(req => (
          <TransferRow key={req.id} request={req} mode="outgoing" action={null} />
        ))}
      </div>
      {message && <div className="mini-card" style={{ fontSize: 13, lineHeight: 1.45 }}>{message}</div>}
    </div>
  );
}
