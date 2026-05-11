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
  const [fullName, setFullName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    if (fullName.trim().length < 2 || busy) return;
    setBusy(true);
    setMessage(null);
    const ok = await onCreateAccount({ full_name: fullName.trim() });
    if (!ok) setMessage('Не удалось создать аккаунт. Попробуйте ещё раз.');
    setBusy(false);
  }

  return (
    <>
      <MiniStyles />
      <div className="mini-root" style={{ padding: '32px 20px 24px', overflowY: 'auto', height: vpHeight }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <OctiMark size={30} />
          <div style={{ fontWeight: 900, fontSize: 18 }}>Octiqa</div>
        </div>

        <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 24, lineHeight: 1.2, letterSpacing: '-.03em' }}>
          Добро пожаловать{tgUser?.first_name ? `, ${tgUser.first_name}` : ''}!
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 15, lineHeight: 1.5, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          Octiqa помогает специалистам управлять занятостью и связывать с клиентами. Подтвердите имя — и начнём.
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          marginBottom: 24,
        }}>
          <Benefit icon="📅" text="Управляйте календарём занятости в Telegram" />
          <Benefit icon="🌐" text="Клиенты найдут ваш профиль и увидят свободные дни" />
          <Benefit icon="🔔" text="Уведомления о бронях и напоминаниях — сюда же в Telegram" />
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

        <div style={{
          padding: 14,
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          border: '1px solid rgba(0,0,0,.08)',
          borderRadius: 14,
        }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
            Как вас зовут
          </label>
          <input
            className="mini-input"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Имя и фамилия"
            style={{ marginBottom: 12 }}
          />
          {message && <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 10 }}>{message}</div>}
          <button
            className="mini-btn mini-tap"
            disabled={busy || fullName.trim().length < 2}
            onClick={() => void submit()}
            style={{ width: '100%', opacity: busy || fullName.trim().length < 2 ? .55 : 1 }}
          >
            {busy ? 'Создаём...' : 'Начать в Octiqa'}
          </button>
          <p style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.45, margin: '10px 0 0', textAlign: 'center' }}>
            Создаст аккаунт, связанный с этим Telegram. Без пароля.
          </p>
        </div>
      </div>
    </>
  );
}

function Benefit({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 14px',
      background: 'var(--tg-theme-secondary-bg-color, #fff)',
      border: '1px solid rgba(0,0,0,.07)',
      borderRadius: 12,
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, lineHeight: 1.4, color: 'var(--tg-theme-text-color, #0a0a0f)' }}>{text}</span>
    </div>
  );
}
