'use client';
import { useEffect, useState } from 'react';
import { FaTelegram } from 'react-icons/fa';
import { API_URL as API } from '@/lib/env';
import type { Provider } from '@octiqa/types';
import { getToken, StepHeader, NavButtons } from './_shared';

type TgAccount = { id: string; telegram_username: string | null; telegram_first_name: string | null; status: string };

export function Step4Telegram({ provider, onNext, onSkip, onBack }: {
  provider: Provider; onNext: () => void; onSkip: () => void; onBack: () => void;
}) {
  const [accounts, setAccounts]   = useState<TgAccount[]>([]);
  const [deepLink, setDeepLink]   = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    fetch(`${API}/providers/${provider.id}/telegram-accounts`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json())
      .then((d: { ok: boolean; accounts?: TgAccount[] }) => { if (d.ok) setAccounts(d.accounts ?? []); })
      .catch(() => null);
  }, [provider.id]);

  async function generateLink() {
    setLoading(true); setDeepLink('');
    try {
      const res = await fetch(`${API}/telegram/link-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: provider.id }),
      });
      const d = await res.json() as { ok: boolean; deep_link?: string };
      if (d.ok && d.deep_link) setDeepLink(d.deep_link);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const linked = accounts.filter(a => a.status === 'linked');

  return (
    <div>
      <StepHeader icon="✈️" title="Telegram-бот" sub="Быстро отмечайте занятость и получайте напоминания — прямо в Telegram" />

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {[
          '📅 Отмечайте занятые дни командой «занято 12.04 13:00 18:00»',
          '🔔 Бот напомнит о событиях за день',
          '👥 Можно подключить помощника или супруга/у',
          '📊 Команда «календарь» — ближайшие 7 дней',
        ].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {linked.length > 0 && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green-text)' }}>Telegram подключён</div>
            <div style={{ fontSize: 12, color: 'var(--green-text)' }}>
              {linked.map(a => a.telegram_first_name ?? (a.telegram_username ? `@${a.telegram_username}` : 'аккаунт')).join(', ')}
            </div>
          </div>
        </div>
      )}

      {linked.length === 0 && (
        deepLink ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>Ссылка действует 15 минут. Откройте в Telegram:</p>
            <a href={deepLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full">
              <FaTelegram size={16} style={{ marginRight: 8 }} />Открыть Telegram
            </a>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ink-4)', wordBreak: 'break-all' }}>{deepLink}</p>
          </div>
        ) : (
          <button onClick={() => void generateLink()} disabled={loading} className="btn btn-primary btn-full" style={{ marginBottom: 16 }}>
            {loading ? '...' : <><FaTelegram size={16} style={{ marginRight: 8 }} />Подключить Telegram</>}
          </button>
        )
      )}

      <NavButtons
        onBack={onBack}
        onNext={linked.length > 0 ? onNext : onSkip}
        nextLabel={linked.length > 0 ? 'Далее →' : 'Пропустить →'}
        nextVariant={linked.length > 0 ? 'brand' : 'ghost'}
      />
    </div>
  );
}
