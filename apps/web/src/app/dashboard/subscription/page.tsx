'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Subscription = {
  id: string; status: string; plan_code: string;
  starts_at: string; expires_at: string; trial_ends_at: string | null;
};
type Payment = {
  id: string; amount: string; currency: string; status: string;
  payment_provider: string; created_at: string; paid_at: string | null;
};

const statusColor: Record<string, string> = {
  trial: '#f59e0b', active: '#22c55e', expiring: '#f97316',
  expired: '#ef4444', blocked: '#6b7280', cancelled: '#6b7280',
};
const statusLabel: Record<string, string> = {
  trial: 'Пробный период', active: 'Активна', expiring: 'Скоро истекает',
  expired: 'Истекла', blocked: 'Заблокирована', cancelled: 'Отменена',
};
const paymentStatusLabel: Record<string, string> = {
  pending: 'Ожидание', paid: 'Оплачено', failed: 'Ошибка', expired: 'Истёк', cancelled: 'Отменён',
};

function getToken() { return localStorage.getItem('session_token') ?? ''; }

export default function SubscriptionPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [invoicing, setInvoicing] = useState(false);
  const [invoiceResult, setInvoiceResult] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    loadSubscription();
  }, []);

  function loadSubscription() {
    fetch(`${API}/account/subscription`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; subscription?: Subscription; days_left?: number; payments?: Payment[] }) => {
        if (d.ok) {
          setSub(d.subscription ?? null);
          setDaysLeft(d.days_left ?? 0);
          setPayments(d.payments ?? []);
        }
      })
      .catch(() => { /* ignore network errors */ })
      .finally(() => setLoading(false));
  }

  async function startTrial() {
    const res = await fetch(`${API}/account/subscription/start-trial`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json() as { ok: boolean; error?: string };
    if (data.ok) { loadSubscription(); }
    else setMsg(String(data.error ?? 'Ошибка'));
  }

  async function createInvoice(e: React.FormEvent) {
    e.preventDefault();
    setInvoicing(true);
    setInvoiceResult('');
    const res = await fetch(`${API}/account/payments/create-invoice`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json() as { ok: boolean; message?: string; invoice_id?: string; amount?: number; error?: string };
    if (data.ok) {
      setInvoiceResult(`✅ ${data.message ?? 'Счёт выставлен'} (${data.amount} KZT)`);
      loadSubscription();
    } else {
      setInvoiceResult(`❌ ${data.error ?? 'Ошибка'}`);
    }
    setInvoicing(false);
  }

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  const isBlocked = sub && ['expired', 'blocked', 'cancelled'].includes(sub.status);

  return (
    <div style={s.page}>
      <a href="/dashboard" style={s.back}>← Кабинет</a>
      <h1 style={s.title}>Подписка</h1>
      <p style={s.subtitle}>Одна подписка — все ваши профили активны.</p>

      {!sub ? (
        <section style={s.section}>
          <p style={s.noSub}>Подписка не активирована.</p>
          <button onClick={() => void startTrial()} style={s.btn}>Начать пробный период (30 дней)</button>
          {msg && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{msg}</p>}
        </section>
      ) : (
        <>
          <section style={s.section}>
            <div style={s.statusRow}>
              <span style={{ ...s.statusBadge, background: statusColor[sub.status] ?? '#888' }}>
                {statusLabel[sub.status] ?? sub.status}
              </span>
              <span style={s.daysLeft}>{daysLeft} дн. осталось</span>
            </div>
            <div style={s.infoGrid}>
              <div style={s.infoItem}><span style={s.infoLabel}>Тариф</span><span>{sub.plan_code}</span></div>
              <div style={s.infoItem}><span style={s.infoLabel}>Начало</span><span>{new Date(sub.starts_at).toLocaleDateString('ru-RU')}</span></div>
              <div style={s.infoItem}><span style={s.infoLabel}>До</span><span>{new Date(sub.expires_at).toLocaleDateString('ru-RU')}</span></div>
              {sub.trial_ends_at && (
                <div style={s.infoItem}><span style={s.infoLabel}>Пробный до</span><span>{new Date(sub.trial_ends_at).toLocaleDateString('ru-RU')}</span></div>
              )}
            </div>
            {isBlocked && (
              <div style={s.warning}>⚠️ Все профили скрыты. Оплатите подписку для восстановления видимости.</div>
            )}
          </section>

          <section style={s.section}>
            <h2 style={s.sectionTitle}>Оплата (9 900 ₸ / мес)</h2>
            <form onSubmit={createInvoice} style={s.invoiceForm}>
              <input
                style={s.input} placeholder="Номер Kaspi +7..." value={phone}
                onChange={e => setPhone(e.target.value)} required
              />
              <button type="submit" style={s.btn} disabled={invoicing}>
                {invoicing ? '...' : 'Выставить счёт'}
              </button>
            </form>
            {invoiceResult && <p style={{ fontSize: 13, marginTop: 8, color: invoiceResult.startsWith('✅') ? '#16a34a' : '#ef4444' }}>{invoiceResult}</p>}
            <p style={s.hint}>Kaspi отправит уведомление на указанный номер телефона.</p>
          </section>
        </>
      )}

      {payments.length > 0 && (
        <section style={s.section}>
          <h2 style={s.sectionTitle}>История оплат</h2>
          <div style={s.paymentList}>
            {payments.map(p => (
              <div key={p.id} style={s.paymentRow}>
                <div>
                  <span style={s.paymentAmount}>{p.amount} {p.currency}</span>
                  <span style={s.paymentProvider}>{p.payment_provider}</span>
                </div>
                <div style={s.paymentRight}>
                  <span style={{ ...s.paymentStatus, color: p.status === 'paid' ? '#16a34a' : '#6b7280' }}>
                    {paymentStatusLabel[p.status] ?? p.status}
                  </span>
                  <span style={s.paymentDate}>{new Date(p.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 600, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' },
  back: { color: '#9ca3af', textDecoration: 'none', fontSize: 14 },
  title: { margin: '16px 0 4px', fontSize: 22, fontWeight: 700 },
  subtitle: { margin: '0 0 24px', fontSize: 14, color: '#6b7280' },
  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 600 },
  noSub: { color: '#6b7280', fontSize: 14, marginBottom: 12 },
  statusRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  statusBadge: { color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 },
  daysLeft: { fontSize: 14, color: '#6b7280' },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  infoItem: { display: 'flex', flexDirection: 'column', gap: 2 },
  infoLabel: { fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' },
  warning: { marginTop: 14, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, fontSize: 13, color: '#dc2626' },
  invoiceForm: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  input: { flex: 1, minWidth: 180, padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  btn: { background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  hint: { margin: '8px 0 0', fontSize: 12, color: '#9ca3af' },
  paymentList: { display: 'flex', flexDirection: 'column', gap: 8 },
  paymentRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
  paymentAmount: { fontSize: 14, fontWeight: 600, color: '#111', marginRight: 8 },
  paymentProvider: { fontSize: 12, color: '#9ca3af' },
  paymentRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 },
  paymentStatus: { fontSize: 13, fontWeight: 500 },
  paymentDate: { fontSize: 12, color: '#9ca3af' },
};
