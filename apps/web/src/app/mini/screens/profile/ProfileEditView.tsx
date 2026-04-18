/* ── ProfileEditView ───────────────────────────────────────────────────────────
   Edit basic provider fields.
   Header: [✕ Отмена]  title  [✓ Сохранить]  — no sticky bottom CTA.
   City / category / subcategory use MiniPicker bottom-sheet.
────────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import { MiniPicker, SUBCATEGORIES } from '../../overlays/MiniPicker';
import type { Provider, ProviderUpdate } from '../../types';

const STATUS_OPTS = [
  { value: 'active',   label: 'Активен'  },
  { value: 'inactive', label: 'Скрыт'    },
  { value: 'sick',     label: 'Болею'    },
  { value: 'vacation', label: 'Отпуск'   },
] as const;

const CATEGORIES = [
  'Тамада', 'Фотограф', 'Видеограф', 'DJ',
  'Декоратор', 'Флорист', 'Артист', 'Аниматор',
];

const KZ_CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтобе',
  'Тараз', 'Павлодар', 'Өскемен', 'Семей', 'Атырау',
  'Қостанай', 'Петропавл', 'Орал', 'Ақтау', 'Қызылорда',
  'Теміртау', 'Түркістан', 'Көкшетау', 'Талдықорған', 'Рудный',
];

type Picker = 'city' | 'category' | 'subcategory' | null;

export function ProfileEditView({
  provider,
  saving,
  onSave,
  onCancel,
  onUpdateCategory,
}: {
  provider:          Provider;
  saving:            boolean;
  onSave:            (fields: ProviderUpdate) => Promise<void>;
  onCancel:          () => void;
  onUpdateCategory?: (category: string, subcategory?: string) => Promise<boolean>;
}) {
  const [name,       setName]       = useState(provider.display_name);
  const [bio,        setBio]        = useState(provider.bio ?? '');
  const [city,       setCity]       = useState(provider.city ?? '');
  const [status,     setStatus]     = useState(provider.provider_status);
  const [pubVisible, setPubVisible] = useState(provider.publication_status === 'visible');
  const [category,   setCategory]   = useState(provider.primary_category ?? '');
  const [subcategory,setSubcategory]= useState(provider.primary_subcategory ?? '');
  const [nameErr,    setNameErr]    = useState(false);
  const [picker,     setPicker]     = useState<Picker>(null);

  async function handleSave() {
    if (!name.trim()) { setNameErr(true); return; }
    setNameErr(false);
    await onSave({
      display_name:       name.trim(),
      bio:                bio.trim() || null,
      city:               city.trim() || null,
      provider_status:    status,
      publication_status: pubVisible ? 'visible' : 'hidden',
    });
    if (onUpdateCategory && category) {
      await onUpdateCategory(category, subcategory || undefined);
    }
  }

  return (
    <>
      {/* ── Inline header ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 14,
        borderBottom: '1px solid rgba(0,0,0,.07)',
      }}>
        <button
          className="mini-tap"
          onClick={onCancel}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: 'var(--tg-theme-hint-color,#6b7280)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Отмена
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Редактирование</span>
        <button
          className="mini-tap"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: saving ? 'rgba(124,58,237,.45)' : '#7c3aed', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      {/* ── Name ──────────────────────────────────────────────── */}
      <div className="mini-field">
        <label>Имя / бренд</label>
        <input
          className="mini-input"
          data-error={nameErr}
          value={name}
          maxLength={80}
          onChange={e => { setName(e.target.value); setNameErr(false); }}
        />
        {nameErr && <div className="mini-error-msg">Обязательное поле</div>}
      </div>

      {/* ── Bio ───────────────────────────────────────────────── */}
      <div className="mini-field">
        <label>О себе</label>
        <textarea
          className="mini-input"
          rows={4}
          value={bio}
          maxLength={600}
          placeholder="Расскажите о себе, опыте, стиле работы…"
          onChange={e => setBio(e.target.value)}
        />
      </div>

      {/* ── Picker rows ───────────────────────────────────────── */}
      <PickerRow label="Город"        value={city}        placeholder="Не указан"       onOpen={() => setPicker('city')} />
      <PickerRow label="Категория"    value={category}    placeholder="Не выбрана"      onOpen={() => setPicker('category')} />
      <PickerRow label="Подкатегория" value={subcategory} placeholder="Не указана"      onOpen={() => setPicker('subcategory')} optional />

      {/* ── Status grid ───────────────────────────────────────── */}
      <div className="mini-section-label">Статус</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
        {STATUS_OPTS.map(s => (
          <button
            key={s.value}
            className="mini-tap"
            onClick={() => setStatus(s.value)}
            style={{
              padding: '10px 12px',
              border: status === s.value ? '1.5px solid #7c3aed' : '1.5px solid rgba(0,0,0,.08)',
              borderRadius: 12,
              background: status === s.value ? 'rgba(124,58,237,.07)' : 'var(--tg-theme-secondary-bg-color,#fff)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
              color: status === s.value ? '#7c3aed' : 'inherit',
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* ── Visibility toggle ─────────────────────────────────── */}
      <div className="mini-toggle-row">
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Показывать на сайте</div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color,#6b7280)', marginTop: 2 }}>
            {pubVisible ? 'Профиль виден всем' : 'Профиль скрыт от клиентов'}
          </div>
        </div>
        <label className="mini-toggle">
          <input type="checkbox" checked={pubVisible} onChange={e => setPubVisible(e.target.checked)} />
          <span className="mini-toggle-track" />
          <span className="mini-toggle-thumb" />
        </label>
      </div>

      {/* ── Pickers ───────────────────────────────────────────── */}
      {picker === 'city' && (
        <MiniPicker
          title="Город"
          options={KZ_CITIES}
          value={city}
          allowCustom
          onConfirm={v => { setCity(v); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'category' && (
        <MiniPicker
          title="Категория"
          options={CATEGORIES}
          value={category}
          allowCustom
          onConfirm={v => { setCategory(v); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'subcategory' && (
        <MiniPicker
          title="Подкатегория"
          options={SUBCATEGORIES[category] ?? []}
          value={subcategory}
          allowCustom
          onConfirm={v => { setSubcategory(v); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

/* ── PickerRow ─────────────────────────────────────────────────────────────── */
function PickerRow({ label, value, placeholder, onOpen, optional }: {
  label:       string;
  value:       string;
  placeholder: string;
  onOpen:      () => void;
  optional?:   boolean;
}) {
  return (
    <button
      className="mini-tap"
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '13px 16px',
        background: 'var(--tg-theme-secondary-bg-color,#fff)',
        border: '1px solid rgba(0,0,0,.09)',
        borderRadius: 12, marginBottom: 10,
        fontFamily: 'inherit', cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tg-theme-hint-color,#6b7280)', marginBottom: 2 }}>
          {label}{optional ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — необязательно</span> : ''}
        </div>
        <div style={{ fontSize: 15, fontWeight: value ? 600 : 400, color: value ? 'var(--tg-theme-text-color,#0a0a0f)' : 'var(--tg-theme-hint-color,#9ca3af)' }}>
          {value || placeholder}
        </div>
      </div>
      <span style={{ fontSize: 16, color: 'rgba(0,0,0,.2)', marginLeft: 8 }}>›</span>
    </button>
  );
}
