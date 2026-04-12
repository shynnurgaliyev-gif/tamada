'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Account = { id: string; username: string; phone: string; status: string };

const NAV_ITEMS = [
  { href: '/dashboard/provider', icon: '👤', label: 'Мои профили' },
  { href: '/dashboard/calendar', icon: '📅', label: 'Календарь' },
  { href: '/dashboard/integrations', icon: '🔗', label: 'Интеграции (Telegram)' },
  { href: '/dashboard/subscription', icon: '⭐', label: 'Подписка' },
  { href: '/dashboard/notifications', icon: '🔔', label: 'Напоминания' },
];

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { ok: boolean; account?: Account }) => {
        if (!data.ok) { window.location.href = '/login'; return; }
        setAccount(data.account ?? null);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    const token = localStorage.getItem('session_token');
    if (token) {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
    }
    localStorage.removeItem('session_token');
    window.location.href = '/login';
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark" style={{ fontSize: 17 }}>
          <span className="logo-mark-icon" style={{ width: 28, height: 28, fontSize: 14 }}>✦</span>
          Linkora
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/" className="btn btn-ghost btn-sm">← Главная</a>
          <button onClick={logout} className="btn btn-outline btn-sm">Выйти</button>
        </div>
      </nav>

      <div className="container-sm" style={{ padding: '32px 16px' }}>
        {/* Account card */}
        {account && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
              {account.username[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{account.username}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{account.phone}</div>
            </div>
          </div>
        )}

        {/* Nav grid */}
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Меню</h2>
        <div className="dash-nav">
          {NAV_ITEMS.map(item => (
            <a key={item.href} href={item.href} className="dash-card">
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{item.label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
