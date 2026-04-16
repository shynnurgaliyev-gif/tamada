import { OctiMark } from '@/components/OctiLogo';
import { MiniStyles } from '../components/MiniStyles';
import type { TgUser } from '../types';

const STEPS = [
  { icon: '👤', label: 'Основное',  desc: 'Имя, категория, город, описание' },
  { icon: '📸', label: 'Фото',      desc: 'До 10 фотографий' },
  { icon: '📞', label: 'Контакты',  desc: 'Телефон, Telegram, Instagram' },
  { icon: '📅', label: 'Календарь', desc: 'Занятость на ближайшие месяцы' },
];

export function MiniOnboardingGate({
  tgUser,
  authError,
  onContinue,
}: {
  tgUser: TgUser | null;
  authError?: string | null;
  onContinue: () => void;
}) {
  return (
    <>
      <MiniStyles />
      <div
        className="mini-root"
        style={{ padding: '32px 20px 24px', overflowY: 'auto', height: '100dvh' }}
      >
        {/* Header row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 32,
        }}>
          <OctiMark size={28} />
          <button
            onClick={onContinue}
            className="mini-tap"
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--tg-theme-hint-color, #9ca3af)',
              background: 'none',
              border: 'none',
              fontFamily: 'inherit',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Пропустить →
          </button>
        </div>

        {/* Welcome copy */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 28, marginBottom: 4 }}>👋</div>
          <div style={{
            fontSize: 24,
            fontWeight: 900,
            letterSpacing: '-.03em',
            lineHeight: 1.2,
            marginBottom: 10,
          }}>
            {tgUser ? `Привет, ${tgUser.first_name}!` : 'Добро пожаловать!'}
          </div>
          <div style={{ fontSize: 15, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.55 }}>
            Создайте профиль — и клиенты со всего Казахстана найдут вас на сайте.
          </div>
        </div>

        {authError && (
          <div style={{
            marginBottom: 18,
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

        {/* Step preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
          {STEPS.map((step, i) => (
            <div
              key={step.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '12px 14px',
                background: 'var(--tg-theme-secondary-bg-color, #fff)',
                border: '1px solid rgba(0,0,0,.07)',
                borderRadius: 14,
              }}
            >
              <div style={{
                width: 40, height: 40,
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                borderRadius: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>
                {step.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>
                  <span style={{ color: '#7c3aed', marginRight: 6, fontSize: 12, fontWeight: 800 }}>
                    {i + 1}.
                  </span>
                  {step.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
                  {step.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="mini-tap"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '15px',
            marginBottom: 12,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            borderRadius: 15,
            fontSize: 16,
            fontWeight: 700,
            color: '#fff',
            border: 'none',
            boxShadow: '0 4px 18px rgba(124,58,237,.38)',
            width: '100%',
            fontFamily: 'inherit',
          }}
        >
          Добавить первый профиль →
        </button>
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--tg-theme-hint-color, #9ca3af)' }}>
          30 дней бесплатно · Без карты
        </div>
      </div>
    </>
  );
}
