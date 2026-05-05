'use client';

import { useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';
import { useVisibleViewport } from '@/lib/useVisibleViewport';
import { MiniStyles } from '../components/MiniStyles';
import type { TgUser, Provider } from '../types';
import type { CreateProfileInput } from '../hooks/useMiniApp';

const CATEGORY_CHIPS = [
  { label: 'Тамада',     value: 'Тамада'     },
  { label: 'Фотограф',  value: 'Фотограф'   },
  { label: 'Видеограф', value: 'Видеограф'  },
  { label: 'DJ',        value: 'DJ'          },
  { label: 'Декоратор', value: 'Декоратор'  },
  { label: 'Флорист',   value: 'Флорист'    },
  { label: 'Артист',    value: 'Артист'     },
  { label: 'Аниматор',  value: 'Аниматор'   },
];

type DoneAction = 'photos' | 'calendar' | 'shell';

export function MiniFirstProfileGate({
  tgUser,
  createProfile,
  onSkip,
  onDone,
}: {
  tgUser: TgUser | null;
  createProfile: (input: CreateProfileInput) => Promise<Provider | null>;
  onSkip: () => void;
  onDone: (provider: Provider, action: DoneAction) => void;
}) {
  const [step, setStep]           = useState<'form' | 'success'>('form');
  const [created, setCreated]     = useState<Provider | null>(null);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const [displayName,  setDisplayName]  = useState('');
  const [category,     setCategory]     = useState('');
  const [subcategory,  setSubcategory]  = useState('');
  const [city,         setCity]         = useState('');

  const canSubmit = displayName.trim().length >= 2 && !saving;

  // Shrink container to visible area when keyboard opens
  const { height: vpHeight } = useVisibleViewport();

  async function submit() {
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    try {
      const sub = subcategory.trim();
      const cit = city.trim();
      const provider = await createProfile({
        display_name: displayName.trim(),
        category: category.trim() || 'Другое',
        ...(sub ? { subcategory: sub } : {}),
        ...(cit ? { city: cit } : {}),
      });
      if (!provider) {
        setError('Не удалось создать профиль. Попробуйте ещё раз.');
        return;
      }
      setCreated(provider);
      setStep('success');
    } finally {
      setSaving(false);
    }
  }

  if (step === 'success' && created) {
    return (
      <>
        <MiniStyles />
        <div
          className="mini-root mini-fadein"
          style={{ padding: '40px 20px 32px', overflowY: 'auto', height: vpHeight, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Success icon */}
          <div style={{
            width: 72, height: 72,
            borderRadius: 22,
            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 34,
            marginBottom: 20,
            boxShadow: '0 6px 24px rgba(124,58,237,.35)',
          }}>
            ✅
          </div>

          <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: '-.02em', marginBottom: 6, textAlign: 'center' }}>
            Профиль создан!
          </div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 32, textAlign: 'center' }}>
            {created.display_name}
            {created.primary_category ? ` · ${created.primary_category}` : ''}
          </div>

          {/* Next steps */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            <ActionRow
              icon="📸"
              label="Добавить фото"
              sub="Фото увеличивают доверие клиентов"
              onClick={() => onDone(created, 'photos')}
            />
            <ActionRow
              icon="📅"
              label="Заполнить календарь"
              sub="Покажите клиентам свободные даты"
              onClick={() => onDone(created, 'calendar')}
            />
            <ActionRow
              icon="🔗"
              label="Открыть профиль"
              sub={`octiqa.kz/p/${created.slug}`}
              onClick={() => {
                const url = `${process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://octiqa.kz'}/p/${created.slug}`;
                window.open(url, '_blank');
                onDone(created, 'shell');
              }}
            />
          </div>

          <button
            onClick={() => onDone(created, 'shell')}
            className="mini-tap"
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color, #9ca3af)', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: '8px 0' }}
          >
            Позже →
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <MiniStyles />
      <div
        className="mini-root"
        style={{ padding: '32px 20px 24px', overflowY: 'auto', height: vpHeight }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <OctiMark size={28} />
          <button
            onClick={onSkip}
            className="mini-tap"
            style={{ fontSize: 13, fontWeight: 600, color: 'var(--tg-theme-hint-color, #9ca3af)', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}
          >
            Пропустить →
          </button>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.2, marginBottom: 6 }}>
            {tgUser ? `${tgUser.first_name}, ` : ''}создайте первый профиль
          </div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.5 }}>
            Клиенты найдут вас по имени, категории и городу.
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, border: '1px solid rgba(239,68,68,.24)', background: 'rgba(239,68,68,.08)', color: '#b91c1c', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Name */}
        <div className="mini-field">
          <label>Название профиля</label>
          <input
            className="mini-input"
            autoFocus
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Например: Айдана Той"
            maxLength={80}
          />
        </div>

        {/* Category chips */}
        <div style={{ marginBottom: 14 }}>
          <div className="mini-field" style={{ marginBottom: 8 }}>
            <label>Категория</label>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 8 }}>
            {CATEGORY_CHIPS.map(chip => (
              <button
                key={chip.value}
                className="mini-tap"
                onClick={() => setCategory(prev => prev === chip.value ? '' : chip.value)}
                style={{
                  padding: '7px 13px',
                  borderRadius: 20,
                  border: '1.5px solid',
                  borderColor: category === chip.value ? '#7c3aed' : 'rgba(0,0,0,.12)',
                  background: category === chip.value ? 'rgba(124,58,237,.1)' : 'var(--tg-theme-secondary-bg-color, #fff)',
                  color: category === chip.value ? '#6d28d9' : 'var(--tg-theme-text-color, #111827)',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <input
            className="mini-input"
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="Или введите свою категорию"
          />
        </div>

        {/* Subcategory */}
        <div className="mini-field">
          <label>Подкатегория <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(необязательно)</span></label>
          <input
            className="mini-input"
            value={subcategory}
            onChange={e => setSubcategory(e.target.value)}
            placeholder="Ведущий, DJ, Флорист..."
          />
        </div>

        {/* City */}
        <div className="mini-field">
          <label>Город <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(необязательно)</span></label>
          <input
            className="mini-input"
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Алматы"
          />
        </div>

        {/* CTA */}
        <div className="mini-save-bar" style={{ marginTop: 8 }}>
          <button
            onClick={() => void submit()}
            className="mini-btn mini-btn-primary mini-tap"
            disabled={!canSubmit}
            style={{ opacity: canSubmit ? 1 : .5 }}
          >
            {saving ? 'Создаём...' : 'Создать профиль →'}
          </button>
        </div>
      </div>
    </>
  );
}

function ActionRow({ icon, label, sub, onClick }: { icon: string; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      className="mini-tap"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '13px 14px',
        background: 'var(--tg-theme-secondary-bg-color, #fff)',
        border: '1px solid rgba(0,0,0,.07)',
        borderRadius: 14,
        textAlign: 'left',
        fontFamily: 'inherit',
        cursor: 'pointer',
        width: '100%',
      }}
    >
      <div style={{
        width: 40, height: 40,
        background: 'rgba(124,58,237,.1)',
        borderRadius: 11,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--tg-theme-text-color, #111827)' }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 16, color: 'rgba(0,0,0,.2)' }}>›</span>
    </button>
  );
}
