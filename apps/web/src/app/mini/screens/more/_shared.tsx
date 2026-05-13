'use client';

import type { ReactNode } from 'react';
import type {
  ActivityLog,
  TelegramAccount,
} from '@octiqa/types';

export type {
  Account,
  ActivityLog,
  Payment,
  PlanLimits,
  Subscription,
  TelegramAccount,
} from '@octiqa/types';

export const statusLabel: Record<string, string> = {
  trial: 'Пробный период',
  active: 'Активна',
  expiring: 'Скоро истекает',
  expired: 'Истекла',
  blocked: 'Заблокирована',
  cancelled: 'Отменена',
};
export const paymentStatusLabel: Record<string, string> = {
  pending: 'Ожидание',
  paid: 'Оплачено',
  failed: 'Ошибка',
  expired: 'Истек',
  cancelled: 'Отменен',
};
export const roleLabel: Record<string, string> = {
  owner: 'Владелец',
  assistant: 'Помощник',
  manager: 'Менеджер',
  other: 'Другое',
};
export const activityLabel: Record<string, string> = {
  calendar_created: 'Запись создана',
  calendar_updated: 'Запись изменена',
  calendar_deleted: 'Запись удалена',
  assistant_invited: 'Помощник приглашен',
  assistant_revoked: 'Доступ помощника отозван',
  telegram_linked: 'Telegram подключен',
  telegram_unlinked: 'Telegram отключен',
  profile_archived: 'Профиль архивирован',
  profile_unarchived: 'Профиль восстановлен',
  profile_pending_delete: 'Профиль помечен на удаление',
  ownership_transfer_created: 'Передача создана',
  ownership_transfer_accepted: 'Передача принята',
  ownership_transfer_rejected: 'Передача отклонена',
  primary_telegram_changed: 'Главный Telegram изменен',
};

export { getSessionToken as token, getMiniAuthToken as miniToken, combinedAuthHeaders as auth } from '@/lib/auth';

export function ToolTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 3 }}>{subtitle}</div>
    </div>
  );
}

export function MiniLoading({ title }: { title: string }) {
  return (
    <div>
      <ToolTitle title={title} subtitle="Загрузка..." />
      <div className="mini-card"><div className="mini-skeleton" style={{ height: 80 }} /></div>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>{label}</span>
      <span style={{ fontWeight: 800, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export function ActivityRow({ item }: { item: ActivityLog }) {
  const actor = item.actor_name || item.actor_telegram_username || (item.actor_type === 'telegram' ? 'Telegram' : 'Account');
  const startsAt = typeof item.payload_json?.['starts_at'] === 'string' ? item.payload_json['starts_at'] : null;
  const endsAt = typeof item.payload_json?.['ends_at'] === 'string' ? item.payload_json['ends_at'] : null;
  const next = item.payload_json?.['next'];
  const nextStartsAt = next && typeof next === 'object' && 'starts_at' in next && typeof next.starts_at === 'string'
    ? next.starts_at
    : null;
  const nextEndsAt = next && typeof next === 'object' && 'ends_at' in next && typeof next.ends_at === 'string'
    ? next.ends_at
    : null;
  const rangeStart = nextStartsAt ?? startsAt;
  const rangeEnd = nextEndsAt ?? endsAt;
  const summary = rangeStart && rangeEnd
    ? `${new Date(rangeStart).toLocaleString('ru-RU')} - ${new Date(rangeEnd).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
    : item.target_type ?? '';

  return (
    <div style={{ display: 'flex', gap: 10, padding: '12px 0', borderTop: '1px solid rgba(0,0,0,.06)' }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(67,56,202,.1)', color: '#4338ca', display: 'grid', placeItems: 'center', fontWeight: 900, flex: '0 0 auto' }}>
        {actor.slice(0, 1).toUpperCase()}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{activityLabel[item.action_type] ?? item.action_type}</div>
          <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)', whiteSpace: 'nowrap' }}>
            {new Date(item.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}
          </div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 3 }}>
          {actor}{item.actor_role ? ` · ${roleLabel[item.actor_role] ?? item.actor_role}` : ''}
        </div>
        {summary && (
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 4, lineHeight: 1.35 }}>
            {summary}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamRow({ member, action }: { member: TelegramAccount; action: ReactNode }) {
  const name = [member.telegram_first_name, member.telegram_last_name].filter(Boolean).join(' ')
    || member.telegram_username
    || `id:${member.telegram_user_id}`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: '1px solid rgba(0,0,0,.06)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>{name}{member.telegram_username ? ` · @${member.telegram_username}` : ''}</div>
        <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
          {member.is_primary ? 'Главный owner' : roleLabel[member.telegram_role] ?? member.telegram_role}
          {member.status ? ` · ${member.status}` : ''}
        </div>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span style={{ background: 'rgba(124,58,237,.1)', color: '#6d28d9', borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 900 }}>{children}</span>;
}

export function SmallDangerButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      className="mini-tap"
      disabled={disabled}
      onClick={onClick}
      style={{ border: 'none', borderRadius: 8, padding: '7px 9px', background: 'rgba(239,68,68,.08)', color: '#dc2626', fontWeight: 800, fontSize: 11 }}
    >
      {children}
    </button>
  );
}
