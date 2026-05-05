import { useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';
import { useVisibleViewport } from '@/lib/useVisibleViewport';
import { MiniStyles } from '../components/MiniStyles';
import type { TgUser } from '../types';

export function MiniGuestGate({
  tgUser,
  authError,
  onCreateAccount,
}: {
  tgUser: TgUser | null;
  authError?: string | null;
  onCreateAccount: (input: { full_name: string }) => Promise<boolean>;
}) {
  const defaultName = [tgUser?.first_name, tgUser?.last_name].filter(Boolean).join(' ');

  // Shrink container to visible area when keyboard opens
  const { height: vpHeight } = useVisibleViewport();
  const [formOpen, setFormOpen] = useState(false);
  const [fullName, setFullName] = useState(defaultName);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (fullName.trim().length < 2 || !confirmed || busy) return;
    setBusy(true);
    setMessage(null);
    const ok = await onCreateAccount({ full_name: fullName.trim() });
    if (!ok) setMessage('Не удалось создать аккаунт. Проверьте данные и попробуйте еще раз.');
    setBusy(false);
  }

  return (
    <>
      <MiniStyles />
      <div className="mini-root" style={{ padding: '32px 20px 24px', overflowY: 'auto', height: vpHeight }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <OctiMark size={30} />
          <div style={{ fontWeight: 900, fontSize: 18 }}>Octiqa</div>
        </div>

        <div style={{ fontSize: 28, marginBottom: 8 }}>👋</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 24, lineHeight: 1.15, letterSpacing: '-.03em' }}>
          Octiqa для специалистов
        </h1>
        <p style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.55, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Вы открыли Mini App через Telegram. Пока аккаунт не создан, мы не сохраняем данные и не показываем старые профили.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 22,
        }}>
          <InfoRow title="Аккаунт" text="Сначала создается аккаунт владельца." />
          <InfoRow title="Профиль" text="После создания аккаунта вы сможете добавить первый профиль." />
          <InfoRow title="Сайт" text="Клиенты видят публичные профили на сайте, управление идет через Telegram Mini App." />
        </div>

        {authError && (
          <div style={{
            marginBottom: 14,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid rgba(239,68,68,.24)',
            background: 'rgba(239,68,68,.08)',
            color: '#b91c1c',
            fontSize: 13,
            lineHeight: 1.45,
          }}>
            {authError}
          </div>
        )}

        {!formOpen ? (
          <button className="mini-btn mini-tap" onClick={() => setFormOpen(true)} style={{ width: '100%' }}>
            Создать аккаунт
          </button>
        ) : (
          <div style={{
            padding: 14,
            background: 'var(--tg-theme-secondary-bg-color, #fff)',
            border: '1px solid rgba(0,0,0,.08)',
            borderRadius: 14,
          }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
              ФИО владельца
            </label>
            <input
              className="mini-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Например, Асем Нурланова"
              style={{ marginBottom: 12 }}
            />
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, lineHeight: 1.4, marginBottom: 12 }}>
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Создать аккаунт владельца в Octiqa и связать его с этим Telegram.</span>
            </label>
            {message && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 10 }}>{message}</div>}
            <button
              className="mini-btn mini-tap"
              disabled={busy || fullName.trim().length < 2 || !confirmed}
              onClick={() => void submit()}
              style={{ width: '100%', opacity: busy || fullName.trim().length < 2 || !confirmed ? .55 : 1 }}
            >
              {busy ? 'Создаем...' : 'Создать аккаунт'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function InfoRow({ title, text }: { title: string; text: string }) {
  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--tg-theme-secondary-bg-color, #fff)',
      border: '1px solid rgba(0,0,0,.07)',
      borderRadius: 12,
    }}>
      <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45 }}>{text}</div>
    </div>
  );
}
