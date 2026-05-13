'use client';

import { useState } from 'react';
import type { MiniPermissions, Provider, TgUser } from '../types';
import { ActivityTool } from './more/ActivityTool';
import { IntegrationsTool } from './more/IntegrationsTool';
import { NotificationsTool } from './more/NotificationsTool';
import { SettingsTool } from './more/SettingsTool';
import { SubscriptionTool } from './more/SubscriptionTool';
import { TeamTool } from './more/TeamTool';

type MoreView = 'main' | 'subscription' | 'integrations' | 'team' | 'settings' | 'activity' | 'notifications';

export function MiniMoreScreen({
  tgUser,
  permissions,
  activeProvider,
  subStatus,
  subDaysLeft,
  onProvidersChanged,
}: {
  tgUser: TgUser | null;
  permissions: MiniPermissions;
  activeProvider: Provider | null;
  subStatus?: string | null;
  subDaysLeft?: number | null;
  onProvidersChanged: () => Promise<void>;
}) {
  const [view, setView] = useState<MoreView>('main');

  if (view !== 'main') {
    return (
      <div>
        <button
          className="mini-tap"
          onClick={() => setView('main')}
          style={{ border: 'none', background: 'transparent', padding: '0 0 14px', fontWeight: 800, color: '#6d28d9' }}
        >
          ← Назад
        </button>
        {view === 'subscription' && permissions.can_manage_subscription && <SubscriptionTool />}
        {view === 'integrations' && permissions.can_manage_integrations && <IntegrationsTool provider={activeProvider} />}
        {view === 'team' && permissions.can_manage_team && <TeamTool provider={activeProvider} />}
        {view === 'activity' && permissions.can_manage_team && <ActivityTool provider={activeProvider} />}
        {view === 'notifications' && <NotificationsTool provider={activeProvider} />}
        {view === 'settings' && (permissions.can_manage_subscription || permissions.can_manage_integrations || permissions.can_archive_profile) && (
          <SettingsTool tgUser={tgUser} provider={activeProvider} canArchive={permissions.can_archive_profile} onProvidersChanged={onProvidersChanged} />
        )}
      </div>
    );
  }

  const items = [
    permissions.can_manage_subscription && {
      id: 'subscription' as const,
      icon: '⭐',
      bg: '#fffbeb',
      color: '#d97706',
      label: 'Подписка',
      sub: subscriptionSummary(subStatus, subDaysLeft) ?? 'Статус, оплата и история платежей',
    },
    permissions.can_manage_integrations && {
      id: 'integrations' as const,
      icon: '🔗',
      bg: '#f0f9ff',
      color: '#0ea5e9',
      label: 'Интеграции',
      sub: 'Telegram, Mini App и будущие подключения',
    },
    permissions.can_manage_team && {
      id: 'activity' as const,
      icon: 'Ж',
      bg: '#eef2ff',
      color: '#4338ca',
      label: 'История действий',
      sub: 'Кто и что менял по активному профилю',
    },
    permissions.can_manage_team && {
      id: 'team' as const,
      icon: '👥',
      bg: '#f0fdf4',
      color: '#059669',
      label: 'Команда',
      sub: 'Помощники этого профиля',
    },
    {
      id: 'notifications' as const,
      icon: '🔔',
      bg: '#fef3c7',
      color: '#d97706',
      label: 'Напоминания',
      sub: 'Лог отправленных Telegram-уведомлений',
    },
    (permissions.can_manage_subscription || permissions.can_manage_integrations || permissions.can_archive_profile) && {
      id: 'settings' as const,
      icon: '⚙️',
      bg: '#f9fafb',
      color: '#6b7280',
      label: 'Настройки',
      sub: 'Аккаунт, Telegram, архив и поддержка',
    },
  ].filter(Boolean) as Array<{ id: MoreView; icon: string; bg: string; color: string; label: string; sub: string }>;

  return (
    <div>
      {tgUser && (
        <div className="mini-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="mini-avatar">{tgUser.first_name[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {tgUser.first_name}{tgUser.last_name ? ` ${tgUser.last_name}` : ''}
            </div>
            {tgUser.username && (
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>@{tgUser.username}</div>
            )}
          </div>
        </div>
      )}

      <div className="mini-section-label">Ещё</div>

      {items.length === 0 && (
        <div className="mini-card" style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Для вашей роли доступен только календарь и просмотр профиля.
        </div>
      )}

      {items.map(item => (
        <button
          key={item.id}
          className="mini-row mini-tap"
          onClick={() => setView(item.id)}
          style={{ width: '100%', border: 'none', textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}
        >
          <div className="mini-row-icon" style={{ background: item.bg, color: item.color }}>{item.icon}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{item.label}</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>{item.sub}</div>
          </div>
          <span className="mini-row-chevron">›</span>
        </button>
      ))}

      <div style={{ height: 16 }} />
    </div>
  );
}

function subscriptionSummary(status?: string | null, daysLeft?: number | null): string | null {
  if (!status) return null;
  const d = Math.max(0, daysLeft ?? 0);
  if (status === 'expired' || status === 'blocked' || status === 'cancelled') {
    return 'Истекла — нужна оплата';
  }
  if (status === 'expiring') return `Истекает через ${d} дн — пора оплатить`;
  if (status === 'trial')    return `Пробный период · ${d} дн осталось`;
  if (status === 'active')   return `Активна · ${d} дн до продления`;
  return null;
}
