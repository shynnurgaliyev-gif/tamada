'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OctiMark } from '@/components/OctiLogo';

/* ── Telegram WebApp types ───────────────────────────── */
declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready(): void;
        expand(): void;
        close(): void;
        isExpanded: boolean;
        colorScheme: 'light' | 'dark';
        initDataUnsafe: {
          start_param?: string;
          user?: { id: number; first_name: string; last_name?: string; username?: string };
        };
        BackButton: { show(): void; hide(): void; onClick(fn: () => void): void; offClick(fn: () => void): void; isVisible: boolean };
        MainButton: { show(): void; hide(): void; setText(text: string): void; onClick(fn: () => void): void; offClick(fn: () => void): void; isVisible: boolean };
        themeParams: { bg_color?: string; text_color?: string; hint_color?: string; button_color?: string; button_text_color?: string; secondary_bg_color?: string };
      };
    };
  }
}

/* ── Flow types ──────────────────────────────────────── */
export type TgFlow = 'dashboard' | 'onboarding' | 'profiles';

const VALID_FLOWS: TgFlow[] = ['dashboard', 'onboarding', 'profiles'];

function isValidFlow(v: string | null): v is TgFlow {
  return VALID_FLOWS.includes(v as TgFlow);
}

/* ── Quick-action items for Dashboard screen ─────────── */
const QUICK_ACTIONS = [
  { icon: '📅', label: 'Календарь',  href: '/dashboard/calendar',     color: '#059669', bg: '#f0fdf4' },
  { icon: '👤', label: 'Профиль',    href: '/dashboard/provider',      color: '#7c3aed', bg: '#f5f3ff' },
  { icon: '📊', label: 'Аналитика',  href: '/dashboard/analytics',     color: '#0284c7', bg: '#eff6ff' },
  { icon: '⭐', label: 'Подписка',   href: '/dashboard/subscription',  color: '#d97706', bg: '#fffbeb' },
  { icon: '🔗', label: 'Интеграции', href: '/dashboard/integrations',  color: '#0ea5e9', bg: '#f0f9ff' },
  { icon: '⚙️', label: 'Настройки',  href: '/dashboard/settings',      color: '#6b7280', bg: '#f9fafb' },
] as const;

/* ── Onboarding steps ────────────────────────────────── */
const ONBOARDING_STEPS = [
  { icon: '👤', label: 'Основное',  desc: 'Имя, категория, город, описание' },
  { icon: '📸', label: 'Фото',      desc: 'До 10 фотографий' },
  { icon: '📞', label: 'Контакты',  desc: 'Телефон, Telegram, Instagram' },
  { icon: '📅', label: 'Календарь', desc: 'Занятость на ближайшие месяцы' },
];

/* ─────────────────────────────────────────────────────── */

