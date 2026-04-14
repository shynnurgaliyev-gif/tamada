import { NavRow } from '../components/NavRow';
import type { TgUser } from '../types';

const MORE_ITEMS = [
  { icon: '⭐', bg: '#fffbeb', color: '#d97706', label: 'Подписка',    sub: 'Тарифы и оплата',         href: '/dashboard/subscription'  },
  { icon: '🔗', bg: '#f0f9ff', color: '#0ea5e9', label: 'Интеграции',  sub: 'Telegram-бот',            href: '/dashboard/integrations'  },
  { icon: '🔔', bg: '#f5f3ff', color: '#7c3aed', label: 'Напоминания', sub: 'Настройки уведомлений',   href: '/dashboard/notifications' },
  { icon: '⚙️', bg: '#f9fafb', color: '#6b7280', label: 'Настройки',   sub: 'Аккаунт и безопасность', href: '/dashboard/settings'      },
] as const;

export function MiniMoreScreen({ tgUser }: { tgUser: TgUser | null }) {
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
