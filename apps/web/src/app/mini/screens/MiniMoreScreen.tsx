'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { MiniPermissions, Provider, TgUser } from '../types';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type MoreView = 'main' | 'subscription' | 'integrations' | 'team' | 'settings' | 'transfers' | 'activity';

type Account = { id: string; username: string; phone: string; show_related_profiles: boolean };
type Subscription = {
  id: string;
  status: string;
  plan_code: string;
  starts_at: string;
  expires_at: string;
  trial_ends_at: string | null;
};
type PlanLimits = {
  included_profile_count: number;
  extra_profile_slots: number;
  max_active_profiles: number;
};
type Payment = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  payment_provider: string;
  created_at: string;
  paid_at: string | null;
};
type TelegramAccount = {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_role: string;
  is_primary: boolean;
  status: string;
  linked_at: string | null;
  access_granted_at?: string | null;
};
type TransferRequest = {
  id: string;
  provider_id: string;
  from_account_id: string;
  to_account_id: string | null;
  to_phone: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
  cancelled_at: string | null;
  provider_display_name: string;
  provider_slug: string;
  from_username: string | null;
  from_phone: string | null;
  to_username: string | null;
  to_phone_account: string | null;
};
type ActivityLog = {
  id: string;
  action_type: string;
  actor_type: string;
  actor_name: string | null;
  actor_role: string | null;
  actor_telegram_username: string | null;
  target_type: string | null;
  target_id: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};

