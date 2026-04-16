import { NavRow } from '../components/NavRow';
import type { MiniPermissions, TgUser } from '../types';

const MORE_ITEMS = [
  {
    permission: 'can_manage_subscription',
    icon: '⭐',
    bg: '#fffbeb',
    color: '#d97706',
    label: 'Подписка',
    sub: 'Тарифы и оплата',
    href: '/dashboard/subscription',
  },
  {
    permission: 'can_manage_integrations',
    icon: '🔗',
    bg: '#f0f9ff',
    color: '#0ea5e9',
    label: 'Интеграции',
    sub: 'Telegram-бот',
    href: '/dashboard/integrations',
  },
  {
    permission: 'can_manage_integrations',
    icon: '🔔',
    bg: '#f5f3ff',
    color: '#7c3aed',
    label: 'Напоминания',
    sub: 'Настройки уведомлений',
    href: '/dashboard/notifications',
  },
  {
    permission: 'can_manage_subscription',
    icon: '⚙️',
    bg: '#f9fafb',
    color: '#6b7280',
    label: 'Настройки',
    sub: 'Аккаунт и безопасность',
    href: '/dashboard/settings',
  },
] as const;

export function MiniMoreScreen({
  tgUser,
  permissions,
}: {
  tgUser: TgUser | null;
  permissions: MiniPermissions;
}) {
  const visibleItems = MORE_ITEMS.filter(item => permissions[item.permission]);

  return (
    <div>
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

      {visibleItems.length === 0 && (
        <div className="mini-card" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Для вашей роли доступен только календарь и просмотр профиля.
        </div>
      )}

      {visibleItems.map(item => (
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

      {visibleItems.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,.06)' }}>
          <a href="/dashboard" className="mini-btn mini-btn-outline mini-tap">
            Открыть кабинет на сайте →
          </a>
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
