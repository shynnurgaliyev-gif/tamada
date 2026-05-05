'use client';

import { useEffect, useState } from 'react';
import type { Provider } from '../../types';
import { API_URL as API } from '@/lib/env';
import {
  auth,
  SmallDangerButton,
  TeamRow,
  ToolTitle,
  type TelegramAccount,
} from './_shared';

export function TeamTool({ provider }: { provider: Provider | null }) {
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