const statusLabel: Record<string, string> = {
  trial: 'Пробный период',
  active: 'Активна',
  expiring: 'Скоро истекает',
  expired: 'Истекла',
  blocked: 'Заблокирована',
  cancelled: 'Отменена',
};
const paymentStatusLabel: Record<string, string> = {
  pending: 'Ожидание',
  paid: 'Оплачено',
  failed: 'Ошибка',
  expired: 'Истек',
  cancelled: 'Отменен',
};
const roleLabel: Record<string, string> = {
  owner: 'Владелец',
  assistant: 'Помощник',
  manager: 'Менеджер',
  other: 'Другое',
};
const activityLabel: Record<string, string> = {
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

function token() { return localStorage.getItem('session_token') ?? ''; }
function miniToken() { return localStorage.getItem('mini_auth_token') ?? ''; }
function auth() {
  const session = token();
  const mini = miniToken();
  return {
    ...(session ? { Authorization: `Bearer ${session}` } : {}),
    ...(mini ? { 'X-Mini-Auth': mini } : {}),
  };
}

export function MiniMoreScreen({
  tgUser,
  permissions,
  activeProvider,
  onProvidersChanged,
}: {
  tgUser: TgUser | null;
  permissions: MiniPermissions;
  activeProvider: Provider | null;
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
        {view === 'transfers' && permissions.can_archive_profile && <TransfersTool provider={activeProvider} onProvidersChanged={onProvidersChanged} />}
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
      sub: 'Статус, оплата и история платежей',
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
      id: 'transfers' as const,
      icon: '⇄',
      bg: '#fff7ed',
      color: '#c2410c',
      label: 'Передачи',
      sub: 'Входящие и исходящие запросы передачи профиля',
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

function SubscriptionTool() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [daysLeft, setDaysLeft] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [planLimits, setPlanLimits] = useState<PlanLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    setLoading(true);
    fetch(`${API}/account/subscription`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; subscription?: Subscription | null; days_left?: number; payments?: Payment[]; plan_limits?: PlanLimits }) => {
        if (d.ok) {
          setSub(d.subscription ?? null);
          setDaysLeft(d.days_left ?? 0);
          setPayments(d.payments ?? []);
          setPlanLimits(d.plan_limits ?? null);
        }
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  async function startTrial() {
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/account/subscription/start-trial`, { method: 'POST', headers: auth() }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; error?: string } : null;
    if (data?.ok) load();
    else setMessage(data?.error ?? 'Не удалось начать пробный период');
    setBusy(false);
  }

  async function createInvoice() {
    if (!phone.trim()) return;
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/account/payments/create-invoice`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: phone.trim() }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; message?: string; amount?: number; payment_url?: string | null; error?: string } : null;
    if (data?.ok) {
      setMessage(`${data.message ?? 'Счет выставлен'} ${data.amount ? `(${data.amount} KZT)` : ''}`);
      load();
      if (data.payment_url) window.open(data.payment_url, '_blank', 'noopener,noreferrer');
    } else {
      setMessage(data?.error ?? 'Не удалось выставить счет');
    }
    setBusy(false);
  }

  if (loading) return <MiniLoading title="Подписка" />;

  return (
    <div>
      <ToolTitle title="Подписка" subtitle="Одна подписка покрывает все профили аккаунта." />
      <div className="mini-card">
        {!sub ? (
          <>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>Подписка не активирована</div>
            <button className="mini-btn mini-btn-primary mini-tap" onClick={() => void startTrial()} disabled={busy}>
              {busy ? '...' : 'Начать пробный период'}
            </button>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', marginBottom: 12 }}>
              <Badge>{statusLabel[sub.status] ?? sub.status}</Badge>
              <span style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', fontWeight: 700 }}>{daysLeft} дн.</span>
            </div>
            <InfoRow label="Тариф" value={sub.plan_code} />
            <InfoRow label="Действует до" value={new Date(sub.expires_at).toLocaleDateString('ru-RU')} />
            {sub.trial_ends_at && <InfoRow label="Пробный до" value={new Date(sub.trial_ends_at).toLocaleDateString('ru-RU')} />}
          </>
        )}
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Профили в подписке</div>
        <InfoRow label="Включено в базу" value={`${planLimits?.included_profile_count ?? 1}`} />
        <InfoRow label="Доп. слоты" value={`${planLimits?.extra_profile_slots ?? 0}`} />
        <InfoRow label="Текущий лимит продукта" value={`${planLimits?.max_active_profiles ?? 3}`} />
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Оплата</div>
        <input
          className="mini-input"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="Номер Kaspi +7..."
          style={{ marginBottom: 8 }}
        />
        <button className="mini-btn mini-btn-primary mini-tap" onClick={() => void createInvoice()} disabled={busy || !phone.trim()}>
          {busy ? '...' : 'Выставить счет'}
        </button>
        {message && <div style={{ marginTop: 10, fontSize: 12, color: '#166534', lineHeight: 1.4 }}>{message}</div>}
      </div>

      {payments.length > 0 && (
        <div className="mini-card">
          <div style={{ fontWeight: 800, marginBottom: 10 }}>Последние оплаты</div>
          {payments.map(payment => (
            <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '9px 0', borderTop: '1px solid rgba(0,0,0,.06)' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{payment.amount} {payment.currency}</div>
                <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>{payment.payment_provider}</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: 12 }}>
                <div style={{ fontWeight: 800 }}>{paymentStatusLabel[payment.status] ?? payment.status}</div>
                <div style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>{new Date(payment.created_at).toLocaleDateString('ru-RU')}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationsTool({ provider }: { provider: Provider | null }) {
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [deepLink, setDeepLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = () => {
    if (!provider) return;
    fetch(`${API}/providers/${provider.id}/telegram-accounts`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; accounts?: TelegramAccount[] }) => { if (d.ok) setAccounts(d.accounts ?? []); })
      .catch(() => null);
  };

  useEffect(() => { load(); }, [provider?.id]);

  async function generateOwnerLink() {
    if (!provider) return;
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/telegram/link-token`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; deep_link?: string; error?: string } : null;
    if (data?.ok && data.deep_link) setDeepLink(data.deep_link);
    else setMessage(data?.error ?? 'Не удалось создать ссылку');
    setBusy(false);
  }

  async function unlink(id: string) {
    setBusy(true);
    await fetch(`${API}/telegram/unlink`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_account_id: id }),
    }).catch(() => null);
    setBusy(false);
    load();
  }

  const linked = accounts.filter(a => a.status === 'linked');

  return (
    <div>
      <ToolTitle title="Интеграции" subtitle={provider ? provider.display_name : 'Выберите профиль'} />
      <div className="mini-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 900 }}>Telegram</div>
          <Badge>{linked.length}/3</Badge>
        </div>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, marginBottom: 12 }}>
          Бот и Mini App используют подтвержденную Telegram-связь.
        </div>
        {accounts.map(account => (
          <TeamRow key={account.id} member={account} action={
            !account.is_primary && account.status === 'linked'
              ? <SmallDangerButton disabled={busy} onClick={() => void unlink(account.id)}>Отвязать</SmallDangerButton>
              : null
          } />
        ))}
        {provider && linked.length < 3 && (
          <button className="mini-btn mini-btn-outline mini-tap" style={{ marginTop: 12 }} onClick={() => void generateOwnerLink()} disabled={busy}>
            {busy ? '...' : 'Подключить Telegram'}
          </button>
        )}
        {deepLink && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,.08)', color: '#166534', fontSize: 12, wordBreak: 'break-all' }}>
            <a href={deepLink} target="_blank" rel="noopener noreferrer" style={{ color: '#166534', fontWeight: 800 }}>Открыть в Telegram</a>
            <div>{deepLink}</div>
          </div>
        )}
        {message && <div style={{ marginTop: 10, fontSize: 12, color: '#dc2626' }}>{message}</div>}
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Mini App</div>
        <InfoRow label="Auth" value="initData verified" />
        <InfoRow label="Session" value="short-lived" />
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Скоро</div>
        <InfoRow label="Календари" value="В подготовке" />
        <InfoRow label="Платежи" value="В подготовке" />
      </div>
    </div>
  );
}

function TeamTool({ provider }: { provider: Provider | null }) {
  const [team, setTeam] = useState<TelegramAccount[]>([]);
  const [inviteLink, setInviteLink] = useState('');
  const [busy, setBusy] = useState(false);

  const load = () => {
    if (!provider) return;
    fetch(`${API}/providers/${provider.id}/team`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; team?: TelegramAccount[] }) => { if (d.ok) setTeam(d.team ?? []); })
      .catch(() => null);
  };

  useEffect(() => { load(); }, [provider?.id]);

  async function inviteAssistant() {
    if (!provider) return;
    setBusy(true);
    const res = await fetch(`${API}/providers/${provider.id}/assistant-invite`, { method: 'POST', headers: auth() }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; deep_link?: string } : null;
    if (data?.ok && data.deep_link) setInviteLink(data.deep_link);
    setBusy(false);
  }

  async function revoke(id: string) {
    if (!provider) return;
    setBusy(true);
    await fetch(`${API}/providers/${provider.id}/team/${id}/revoke`, { method: 'POST', headers: auth() }).catch(() => null);
    setBusy(false);
    load();
  }

  return (
    <div>
      <ToolTitle title="Команда" subtitle={provider ? provider.display_name : 'Выберите профиль'} />
      <div className="mini-card">
        <button className="mini-btn mini-btn-primary mini-tap" onClick={() => void inviteAssistant()} disabled={busy || !provider}>
          {busy ? '...' : 'Пригласить помощника'}
        </button>
        {inviteLink && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,.08)', color: '#166534', fontSize: 12, wordBreak: 'break-all' }}>
            <a href={inviteLink} target="_blank" rel="noopener noreferrer" style={{ color: '#166534', fontWeight: 800 }}>Открыть ссылку</a>
            <div>{inviteLink}</div>
          </div>
        )}
      </div>
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Участники</div>
        {team.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Команда пока не подключена.</div>
        ) : team.map(member => (
          <TeamRow key={member.id} member={member} action={
            !member.is_primary
              ? <SmallDangerButton disabled={busy} onClick={() => void revoke(member.id)}>Отозвать</SmallDangerButton>
              : null
          } />
        ))}
      </div>
    </div>
  );
}

function ActivityTool({ provider }: { provider: Provider | null }) {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'calendar' | 'team' | 'profile'>('all');
  const [loading, setLoading] = useState(false);

  const load = () => {
    if (!provider) return;
    setLoading(true);
    const query = filter === 'all' ? '?limit=50' : `?limit=50&category=${filter}`;
    fetch(`${API}/providers/${provider.id}/activity${query}`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; activity?: ActivityLog[] }) => { if (d.ok) setItems(d.activity ?? []); })
      .catch(() => null)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [provider?.id, filter]);

  return (
    <div>
      <ToolTitle title="История действий" subtitle={provider ? provider.display_name : 'Выберите профиль'} />
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10 }}>
        {[
          ['all', 'Все'],
          ['calendar', 'Календарь'],
          ['team', 'Команда'],
          ['profile', 'Профиль'],
        ].map(([id, label]) => (
          <button
            key={id}
            className="mini-tap"
            onClick={() => setFilter(id as typeof filter)}
            style={{
              border: 'none',
              borderRadius: 8,
              padding: '8px 10px',
              background: filter === id ? '#111827' : 'rgba(0,0,0,.06)',
              color: filter === id ? '#fff' : 'var(--tg-theme-text-color, #111827)',
              fontWeight: 900,
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mini-card">
        {loading ? (
          <div className="mini-skeleton" style={{ height: 72 }} />
        ) : items.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Действий пока нет.</div>
        ) : items.map(item => <ActivityRow key={item.id} item={item} />)}
      </div>
    </div>
  );
}

function TransfersTool({ provider, onProvidersChanged }: { provider: Provider | null; onProvidersChanged: () => Promise<void> }) {
  const [incoming, setIncoming] = useState<TransferRequest[]>([]);
  const [outgoing, setOutgoing] = useState<TransferRequest[]>([]);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  const load = () => {
    fetch(`${API}/telegram/mini/transfers/incoming`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; transfer_requests?: TransferRequest[] }) => { if (d.ok) setIncoming(d.transfer_requests ?? []); })
      .catch(() => null);
    const suffix = provider ? `?provider_id=${provider.id}` : '';
    fetch(`${API}/telegram/mini/transfers/outgoing${suffix}`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; transfer_requests?: TransferRequest[] }) => { if (d.ok) setOutgoing(d.transfer_requests ?? []); })
      .catch(() => null);
  };

  useEffect(() => { load(); }, [provider?.id]);

  async function act(requestId: string, action: 'accept' | 'reject') {
    setBusyId(requestId);
    setMessage('');
    const res = await fetch(`${API}/telegram/mini/transfers/${requestId}/${action}`, {
      method: 'POST',
      headers: auth(),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; error?: string } : null;
    if (data?.ok) {
      setMessage(action === 'accept' ? 'Профиль принят. Список профилей обновлен.' : 'Запрос отклонен.');
      await onProvidersChanged();
      load();
    } else {
      setMessage(data?.error ?? 'Не удалось выполнить действие.');
    }
    setBusyId('');
  }

  return (
    <div>
      <ToolTitle title="Передачи" subtitle="Принятие профиля всегда требует отдельного подтверждения новым владельцем." />
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Входящие запросы</div>
        {incoming.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Входящих запросов нет.</div>
        ) : incoming.map(req => (
          <TransferRow key={req.id} request={req} mode="incoming" action={
            req.status === 'pending' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="mini-tap"
                  disabled={!!busyId}
                  onClick={() => void act(req.id, 'accept')}
                  style={{ border: 'none', borderRadius: 8, padding: '8px 10px', background: '#16a34a', color: '#fff', fontWeight: 900, fontSize: 12 }}
                >
                  {busyId === req.id ? '...' : 'Принять'}
                </button>
                <SmallDangerButton disabled={!!busyId} onClick={() => void act(req.id, 'reject')}>Отклонить</SmallDangerButton>
              </div>
            ) : null
          } />
        ))}
      </div>

      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Исходящие запросы</div>
        {outgoing.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)' }}>Исходящих запросов нет.</div>
        ) : outgoing.map(req => (
          <TransferRow key={req.id} request={req} mode="outgoing" action={null} />
        ))}
      </div>
      {message && <div className="mini-card" style={{ fontSize: 13, lineHeight: 1.45 }}>{message}</div>}
    </div>
  );
}

function SettingsTool({ tgUser, provider, canArchive, onProvidersChanged }: { tgUser: TgUser | null; provider: Provider | null; canArchive?: boolean; onProvidersChanged?: () => Promise<void> }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [team, setTeam] = useState<TelegramAccount[]>([]);
  const [transferPhone, setTransferPhone] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; account?: Account }) => { if (d.ok) setAccount(d.account ?? null); })
      .catch(() => null);
  }, []);

  const loadTeam = () => {
    if (!provider) return;
    fetch(`${API}/providers/${provider.id}/team`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; team?: TelegramAccount[] }) => { if (d.ok) setTeam(d.team ?? []); })
      .catch(() => null);
  };

  useEffect(() => { loadTeam(); }, [provider?.id]);

  async function makePrimary(id: string) {
    if (!provider) return;
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/providers/${provider.id}/team/${id}/make-primary`, {
      method: 'POST',
      headers: auth(),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; error?: string } : null;
    setMessage(data?.ok ? 'Главный Telegram обновлен.' : data?.error ?? 'Не удалось сменить главный Telegram.');
    setBusy(false);
    loadTeam();
  }

  async function createTransferRequest() {
    if (!provider || !transferPhone.trim()) return;
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/providers/${provider.id}/transfer-request`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ to_phone: transferPhone.trim() }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; transfer_request?: { expires_at: string }; error?: string } : null;
    setMessage(data?.ok
      ? `Запрос на передачу создан. Действует до ${new Date(data.transfer_request!.expires_at).toLocaleString('ru-RU')}.`
      : data?.error ?? 'Не удалось создать запрос на передачу.');
    setBusy(false);
  }

  async function hardDeleteProfile() {
    if (!provider || deleteConfirm !== provider.display_name) return;
    setBusy(true);
    setMessage('');
    const res = await fetch(`${API}/providers/${provider.id}/hard-delete`, {
      method: 'POST',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm_text: deleteConfirm }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; error?: string } : null;
    setMessage(data?.ok
      ? 'Профиль скрыт и помечен на удаление. Доступы помощников и приглашения отозваны.'
      : data?.error ?? 'Не удалось удалить профиль.');
    setBusy(false);
  }

  async function logout() {
    const session = token();
    if (session) {
      await fetch(`${API}/auth/logout`, { method: 'POST', headers: { Authorization: `Bearer ${session}` } }).catch(() => null);
    }
    localStorage.removeItem('session_token');
    localStorage.removeItem('mini_auth_token');
    localStorage.removeItem('mini_auth_expires_at');
    window.location.href = '/mini';
  }

  async function updateRelatedProfiles(next: boolean) {
    const previous = account;
    if (account) setAccount({ ...account, show_related_profiles: next });
    const res = await fetch(`${API}/auth/account/public-settings`, {
      method: 'PATCH',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_related_profiles: next }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; account?: Account } : null;
    if (data?.ok && data.account) setAccount(data.account);
    else if (previous) setAccount(previous);
  }

  return (
    <div>
      <ToolTitle title="Настройки" subtitle="Аккаунт и поддержка" />
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Аккаунт</div>
        <InfoRow label="Логин" value={account?.username ?? '...'} />
        <InfoRow label="Телефон" value={account?.phone ?? '...'} />
        <InfoRow label="Активный профиль" value={provider?.display_name ?? 'Не выбран'} />
      </div>
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Публичная страница</div>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, marginBottom: 10 }}>
          Показывать на публичных профилях блок с другими видимыми профилями этого аккаунта.
        </div>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14, fontWeight: 800 }}>
          Связанные профили
          <input
            type="checkbox"
            checked={!!account?.show_related_profiles}
            onChange={e => void updateRelatedProfiles(e.target.checked)}
            style={{ width: 22, height: 22 }}
          />
        </label>
      </div>
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Telegram</div>
        <InfoRow label="Пользователь" value={tgUser ? `${tgUser.first_name}${tgUser.username ? ` @${tgUser.username}` : ''}` : 'Не определен'} />
        <InfoRow label="Роль" value="Owner" />
        {team.filter(m => m.status === 'linked').map(member => (
          <TeamRow
            key={member.id}
            member={member}
            action={!member.is_primary ? (
              <button
                className="mini-tap"
                disabled={busy}
                onClick={() => void makePrimary(member.id)}
                style={{ border: 'none', borderRadius: 8, padding: '7px 9px', background: 'rgba(124,58,237,.1)', color: '#6d28d9', fontWeight: 800, fontSize: 11 }}
              >
                Сделать главным
              </button>
            ) : <Badge>Primary</Badge>}
          />
        ))}
      </div>
      {provider && canArchive && (
        <div className="mini-card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Архив профиля</div>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, marginBottom: 10 }}>
            Архивированный профиль скрыт от клиентов, но не удалён. Восстановить можно в любой момент.
          </div>
          <button
            className="mini-btn mini-btn-outline mini-tap"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setMessage('');
              const res = await fetch(`${API}/providers/${provider.id}/archive`, { method: 'POST', headers: auth() }).catch(() => null);
              const data = res ? await res.json() as { ok: boolean; error?: string } : null;
              if (data?.ok) {
                setMessage('Профиль архивирован.');
                await onProvidersChanged?.();
              } else {
                setMessage(data?.error ?? 'Не удалось архивировать профиль.');
              }
              setBusy(false);
            }}
            style={{ borderColor: 'rgba(239,68,68,.3)', color: '#dc2626' }}
          >
            Архивировать этот профиль
          </button>
        </div>
      )}
      {provider && (
        <div className="mini-card">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Передача профиля</div>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, marginBottom: 10 }}>
            Создаст безопасный pending request. Передача не завершится без отдельного подтверждения.
          </div>
          <input className="mini-input" value={transferPhone} onChange={e => setTransferPhone(e.target.value)} placeholder="Телефон нового owner" style={{ marginBottom: 8 }} />
          <button className="mini-btn mini-btn-outline mini-tap" disabled={busy || !transferPhone.trim()} onClick={() => void createTransferRequest()}>
            Создать запрос передачи
          </button>
        </div>
      )}
      {provider && (
        <div className="mini-card" style={{ border: '1px solid rgba(239,68,68,.24)' }}>
          <div style={{ fontWeight: 900, marginBottom: 8, color: '#dc2626' }}>Опасная зона</div>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, marginBottom: 10 }}>
            Для удаления сначала профиль будет скрыт и помечен на удаление. Введите название профиля: <b>{provider.display_name}</b>
          </div>
          <input className="mini-input" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={provider.display_name} style={{ marginBottom: 8 }} />
          <button className="mini-btn mini-tap" disabled={busy || deleteConfirm !== provider.display_name} onClick={() => void hardDeleteProfile()} style={{ background: '#dc2626', color: '#fff' }}>
            Подтвердить удаление профиля
          </button>
        </div>
      )}
      {message && (
        <div className="mini-card" style={{ fontSize: 13, lineHeight: 1.45 }}>
          {message}
        </div>
      )}
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Поддержка</div>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45 }}>
          По вопросам оплаты, профилей и доступа помощников напишите в поддержку Tamada.
        </div>
      </div>
      <button className="mini-btn mini-btn-outline mini-tap" onClick={() => void logout()}>
        Выйти из Mini App
      </button>
    </div>
  );
}

function ToolTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 3 }}>{subtitle}</div>
    </div>
  );
}

function MiniLoading({ title }: { title: string }) {
  return (
    <div>
      <ToolTitle title={title} subtitle="Загрузка..." />
      <div className="mini-card"><div className="mini-skeleton" style={{ height: 80 }} /></div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '7px 0', fontSize: 13 }}>
      <span style={{ color: 'var(--tg-theme-hint-color, #6b7280)' }}>{label}</span>
      <span style={{ fontWeight: 800, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function TransferRow({ request, mode, action }: { request: TransferRequest; mode: 'incoming' | 'outgoing'; action: ReactNode }) {
  const isPending = request.status === 'pending';
  const target = request.to_username || request.to_phone_account || request.to_phone || 'не указан';
  const source = request.from_username || request.from_phone || 'владелец';
  return (
    <div style={{ padding: '12px 0', borderTop: '1px solid rgba(0,0,0,.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>{request.provider_display_name}</div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
            {mode === 'incoming' ? `От: ${source}` : `Кому: ${target}`}
          </div>
        </div>
        <Badge>{request.status}</Badge>
      </div>
      <div style={{ fontSize: 12, color: isPending ? '#92400e' : 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.4, marginBottom: action ? 10 : 0 }}>
        Действует до {new Date(request.expires_at).toLocaleString('ru-RU')}
      </div>
      {action}
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityLog }) {
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

function TeamRow({ member, action }: { member: TelegramAccount; action: ReactNode }) {
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

function Badge({ children }: { children: ReactNode }) {
  return <span style={{ background: 'rgba(124,58,237,.1)', color: '#6d28d9', borderRadius: 8, padding: '3px 8px', fontSize: 12, fontWeight: 900 }}>{children}</span>;
}

function SmallDangerButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
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
