'use client';

import { useEffect, useState } from 'react';
import type { Provider } from '../../types';
import { API_URL as API } from '@/lib/env';
import {
  auth,
  Badge,
  InfoRow,
  SmallDangerButton,
  TeamRow,
  ToolTitle,
  type TelegramAccount,
} from './_shared';

export function IntegrationsTool({ provider }: { provider: Provider | null }) {
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
