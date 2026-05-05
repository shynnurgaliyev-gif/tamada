'use client';

import { useEffect, useState } from 'react';
import { API_URL as API } from '@/lib/env';
import {
  auth,
  Badge,
  InfoRow,
  MiniLoading,
  ToolTitle,
  paymentStatusLabel,
  statusLabel,
  type Payment,
  type PlanLimits,
  type Subscription,
} from './_shared';

export function SubscriptionTool() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`${API}/account/subscription`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; subscription?: Subscription | null; days_left?: number; payments?: Payment[]; plan_limits?: PlanLimits }) => {
        if (d.ok) {
          setSub(d.subscription ?? null);
          setDaysLeft(d.days_left ?? 0);
          setPayments(d.payments ?? []);
          setPlanLimits(d.plan_limits ?? null);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function startTrial() {
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/account/subscription/start-trial`, { method: 'POST', headers: auth() }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; error?: string } : null;
    if (data?.ok) load();
    else setMessage(data?.error ?? 'Не удалось начать пробный период');
    setBusy(false);
  }

  async function createInvoice() {
    if (!phone.trim()) return;
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/account/payments/create-invoice`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; message?: string; amount?: number; payment_url?: string | null; error?: string } : null;
    if (data?.ok) {
      setMessage(`${data.message ?? 'Счет выставлен'} ${data.amount ? `(${data.amount} KZT)` : ''}`);
      load();
      if (data.payment_url) window.open(data.payment_url, '_blank', 'noopener,noreferrer');
    } else {
      setMessage(data?.error ?? 'Не удалось выставить счет');
    }
    setBusy(false);
  }

  if (loading) return <MiniLoading title="Подписка" />;

  return (
    <div>
      <ToolTitle title="Подписка" subtitle="Одна подписка покрывает все профили аккаунта." />
      <div className="mini-card">
        {!sub ? (
          <>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Подписка не активирована</div>
            <button className="mini-btn mini-btn-primary mini-tap" onClick={() => void startTrial()} disabled={busy}>
              {busy ? '...' : 'Начать пробный период'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <Badge>{statusLabel[sub.status] ?? sub.status}</Badge>
              <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', fontWeight: 700 }}>{daysLeft} дн.</span>
            </div>
            <InfoRow label="Тариф" value={sub.plan_code} />
            <InfoRow label="Действует до" value={new Date(sub.expires_at).toLocaleDateString('ru-RU')} />
            {sub.trial_ends_at && <InfoRow label="Пробный до" value={new Date(sub.trial_ends_at).toLocaleDateString('ru-RU')} />}
          </>
        )}
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Профили в подписке</div>
        <InfoRow label="Включено в базу" value={`${planLimits?.included_profile_count ?? 1}`} />
        <InfoRow label="Доп. слоты" value={`${planLimits?.extra_profile_slots ?? 0}`} />
        <InfoRow label="Текущий лимит продукта" value={`${planLimits?.max_active_profiles ?? 3}`} />
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Оплата</div>
        <input
          className="mini-input"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Номер Kaspi +7..."
          style={{ marginBottom: 8 }}
        />
        <button className="mini-btn mini-btn-primary mini-tap" onClick={() => void createInvoice()} disabled={busy || !phone.trim()}>
          {busy ? '...' : 'Выставить счет'}
        </button>
        {message && <div style={{ marginTop: 10, fontSize: 12, color: '#166534', lineHeight: 1.4 }}>{message}</div>}
      </div>

      {payments.length > 0 && (
        <div className="mini-card">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Последние оплаты</div>
          {payments.map(payment => (
            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{payment.amount} {payment.currency}</div>
                <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>{payment.payment_provider}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 800 }}>{paymentStatusLabel[payment.status] ?? payment.status}</div>
                <div style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>{new Date(payment.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
