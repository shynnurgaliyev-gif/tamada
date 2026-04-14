'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { OctiMark } from '@/components/OctiLogo';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

/* ──────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────── */
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
interface TelegramWebApp {
  ready(): void;
  expand(): void;
  colorScheme: 'light' | 'dark';
  initDataUnsafe: {
    start_param?: string;
    user?: TgUser;
  };
  BackButton: {
    show(): void; hide(): void;
    onClick(fn: () => void): void; offClick(fn: () => void): void;
  };
}
type TgUser    = { id: number; first_name: string; last_name?: string; username?: string };
type Provider  = { id: string; display_name: string; slug: string; provider_status: string };
type Summary   = { profile_views: number; contact_reveals: number; calendar_views: number; conversion_pct: number };
type Tab       = 'profiles' | 'calendar' | 'analytics' | 'more';
type Phase     = 'loading' | 'onboarding' | 'shell';

const VALID_FLOWS = ['dashboard', 'onboarding', 'profiles'] as const;
type TgFlow = typeof VALID_FLOWS[number];
const isValidFlow = (v: string | null): v is TgFlow =>
  VALID_FLOWS.includes(v as TgFlow);

/* ──────────────────────────────────────────────────────
   Root shell — entry, init, orchestration
────────────────────────────────────────────────────── */
export default function MiniShell() {
  const params = useSearchParams();

  const [phase,       setPhase]       = useState<Phase>('loading');
  const [tab,         setTab]         = useState<Tab>('profiles');
  const [showAdd,     setShowAdd]     = useState(false);
  const [showSwitch,  setShowSwitch]  = useState(false);
  const [providers,   setProviders]   = useState<Provider[]>([]);
  const [activeIdx,   setActiveIdx]   = useState(0);
  const [tgUser,      setTgUser]      = useState<TgUser | null>(null);
  const [summary,     setSummary]     = useState<Summary | null>(null);
  const [sumLoading,  setSumLoading]  = useState(false);

  const activeProvider = providers[activeIdx] ?? null;

  /* ── Init Telegram + data ──────────────────────────── */
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    tg?.ready();
    tg?.expand();

    const urlFlow   = params.get('tg_flow');
    const startFlow = tg?.initDataUnsafe?.start_param ?? null;
    const flow: TgFlow = isValidFlow(urlFlow) ? urlFlow
                        : isValidFlow(startFlow) ? startFlow
                        : 'dashboard';

    if (tg?.initDataUnsafe?.user) setTgUser(tg.initDataUnsafe.user);
    if (flow === 'profiles') setTab('profiles');

    const token = localStorage.getItem('session_token');

    // No token → straight to onboarding
    if (!token) { setPhase('onboarding'); return; }

    // onboarding flow → show gate but still load providers silently
    if (flow === 'onboarding') {
      setPhase('onboarding');
      fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.ok && d.providers) setProviders(d.providers); })
        .catch(() => null);
      return;
    }

    // Default: load providers then enter shell
    fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.ok && d.providers) setProviders(d.providers); })
      .catch(() => null)
      .finally(() => setPhase('shell'));
  }, [params]);

  /* ── Analytics — lazy-load on tab switch ───────────── */
  const loadAnalytics = useCallback(() => {
    if (summary || sumLoading) return;
    const token = localStorage.getItem('session_token');
    if (!token) return;
    setSumLoading(true);
    fetch(`${API}/dashboard/analytics/summary?days=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.ok) setSummary(d.summary); })
      .catch(() => null)
      .finally(() => setSumLoading(false));
  }, [summary, sumLoading]);

  const handleTab = useCallback((next: Tab) => {
    setTab(next);
    setShowAdd(false);
    setShowSwitch(false);
    if (next === 'analytics') loadAnalytics();
  }, [loadAnalytics]);

  /* ── Render phases ─────────────────────────────────── */
  if (phase === 'loading') return <MiniLoader />;

  if (phase === 'onboarding') {
    return (
      <OnboardingGate
        tgUser={tgUser}
        onContinue={() => setPhase('shell')}
      />
    );
  }

  return (
    <>
      <MiniStyles />
      <div className="mini-root">

        {/* ── Top context bar ────────────────────── */}
        <TopBar
          provider={activeProvider}
          providers={providers}
          onToggleSwitch={() => setShowSwitch(s => !s)}
        />

        {/* ── Screen ─────────────────────────────── */}
        <main className="mini-content mini-fadein" key={tab}>
          {tab === 'profiles'  && <MiniProfilesScreen providers={providers} activeIdx={activeIdx} />}
          {tab === 'calendar'  && <MiniCalendarScreen  provider={activeProvider} />}
          {tab === 'analytics' && <MiniAnalyticsScreen summary={summary} loading={sumLoading} onRetry={loadAnalytics} />}
          {tab === 'more'      && <MiniMoreScreen tgUser={tgUser} />}
        </main>

        {/* ── Bottom navigation ──────────────────── */}
        <BottomNav
          tab={tab}
          onTab={handleTab}
          onAdd={() => setShowAdd(true)}
        />

        {/* ── Overlays ────────────────────────────── */}
        {showAdd && (
          <AddSheet
            hasProfile={!!activeProvider}
            onClose={() => setShowAdd(false)}
          />
        )}
        {showSwitch && providers.length > 1 && (
          <SwitchSheet
            providers={providers}
            activeIdx={activeIdx}
            onSelect={i => { setActiveIdx(i); setShowSwitch(false); }}
            onClose={() => setShowSwitch(false)}
          />
        )}
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Global styles for Mini App
────────────────────────────────────────────────────── */
function MiniStyles() {
  return (
    <style>{`
      html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
      body {
        background: var(--tg-theme-bg-color, #f7f6ff);
        overscroll-behavior: none;
        -webkit-user-select: none; user-select: none;
      }
      * { box-sizing: border-box; }

      .mini-root {
        height: 100dvh;
        display: flex;
        flex-direction: column;
        background: var(--tg-theme-bg-color, #f7f6ff);
        color: var(--tg-theme-text-color, #0a0a0f);
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
      }

      /* Top bar */
      .mini-topbar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 16px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-bottom: 1px solid rgba(0,0,0,.07);
        flex-shrink: 0;
        min-height: 60px;
      }

      /* Scrollable content */
      .mini-content {
        flex: 1;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 16px;
        -webkit-overflow-scrolling: touch;
      }

      /* Bottom nav */
      .mini-nav {
        display: flex;
        align-items: stretch;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-top: 1px solid rgba(0,0,0,.07);
        padding-bottom: env(safe-area-inset-bottom, 6px);
        flex-shrink: 0;
      }
      .mini-nav-item {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 8px 0 5px;
        border: none;
        background: transparent;
        color: var(--tg-theme-hint-color, #9ca3af);
        font-family: inherit;
      }
      .mini-nav-item[data-active=true] { color: #7c3aed; }
      .mini-nav-icon  { font-size: 20px; line-height: 1.1; }
      .mini-nav-label { font-size: 10px; font-weight: 600; letter-spacing: .01em; }
      .mini-nav-add {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        padding: 4px 0 5px;
        border: none;
        background: transparent;
        font-family: inherit;
        color: var(--tg-theme-hint-color, #9ca3af);
      }
      .mini-nav-add-pill {
        width: 44px; height: 28px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 900; color: #fff; line-height: 1;
        box-shadow: 0 2px 10px rgba(124,58,237,.38);
      }

      /* Cards */
      .mini-card {
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 12px;
      }

      /* Avatar circle */
      .mini-avatar {
        width: 44px; height: 44px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 13px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 800; color: #fff;
        flex-shrink: 0;
      }
      .mini-avatar-sm {
        width: 32px; height: 32px;
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        font-size: 14px; font-weight: 800; color: #fff;
        flex-shrink: 0;
      }

      /* Buttons */
      .mini-btn {
        display: flex; align-items: center; justify-content: center;
        gap: 6px; padding: 13px; width: 100%;
        border: none; border-radius: 13px;
        font-family: inherit; font-size: 15px; font-weight: 700;
        cursor: pointer; text-decoration: none;
      }
      .mini-btn-primary {
        background: linear-gradient(135deg, #4f46e5, #7c3aed);
        color: #fff;
        box-shadow: 0 3px 12px rgba(124,58,237,.3);
      }
      .mini-btn-outline {
        background: transparent;
        color: #7c3aed;
        border: 1.5px solid rgba(124,58,237,.3);
      }
      .mini-btn-ghost {
        background: rgba(124,58,237,.07);
        color: #7c3aed;
        border: none;
      }

      /* Nav list rows */
      .mini-row {
        display: flex; align-items: center; gap: 12px;
        padding: 13px 14px;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 13px;
        text-decoration: none;
        color: inherit;
        margin-bottom: 8px;
      }
      .mini-row-icon {
        width: 38px; height: 38px;
        border-radius: 10px;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; flex-shrink: 0;
      }
      .mini-row-chevron { margin-left: auto; font-size: 16px; color: rgba(0,0,0,.2); flex-shrink: 0; }

      /* Section label */
      .mini-section-label {
        font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .1em;
        color: var(--tg-theme-hint-color, #9ca3af);
        margin: 16px 0 8px;
      }

      /* Stat cards grid */
      .mini-stats {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        margin-bottom: 12px;
      }
      .mini-stat {
        background: var(--tg-theme-secondary-bg-color, #fff);
        border: 1px solid rgba(0,0,0,.07);
        border-radius: 14px;
        padding: 14px 12px;
      }

      /* Calendar grid */
      .mini-cal-grid {
        display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px;
      }
      .mini-cal-day {
        aspect-ratio: 1;
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; border-radius: 8px;
      }

      /* Sheet overlay */
      .mini-overlay {
        position: fixed; inset: 0;
        background: rgba(0,0,0,.45);
        z-index: 200;
        display: flex; align-items: flex-end;
      }
      .mini-sheet {
        width: 100%;
        background: var(--tg-theme-secondary-bg-color, #fff);
        border-radius: 20px 20px 0 0;
        padding: 8px 0 0;
      }
      .mini-sheet-handle {
        width: 36px; height: 4px;
        background: rgba(0,0,0,.12);
        border-radius: 2px;
        margin: 0 auto 16px;
      }

      /* Status dot */
      .mini-status-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }

      /* Tap states */
      .mini-tap { -webkit-tap-highlight-color: transparent; cursor: pointer; }
      .mini-tap:active { opacity: 0.62; }

      /* Animations */
      @keyframes mini-fadein {
        from { opacity: 0; transform: translateY(8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .mini-fadein { animation: mini-fadein 0.2s ease both; }

      @keyframes mini-slideup {
        from { transform: translateY(100%); opacity: 0.5; }
        to   { transform: translateY(0); opacity: 1; }
      }
      .mini-slideup { animation: mini-slideup 0.28s cubic-bezier(.32,1.28,.64,1) both; }

      @keyframes mini-spin { to { transform: rotate(360deg); } }
      .mini-spinner {
        width: 28px; height: 28px;
        border: 3px solid rgba(124,58,237,.2);
        border-top-color: #7c3aed;
        border-radius: 50%;
        animation: mini-spin 0.7s linear infinite;
      }

      /* Skeleton */
      @keyframes mini-shimmer {
        0%   { background-position: -300px 0; }
        100% { background-position: 300px 0; }
      }
      .mini-skeleton {
        background: linear-gradient(90deg, rgba(0,0,0,.05) 25%, rgba(0,0,0,.09) 50%, rgba(0,0,0,.05) 75%);
        background-size: 600px 100%;
        animation: mini-shimmer 1.4s infinite;
        border-radius: 10px;
      }
    `}</style>
  );
}

/* ──────────────────────────────────────────────────────
   Top context bar
────────────────────────────────────────────────────── */
function TopBar({
  provider, providers, onToggleSwitch,
}: {
  provider: Provider | null;
  providers: Provider[];
  onToggleSwitch: () => void;
}) {
  const hasMultiple = providers.length > 1;
  const isActive    = provider?.provider_status === 'active';

  if (!provider) {
    return (
      <div className="mini-topbar">
        <OctiMark size={28} />
        <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-.04em' }}>Octiqa</span>
        <a
          href="/dashboard/onboarding"
          className="mini-tap"
          style={{
            marginLeft: 'auto',
            fontSize: 13, fontWeight: 700,
            color: '#7c3aed',
            background: 'rgba(124,58,237,.1)',
            padding: '6px 12px', borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          + Создать профиль
        </a>
      </div>
    );
  }

  return (
    <button
      className={`mini-topbar mini-tap`}
      onClick={hasMultiple ? onToggleSwitch : undefined}
      style={{
        border: 'none',
        width: '100%',
        textAlign: 'left',
        cursor: hasMultiple ? 'pointer' : 'default',
      }}
    >
      {/* Avatar */}
      <div className="mini-avatar">
        {provider.display_name[0]?.toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 800, fontSize: 16,
          letterSpacing: '-.02em', lineHeight: 1.2,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {provider.display_name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <span
            className="mini-status-dot"
            style={{ background: isActive ? '#22c55e' : '#9ca3af' }}
          />
          <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            {isActive ? 'Активен · виден клиентам' : 'Скрыт · не виден клиентам'}
          </span>
        </div>
      </div>

      {/* Switcher chevron */}
      {hasMultiple && (
        <span style={{
          fontSize: 18,
          color: 'var(--tg-theme-hint-color, #9ca3af)',
          flexShrink: 0,
          lineHeight: 1,
        }}>
          ⌄
        </span>
      )}
    </button>
  );
}

/* ──────────────────────────────────────────────────────
   Bottom navigation
────────────────────────────────────────────────────── */
const NAV_ITEMS = [
  { id: 'profiles',  icon: '👤',  label: 'Профили'   },
  { id: 'calendar',  icon: '📅',  label: 'Календарь' },
  { id: 'add',       icon: '＋',  label: 'Добавить', special: true },
  { id: 'analytics', icon: '📊',  label: 'Аналитика' },
  { id: 'more',      icon: '···', label: 'Ещё'       },
] as const;

function BottomNav({
  tab, onTab, onAdd,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  onAdd: () => void;
}) {
  return (
    <nav className="mini-nav">
      {NAV_ITEMS.map(item => {
        if ('special' in item && item.special) {
          return (
            <button key="add" onClick={onAdd} className="mini-nav-add mini-tap">
              <div className="mini-nav-add-pill">＋</div>
              <span className="mini-nav-label" style={{ marginTop: 2 }}>Добавить</span>
            </button>
          );
        }
        const isActive = tab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onTab(item.id as Tab)}
            className="mini-nav-item mini-tap"
            data-active={String(isActive)}
          >
            <span className="mini-nav-icon">{item.icon}</span>
            <span className="mini-nav-label">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ──────────────────────────────────────────────────────
   Screen: Profiles
────────────────────────────────────────────────────── */
function MiniProfilesScreen({
  providers, activeIdx,
}: {
  providers: Provider[];
  activeIdx: number;
}) {
  const provider = providers[activeIdx] ?? null;

  if (!provider) {
    return (
      <EmptyState
        icon="👤"
        title="Профиль не создан"
        sub="Создайте профиль чтобы клиенты нашли вас"
        href="/dashboard/onboarding"
        cta="Создать профиль"
      />
    );
  }

  const isActive = provider.provider_status === 'active';

  return (
    <div>
      {/* Profile card */}
      <div className="mini-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div className="mini-avatar">
            {provider.display_name[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
              {provider.display_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="mini-status-dot" style={{ background: isActive ? '#22c55e' : '#9ca3af' }} />
              <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                {isActive ? 'Активен' : 'Скрыт'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,.2)' }}>·</span>
              <a
                href={`/p/${provider.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mini-tap"
                style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}
              >
                octiqa.kz/p/{provider.slug}
              </a>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a href="/dashboard/provider/edit" className="mini-btn mini-btn-primary mini-tap" style={{ fontSize: 13 }}>
            ✏️ Редактировать
          </a>
          <a
            href={`/p/${provider.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mini-btn mini-btn-outline mini-tap"
            style={{ fontSize: 13 }}
          >
            👁 Просмотр
          </a>
        </div>
      </div>

      {/* Quick links */}
      <div className="mini-section-label">Управление профилем</div>
      <NavRow icon="📸" iconBg="#f0fdf4" iconColor="#059669" label="Фотографии"    sub="Загрузить и упорядочить"     href="/dashboard/provider/edit" />
      <NavRow icon="💰" iconBg="#fffbeb" iconColor="#d97706" label="Цены и услуги" sub="Обновить прайс-лист"          href="/dashboard/provider/edit" />
      <NavRow icon="📞" iconBg="#f0f9ff" iconColor="#0ea5e9" label="Контакты"      sub="WhatsApp, Telegram, Instagram" href="/dashboard/provider/edit" />

      <div style={{ height: 16 }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Screen: Calendar
────────────────────────────────────────────────────── */
function MiniCalendarScreen({ provider }: { provider: Provider | null }) {
  if (!provider) {
    return (
      <EmptyState
        icon="📅"
        title="Нет профиля"
        sub="Создайте профиль чтобы управлять расписанием"
        href="/dashboard/onboarding"
        cta="Создать профиль"
      />
    );
  }

  return (
    <div>
      {/* Mini month calendar */}
      <div className="mini-card">
        <MiniMonthHeader />
        <MiniMonthGrid />
        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(0,0,0,.06)' }}>
          {[
            { color: '#22c55e', label: 'Свободен' },
            { color: '#ef4444', label: 'Занят' },
            { color: '#f59e0b', label: 'Под вопросом' },
            { color: '#f97316', label: 'Частично' },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'block', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <a href="/dashboard/calendar/new" className="mini-btn mini-btn-primary mini-tap" style={{ marginBottom: 10 }}>
        ＋ Добавить запись
      </a>
      <a href="/dashboard/calendar" className="mini-btn mini-btn-ghost mini-tap">
        Открыть полный календарь →
      </a>

      <div style={{ height: 16 }} />
    </div>
  );
}

function MiniMonthHeader() {
  const now   = new Date();
  const month = now.toLocaleDateString('ru-RU', { month: 'long' });
  const year  = now.getFullYear();
  return (
    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, textAlign: 'center' }}>
      {month[0]!.toUpperCase() + month.slice(1)} {year}
    </div>
  );
}

function MiniMonthGrid() {
  const now     = new Date();
  const year    = now.getFullYear();
  const month   = now.getMonth();
  const today   = now.getDate();
  const first   = new Date(year, month, 1).getDay();
  const offset  = (first + 6) % 7; // Mon-first
  const total   = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="mini-cal-grid" style={{ marginBottom: 4 }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: 10, fontWeight: 700,
            color: 'var(--tg-theme-hint-color, #9ca3af)',
            paddingBottom: 4,
          }}>{d}</div>
        ))}
      </div>
      <div className="mini-cal-grid">
        {cells.map((d, i) => {
          const isToday   = d === today;
          const isPast    = d !== null && d < today;
          return (
            <div
              key={i}
              className="mini-cal-day"
              style={{
                background: isToday ? '#7c3aed' : 'transparent',
                color: isToday ? '#fff'
                      : isPast ? 'var(--tg-theme-hint-color, #c4c9d4)'
                      : 'inherit',
                fontWeight: isToday ? 800 : 400,
                fontSize: 12,
              }}
            >
              {d ?? ''}
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Screen: Analytics
────────────────────────────────────────────────────── */
function MiniAnalyticsScreen({
  summary, loading, onRetry,
}: {
  summary: Summary | null;
  loading: boolean;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div>
        <div className="mini-section-label">За 30 дней</div>
        <div className="mini-stats">
          {[1,2,3,4].map(i => (
            <div key={i} className="mini-stat">
              <div className="mini-skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
              <div className="mini-skeleton" style={{ height: 32, width: '70%', marginBottom: 6 }} />
              <div className="mini-skeleton" style={{ height: 12, width: '90%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Нет данных</div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 20 }}>
          Аналитика появится после первых просмотров профиля
        </div>
        <button onClick={onRetry} className="mini-btn mini-btn-ghost mini-tap" style={{ maxWidth: 200, margin: '0 auto' }}>
          Обновить
        </button>
      </div>
    );
  }

  const stats = [
    { icon: '👁',  label: 'Просмотры',  value: String(summary.profile_views),   color: '#7c3aed', bg: '#f5f3ff' },
    { icon: '📲',  label: 'Контакты',   value: String(summary.contact_reveals),  color: '#059669', bg: '#f0fdf4' },
    { icon: '📅',  label: 'Календарь',  value: String(summary.calendar_views),   color: '#d97706', bg: '#fffbeb' },
    { icon: '🎯',  label: 'Конверсия',  value: `${summary.conversion_pct}%`,     color: '#0284c7', bg: '#eff6ff' },
  ];

  return (
    <div>
      <div className="mini-section-label">За 30 дней</div>
      <div className="mini-stats">
        {stats.map(s => (
          <div key={s.label} className="mini-stat" style={{ background: s.bg, border: 'none' }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: s.color, letterSpacing: '-.03em', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 4 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <a href="/dashboard/analytics" className="mini-btn mini-btn-ghost mini-tap" style={{ marginTop: 4 }}>
        Полная аналитика →
      </a>

      <div style={{ height: 16 }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Screen: More
────────────────────────────────────────────────────── */
const MORE_ITEMS = [
  { icon: '⭐', bg: '#fffbeb', color: '#d97706', label: 'Подписка',    sub: 'Тарифы и оплата',           href: '/dashboard/subscription'  },
  { icon: '🔗', bg: '#f0f9ff', color: '#0ea5e9', label: 'Интеграции',  sub: 'Telegram-бот',              href: '/dashboard/integrations'  },
  { icon: '🔔', bg: '#f5f3ff', color: '#7c3aed', label: 'Напоминания', sub: 'Настройки уведомлений',     href: '/dashboard/notifications' },
  { icon: '⚙️', bg: '#f9fafb', color: '#6b7280', label: 'Настройки',   sub: 'Аккаунт и безопасность',   href: '/dashboard/settings'      },
] as const;

function MiniMoreScreen({ tgUser }: { tgUser: TgUser | null }) {
  return (
    <div>
      {/* User card */}
      {tgUser && (
        <div className="mini-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="mini-avatar">
            {tgUser.first_name[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {tgUser.first_name}{tgUser.last_name ? ` ${tgUser.last_name}` : ''}
            </div>
            {tgUser.username && (
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                @{tgUser.username}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mini-section-label">Настройки</div>
      {MORE_ITEMS.map(item => (
        <NavRow
          key={item.label}
          icon={item.icon}
          iconBg={item.bg}
          iconColor={item.color}
          label={item.label}
          sub={item.sub}
          href={item.href}
        />
      ))}

      {/* Web dashboard link */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.06)' }}>
        <a href="/dashboard" className="mini-btn mini-btn-outline mini-tap">
          Открыть кабинет на сайте →
        </a>
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Overlay: Add action sheet
────────────────────────────────────────────────────── */
function AddSheet({
  hasProfile, onClose,
}: {
  hasProfile: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Что добавить?</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <a
              href="/dashboard/calendar/new"
              className="mini-row mini-tap"
            >
              <div className="mini-row-icon" style={{ background: '#f0fdf4', color: '#059669' }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Запись в календарь</div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                  Занятость, бронь или свободный день
                </div>
              </div>
              <span className="mini-row-chevron">›</span>
            </a>

            {!hasProfile && (
              <a
                href="/dashboard/onboarding"
                className="mini-row mini-tap"
              >
                <div className="mini-row-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Новый профиль</div>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                    Создать публичный профиль специалиста
                  </div>
                </div>
                <span className="mini-row-chevron">›</span>
              </a>
            )}
          </div>

          <button
            onClick={onClose}
            className="mini-tap"
            style={{
              marginTop: 16, width: '100%',
              padding: '13px', border: 'none',
              background: 'rgba(0,0,0,.06)',
              borderRadius: 13,
              fontFamily: 'inherit', fontSize: 15, fontWeight: 600,
              color: 'var(--tg-theme-text-color, #0a0a0f)',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Overlay: Profile switcher
────────────────────────────────────────────────────── */
function SwitchSheet({
  providers, activeIdx, onSelect, onClose,
}: {
  providers: Provider[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>Сменить профиль</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.map((p, i) => {
              const isSelected = i === activeIdx;
              const isActive   = p.provider_status === 'active';
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(i)}
                  className="mini-tap"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(124,58,237,.08)' : 'rgba(0,0,0,.04)',
                    border: isSelected ? '1.5px solid rgba(124,58,237,.3)' : '1.5px solid transparent',
                    borderRadius: 13,
                    width: '100%', textAlign: 'left',
                    fontFamily: 'inherit', cursor: 'pointer',
                  }}
                >
                  <div className="mini-avatar-sm">{p.display_name[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.display_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span className="mini-status-dot" style={{ background: isActive ? '#22c55e' : '#9ca3af' }} />
                      <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                        {isActive ? 'Активен' : 'Скрыт'}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: 18, color: '#7c3aed' }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Onboarding gate (shown before shell for new users)
────────────────────────────────────────────────────── */
const ONBOARDING_STEPS = [
  { icon: '👤', label: 'Основное',  desc: 'Имя, категория, город, описание' },
  { icon: '📸', label: 'Фото',      desc: 'До 10 фотографий' },
  { icon: '📞', label: 'Контакты',  desc: 'Телефон, Telegram, Instagram' },
  { icon: '📅', label: 'Календарь', desc: 'Занятость на ближайшие месяцы' },
];

function OnboardingGate({
  tgUser, onContinue,
}: {
  tgUser: TgUser | null;
  onContinue: () => void;
}) {
  return (
    <>
      <MiniStyles />
      <div className="mini-root" style={{ padding: '32px 20px 24px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <OctiMark size={28} />
          <button
            onClick={onContinue}
            className="mini-tap"
            style={{
              fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color, #9ca3af)',
              background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: 0,
            }}
          >
            Пропустить →
          </button>
        </div>

        {/* Welcome */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>👋</div>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 10 }}>
            {tgUser ? `Привет, ${tgUser.first_name}!` : 'Добро пожаловать!'}
          </div>
          <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.55 }}>
            Создайте профиль — и клиенты со всего Казахстана найдут вас на сайте.
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {ONBOARDING_STEPS.map((step, i) => (
            <div key={step.label} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '12px 14px',
              background: 'var(--tg-theme-secondary-bg-color, #fff)',
              border: '1px solid rgba(0,0,0,.07)',
              borderRadius: 14,
            }}>
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                borderRadius: 11, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 18, flexShrink: 0,
              }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  <span style={{ color: '#7c3aed', marginRight: 6, fontSize: 12, fontWeight: 800 }}>{i + 1}.</span>
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href="/dashboard/onboarding"
          className="mini-tap"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '15px', marginBottom: 12,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: 15, fontSize: 16, fontWeight: 700, color: '#fff',
            textDecoration: 'none',
            boxShadow: '0 4px 18px rgba(124,58,237,.38)',
          }}
        >
          Начать создание профиля →
        </a>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
          30 дней бесплатно · Без карты
        </div>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Reusable: loader
────────────────────────────────────────────────────── */
export function MiniLoader() {
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        @keyframes mini-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--tg-theme-bg-color, #f7f6ff)',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid rgba(124,58,237,.2)',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'mini-spin 0.7s linear infinite',
        }} />
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Reusable: nav row
────────────────────────────────────────────────────── */
function NavRow({
  icon, iconBg, iconColor, label, sub, href,
}: {
  icon: string; iconBg: string; iconColor: string;
  label: string; sub: string; href: string;
}) {
  return (
    <a href={href} className="mini-row mini-tap">
      <div className="mini-row-icon" style={{ background: iconBg, color: iconColor }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>{sub}</div>
      </div>
      <span className="mini-row-chevron">›</span>
    </a>
  );
}

/* ──────────────────────────────────────────────────────
   Reusable: empty state
────────────────────────────────────────────────────── */
function EmptyState({
  icon, title, sub, href, cta,
}: {
  icon: string; title: string; sub: string; href: string; cta: string;
}) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 48 }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 28, lineHeight: 1.5 }}>{sub}</div>
      <a
        href={href}
        className="mini-tap"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: '13px 28px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          borderRadius: 13, fontSize: 15, fontWeight: 700, color: '#fff',
          textDecoration: 'none',
          boxShadow: '0 3px 12px rgba(124,58,237,.3)',
        }}
      >
        {cta}
      </a>
    </div>
  );
}
