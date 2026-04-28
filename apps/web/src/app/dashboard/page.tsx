'use client';
import { useEffect, useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';

import { API_URL as API } from '@/lib/env';

type Account = { id: string; username: string; phone: string; status: string };
type ProviderInfo = { id: string; display_name: string; slug: string; provider_status: string };
type OnboardingStatus = {
  status: string;
  current_step: number;
  steps: { basics: boolean; photos: boolean; contacts: boolean; telegram: boolean; calendar: boolean };
  completion_pct: number;
};

const NAV_ITEMS = [
  { href: '/dashboard/provider', icon: '👤', label: 'Мои профили' },
  { href: '/dashboard/calendar', icon: '📅', label: 'Календарь' },
  { href: '/dashboard/analytics', icon: '📊', label: 'Аналитика' },
  { href: '/dashboard/integrations', icon: '🔗', label: 'Интеграции' },
  { href: '/dashboard/subscription', icon: '⭐', label: 'Подписка' },
  { href: '/dashboard/notifications', icon: '🔔', label: 'Напоминания' },
  { href: '/dashboard/settings',      icon: '⚙️', label: 'Настройки' },
];

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboarding, setOnboarding] = useState<OnboardingStatus | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }

    Promise.all([
      fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/dashboard/onboarding`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null),
      fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()).catch(() => null),
    ])
      .then(([data, ob, prov]: [{ ok: boolean; account?: Account }, { ok: boolean; onboarding?: OnboardingStatus } | null, { ok: boolean; providers?: ProviderInfo[] } | null]) => {
        if (!(data as { ok: boolean }).ok) { window.location.href = '/login'; return; }
        setAccount((data as { ok: boolean; account?: Account }).account ?? null);
        if (ob?.ok && ob.onboarding && ob.onboarding.status !== 'completed') {
          setOnboarding(ob.onboarding);
        }
        if (prov?.ok && prov.providers) setProviders(prov.providers);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    if (!window.confirm('Выйти из аккаунта?')) return;
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
          <OctiMark size={28} />
          Octiqa
        </a>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <a href="/" className="btn btn-ghost btn-sm">← Главная</a>
          <button onClick={logout} className="btn btn-outline btn-sm">Выйти</button>
        </div>
      </nav>

      <div className="container-sm" style={{ padding: '32px 16px' }}>
        {/* Account card */}
        {account && (
          <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 48, height: 48, background: 'var(--brand)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 700, flexShrink: 0 }}>
                {account.username[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{account.username}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>{account.phone}</div>
              </div>
            </div>
            {providers.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {providers.map(p => (
                  <a
                    key={p.id}
                    href={`/p/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: 'var(--brand)', textDecoration: 'none', background: 'var(--brand-xlight)', padding: '5px 12px', borderRadius: 20 }}
                  >
                    👤 {p.display_name}
                    <span style={{ fontSize: 11, opacity: .7, fontWeight: 400 }}>
                      {p.provider_status === 'active' ? '● активен' : p.provider_status === 'inactive' ? '○ скрыт' : p.provider_status}
                    </span>
                    <span style={{ opacity: .55 }}>→</span>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onboarding banner */}
        {onboarding && onboarding.completion_pct < 100 && (
          <div className="card" style={{ padding: '18px 20px', marginBottom: 24, border: '2px solid var(--brand)', background: 'var(--brand-xlight)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Завершите настройку профиля</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>
                  {['Основное', 'Фото', 'Контакты', 'Telegram', 'Календарь']
                    .filter((_, i) => !Object.values(onboarding.steps)[i])
                    .join(' · ') || 'Почти готово!'}
                </div>
              </div>
              <a href="/dashboard/onboarding" className="btn btn-brand btn-sm" style={{ flexShrink: 0 }}>
                Продолжить →
              </a>
            </div>
            <div style={{ height: 6, background: 'rgba(0,0,0,.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${onboarding.completion_pct}%`, background: 'var(--brand)', borderRadius: 3, transition: 'width .5s ease' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, marginTop: 5, textAlign: 'right' }}>
              {onboarding.completion_pct}% готово
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