export default function MiniShell() {
  const params      = useSearchParams();
  const [flow, setFlow]   = useState<TgFlow>('dashboard');
  const [tgUser, setTgUser] = useState<{ first_name: string; username?: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;

    // 1. Signal readiness to Telegram
    tg?.ready();
    tg?.expand();

    // 2. Resolve flow:
    //    Priority: URL param `tg_flow` > Telegram start_param > default 'dashboard'
    const urlFlow   = params.get('tg_flow');
    const startFlow = tg?.initDataUnsafe?.start_param ?? null;
    const resolved  = isValidFlow(urlFlow) ? urlFlow : isValidFlow(startFlow) ? startFlow : 'dashboard';

    setFlow(resolved);

    // 3. User info from Telegram
    const user = tg?.initDataUnsafe?.user;
    if (user) setTgUser(user);

    // 4. Back button — hide on dashboard (top level), show on sub-flows
    if (tg?.BackButton) {
      if (resolved === 'dashboard') {
        tg.BackButton.hide();
      } else {
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
          tg.BackButton.hide();
          setFlow('dashboard');
        });
      }
    }

    setReady(true);
  }, [params]);

  if (!ready) return null;

  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; height: 100%; }
        body { background: var(--tg-theme-bg-color, #f7f6ff); overscroll-behavior: none; }
        * { box-sizing: border-box; }
        .mini-tap { -webkit-tap-highlight-color: transparent; }
        .mini-tap:active { opacity: 0.7; }
        @keyframes mini-fadein { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .mini-fadein { animation: mini-fadein 0.22s ease both; }
      `}</style>

      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--tg-theme-bg-color, #f7f6ff)',
        color: 'var(--tg-theme-text-color, #0a0a0f)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        paddingBottom: 'env(safe-area-inset-bottom, 16px)',
      }}>

        {/* ── Top bar ─────────────────────────── */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 20px 12px',
          borderBottom: '1px solid rgba(0,0,0,.07)',
          background: 'var(--tg-theme-bg-color, #fff)',
          flexShrink: 0,
        }}>
          <OctiMark size={26} />
          <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-.04em', color: 'var(--tg-theme-text-color, #0a0a0f)' }}>
            Octiqa
          </span>
          <FlowBadge flow={flow} />
        </div>

        {/* ── Screen content ──────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }} className="mini-fadein" key={flow}>
          {flow === 'dashboard'   && <DashboardScreen  tgUser={tgUser} onNavigate={setFlow} />}
          {flow === 'onboarding'  && <OnboardingScreen />}
          {flow === 'profiles'    && <ProfilesScreen  />}
        </div>

      </div>
    </>
  );
}

/* ── Flow badge ──────────────────────────────────────── */
function FlowBadge({ flow }: { flow: TgFlow }) {
  const labels: Record<TgFlow, string> = {
    dashboard:  'Кабинет',
    onboarding: 'Регистрация',
    profiles:   'Профили',
  };
  const colors: Record<TgFlow, string> = {
    dashboard:  '#7c3aed',
    onboarding: '#059669',
    profiles:   '#0284c7',
  };
  return (
    <span style={{
      marginLeft: 'auto',
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '.06em',
      textTransform: 'uppercase',
      color: colors[flow],
      background: `${colors[flow]}18`,
      padding: '3px 8px',
      borderRadius: 6,
    }}>
      {labels[flow]}
    </span>
  );
}

/* ── Dashboard screen ────────────────────────────────── */
function DashboardScreen({
  tgUser,
  onNavigate,
}: {
  tgUser: { first_name: string; username?: string } | null;
  onNavigate: (flow: TgFlow) => void;
}) {
  return (
    <div>
      {/* Greeting */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 4 }}>
          {tgUser ? `Привет, ${tgUser.first_name} 👋` : 'Добро пожаловать 👋'}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.4 }}>
          Управляйте профилем и расписанием
        </div>
      </div>

      {/* Quick actions grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
        marginBottom: 24,
      }}>
        {QUICK_ACTIONS.map(item => (
          <a
            key={item.label}
            href={item.href}
            className="mini-tap"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              padding: '14px 8px',
              background: item.bg,
              borderRadius: 14,
              textDecoration: 'none',
              color: item.color,
              transition: 'opacity 0.1s',
            }}
          >
            <span style={{ fontSize: 24 }}>{item.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.2 }}>
              {item.label}
            </span>
          </a>
        ))}
      </div>

      {/* Section divider */}
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--tg-theme-hint-color, #9ca3af)', marginBottom: 10 }}>
        Быстрые действия
      </div>

      {/* Secondary actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
        <QuickLink
          icon="📋"
          label="Пройти онбординг"
          sub="Заполните профиль с нуля"
          href="/dashboard/onboarding"
          onClick={() => onNavigate('onboarding')}
        />
        <QuickLink
          icon="👥"
          label="Мои профили"
          sub="Просмотр и редактирование"
          href="/dashboard/provider"
          onClick={() => onNavigate('profiles')}
        />
        <QuickLink
          icon="🔔"
          label="Напоминания"
          sub="Настройка уведомлений"
          href="/dashboard/notifications"
        />
      </div>

      {/* Full dashboard link */}
      <a
        href="/dashboard"
        className="mini-tap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '12px',
          border: '1.5px solid rgba(124,58,237,.25)',
          borderRadius: 12,
          fontSize: 14,
          fontWeight: 600,
          color: '#7c3aed',
          textDecoration: 'none',
        }}
      >
        Открыть полный кабинет →
      </a>
    </div>
  );
}

/* ── Onboarding screen ───────────────────────────────── */
function OnboardingScreen() {
  return (
    <div>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 8 }}>
          Создайте ваш профиль
        </div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.5 }}>
          Несколько шагов — и ваш профиль<br />появится на сайте для клиентов
        </div>
      </div>

      {/* Steps preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {ONBOARDING_STEPS.map((step, i) => (
          <div
            key={step.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              background: 'rgba(124,58,237,.06)',
              borderRadius: 12,
              border: '1.5px solid rgba(124,58,237,.12)',
            }}
          >
            <div style={{
              width: 38,
              height: 38,
              background: '#7c3aed',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              flexShrink: 0,
            }}>
              {step.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                <span style={{ color: '#7c3aed', marginRight: 6, fontSize: 12 }}>{i + 1}.</span>
                {step.label}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                {step.desc}
              </div>
            </div>
            <span style={{ fontSize: 16, color: 'rgba(124,58,237,.35)', flexShrink: 0 }}>›</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a
        href="/dashboard/onboarding"
        className="mini-tap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '15px',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #a855f7 100%)',
          borderRadius: 14,
          fontSize: 16,
          fontWeight: 700,
          color: '#fff',
          textDecoration: 'none',
          boxShadow: '0 4px 16px rgba(124,58,237,.35)',
          marginBottom: 12,
        }}
      >
        Начать создание профиля →
      </a>

      <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
        30 дней бесплатно · Без карты
      </div>
    </div>
  );
}

/* ── Profiles screen ─────────────────────────────────── */
function ProfilesScreen() {
  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-.03em', marginBottom: 4 }}>
          Мои профили
        </div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Управление публичными профилями
        </div>
      </div>

      {/* Profile actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <QuickLink
          icon="👤"
          label="Мои профили"
          sub="Просмотр и редактирование профилей"
          href="/dashboard/provider"
        />
        <QuickLink
          icon="✏️"
          label="Редактировать профиль"
          sub="Фото, описание, услуги, цены"
          href="/dashboard/provider/edit"
        />
        <QuickLink
          icon="📸"
          label="Фотографии"
          sub="Загрузить и упорядочить фото"
          href="/dashboard/provider/edit"
        />
        <QuickLink
          icon="👁"
          label="Предпросмотр профиля"
          sub="Как вас видят клиенты"
          href="/dashboard/provider"
        />
      </div>

      {/* Create profile CTA */}
      <a
        href="/dashboard/onboarding"
        className="mini-tap"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '13px',
          border: '1.5px dashed rgba(124,58,237,.4)',
          borderRadius: 14,
          fontSize: 14,
          fontWeight: 600,
          color: '#7c3aed',
          textDecoration: 'none',
        }}
      >
        <span style={{ fontSize: 18 }}>＋</span>
        Создать новый профиль
      </a>
    </div>
  );
}

/* ── Shared QuickLink component ──────────────────────── */
function QuickLink({
  icon,
  label,
  sub,
  href,
  onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  href: string;
  onClick?: () => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
      className="mini-tap"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        background: 'var(--tg-theme-secondary-bg-color, #ffffff)',
        border: '1px solid rgba(0,0,0,.07)',
        borderRadius: 12,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, color: 'var(--tg-theme-text-color, #0a0a0f)' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {sub}
        </div>
      </div>
      <span style={{ fontSize: 18, color: 'rgba(0,0,0,.2)', flexShrink: 0 }}>›</span>
    </a>
  );
}
