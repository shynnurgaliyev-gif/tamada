'use client';

import { useEffect, useState } from 'react';
import type { Provider, TgUser } from '../../types';
import { API_URL as API } from '@/lib/env';
import {
  auth,
  Badge,
  InfoRow,
  TeamRow,
  token,
  ToolTitle,
  type Account,
  type TelegramAccount,
} from './_shared';

export function SettingsTool({ tgUser, provider, canArchive, onProvidersChanged }: { tgUser: TgUser | null; provider: Provider | null; canArchive?: boolean; onProvidersChanged?: () => Promise<void> }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [team, setTeam] = useState<TelegramAccount[]>([]);
  const [transferPhone, setTransferPhone] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [showOwnerName, setShowOwnerName] = useState(() => provider?.show_owner_name ?? false);
  const [fullNameDraft, setFullNameDraft] = useState('');
  const [fullNameSaving, setFullNameSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    fetch(`${API}/auth/me`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; account?: Account }) => {
        if (d.ok && d.account) {
          setAccount(d.account);
          setFullNameDraft(d.account.full_name ?? '');
        }
      })
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

  async function saveFullName() {
    const trimmed = fullNameDraft.trim();
    if (trimmed.length < 2) return;
    setFullNameSaving(true);
    const res = await fetch(`${API}/auth/account/profile`, {
      method: 'PATCH',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: trimmed }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; account?: Account } : null;
    if (data?.ok && data.account) {
      setAccount(data.account);
      setFullNameDraft(data.account.full_name ?? '');
    }
    setFullNameSaving(false);
  }

  async function updateShowOwnerName(next: boolean) {
    if (!provider) return;
    setShowOwnerName(next);
    const res = await fetch(`${API}/providers/${provider.id}`, {
      method: 'PATCH',
      headers: { ...auth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ show_owner_name: next }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean } : null;
    if (!data?.ok) setShowOwnerName(!next); // rollback on error
    else await onProvidersChanged?.();
  }

  return (
    <div>
      <ToolTitle title="Настройки" subtitle="Аккаунт и поддержка" />
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 10 }}>Аккаунт</div>
        <InfoRow label="Логин" value={account?.username ?? '...'} />
        <InfoRow label="Телефон" value={account?.phone ?? '...'} />
        <InfoRow label="Активный профиль" value={provider?.display_name ?? 'Не выбран'} />
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
            ФИО
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={fullNameDraft}
              onChange={e => setFullNameDraft(e.target.value)}
              placeholder="Введите ФИО"
              maxLength={100}
              style={{
                flex: 1,
                padding: '9px 12px',
                borderRadius: 10,
                border: '1px solid var(--mini-border)',
                background: 'var(--tg-theme-bg-color, #f9f9f9)',
                color: 'var(--tg-theme-text-color, #0a0a0f)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              className="mini-tap"
              onClick={() => void saveFullName()}
              disabled={fullNameSaving || fullNameDraft.trim().length < 2 || fullNameDraft.trim() === (account?.full_name ?? '')}
              style={{
                padding: '9px 14px',
                borderRadius: 10,
                border: 'none',
                background: '#7c3aed',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                fontFamily: 'inherit',
                cursor: 'pointer',
                opacity: (fullNameSaving || fullNameDraft.trim().length < 2 || fullNameDraft.trim() === (account?.full_name ?? '')) ? 0.45 : 1,
                transition: 'opacity .15s',
                flexShrink: 0,
              }}
            >
              {fullNameSaving ? '...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
      <div className="mini-card">
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Публичная страница</div>
        <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, marginBottom: 10 }}>
          Показывать на публичных профилях блок с другими видимыми профилями этого аккаунта.
        </div>
        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14, fontWeight: 800, marginBottom: provider ? 10 : 0 }}>
          Связанные профили
          <input
            type="checkbox"
            checked={!!account?.show_related_profiles}
            onChange={e => void updateRelatedProfiles(e.target.checked)}
            style={{ width: 22, height: 22 }}
          />
        </label>
        {provider && (
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontSize: 14, fontWeight: 800 }}>
            Имя владельца профиля
            <input
              type="checkbox"
              checked={showOwnerName}
              onChange={e => void updateShowOwnerName(e.target.checked)}
              style={{ width: 22, height: 22 }}
            />
          </label>
        )}
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
      {provider && (
        <button
          className="mini-tap"
          onClick={() => setShowAdvanced(v => !v)}
          style={{
            width: '100%',
            border: '1px dashed rgba(0,0,0,.18)',
            background: 'transparent',
            borderRadius: 12,
            padding: '10px 14px',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            color: 'var(--tg-theme-hint-color, #6b7280)',
            marginBottom: 12,
            cursor: 'pointer',
          }}
        >
          {showAdvanced ? 'Скрыть продвинутые настройки' : 'Показать продвинутые настройки'}
        </button>
      )}
      {showAdvanced && provider && canArchive && (
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
      {showAdvanced && provider && (
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
      {showAdvanced && provider && (
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
