'use client';
import { useEffect, useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';

import { API_URL as API } from '@/lib/env';

type Account = { id: string; username: string; phone: string };

export default function SettingsPage() {
  const [account, setAccount]   = useState<Account | null>(null);
  const [loading, setLoading]   = useState(true);

  // Delete flow
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword]       = useState('');
  const [deleting, setDeleting]       = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { ok: boolean; account?: Account }) => {
        if (!d.ok) { window.location.href = '/login'; return; }
        setAccount(d.account ?? null);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  async function deleteAccount() {
    if (!password) { setError('Введите пароль'); return; }
    setDeleting(true); setError('');
    const token = localStorage.getItem('session_token') ?? '';
    try {
      const res = await fetch(`${API}/auth/account`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { ok: boolean; error?: { message?: string } | string };
      if (!data.ok) {
        const msg = typeof data.error === 'object' ? (data.error?.message ?? 'Ошибка') : (data.error ?? 'Ошибка');
        setError(msg);
        return;
      }
      // Account deleted — clear local state and redirect
      localStorage.removeItem('session_token');
      window.location.href = '/?deleted=1';
    } catch { setError('Ошибка сети'); }
    finally { setDeleting(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav-frosted">
        <a href="/" className="logo-mark" style={{ fontSize: 17 }}>
          <OctiMark size={28} />
          Octiqa
        </a>
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Кабинет</a>
      </nav>

      <div className="container-sm" style={{ padding: '32px 16px 64px' }}>
        <h1 style={{ margin: '0 0 28px', fontSize: 22, fontWeight: 700 }}>Настройки</h1>

        {/* Account info */}
        {account && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 700 }}>Аккаунт</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <InfoRow label="Логин" value={account.username} />
              <InfoRow label="Телефон" value={account.phone} />
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div className="card" style={{ padding: '20px 24px', border: '1.5px solid var(--red)', marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>⚠️ Удаление аккаунта</h2>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
            Это действие необратимо. Будут удалены все ваши профили, фото, записи календаря, контакты и история активности.
          </p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="btn btn-sm"
              style={{ background: '#fef2f2', color: 'var(--red)', border: '1px solid #fecaca', fontWeight: 600 }}
            >
              Удалить аккаунт навсегда
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: '12px 14px', background: '#fef2f2', borderRadius: 10, fontSize: 14, color: '#991b1b', fontWeight: 500 }}>
                Введите пароль для подтверждения удаления
              </div>
              <input
                className="input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Ваш текущий пароль"
                autoComplete="current-password"
              />
              {error && (
                <p style={{ margin: 0, color: 'var(--red)', fontSize: 14, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => void deleteAccount()}
                  disabled={deleting || !password}
                  className="btn btn-sm"
                  style={{ background: 'var(--red)', color: '#fff', border: 'none', fontWeight: 700, flex: 1, opacity: (!password || deleting) ? .5 : 1 }}
                >
                  {deleting ? 'Удаляю...' : 'Подтвердить удаление'}
                </button>
                <button
                  onClick={() => { setShowConfirm(false); setPassword(''); setError(''); }}
                  className="btn btn-ghost btn-sm"
                  style={{ flex: 1 }}
                >
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14 }}>
      <span style={{ color: 'var(--ink-3)', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--ink)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}
