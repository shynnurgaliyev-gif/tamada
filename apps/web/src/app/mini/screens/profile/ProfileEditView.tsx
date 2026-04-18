/* ── ProfileEditView ───────────────────────────────────────────────────────────
   Edit basic provider fields: display_name, bio, city, category, subcategory,
   provider_status, publication_status.
────────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { Provider, ProviderUpdate } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  active:   'Активен',
  inactive: 'Скрыт',
  sick:     'Болею',
  vacation: 'Отпуск',
  blocked:  'Заблокирован',
};

const CATEGORY_CHIPS = [
  'Тамада', 'Фотограф', 'Видеограф', 'DJ',
  'Декоратор', 'Флорист', 'Артист', 'Аниматор',
];

const KZ_CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтобе',
  'Тараз', 'Павлодар', 'Өскемен', 'Семей', 'Атырау',
  'Қостанай', 'Петропавл', 'Орал', 'Ақтау', 'Қызылорда',
  'Теміртау', 'Түркістан', 'Көкшетау', 'Талдықорған', 'Рудный',
];

export function ProfileEditView({
  provider,
  saving,
  onSave,
  onUpdateCategory,
}: {
  provider:          Provider;
  saving:            boolean;
  onSave:            (fields: ProviderUpdate) => Promise<void>;
  onUpdateCategory?: (category: string, subcategory?: string) => Promise<boolean>;
}) {
  const [name,        setName]        = useState(provider.display_name);
  const [bio,         setBio]         = useState(provider.bio ?? '');
  const [city,        setCity]        = useState(provider.city ?? '');
  const [status,      setStatus]      = useState(provider.provider_status);
  const [pubVisible,  setPubVisible]  = useState(provider.publication_status === 'visible');
  const [nameErr,     setNameErr]     = useState(false);

  // Category/subcategory
  const initCat = provider.primary_category ?? '';
  const isCustomInit = !!initCat && !CATEGORY_CHIPS.includes(initCat);
  const [selectedChip,  setSelectedChip]  = useState<string>(isCustomInit ? 'custom' : initCat);
  const [customCat,     setCustomCat]     = useState(isCustomInit ? initCat : '');
  const [subcategory,   setSubcategory]   = useState(provider.primary_subcategory ?? '');

  const effectiveCategory = selectedChip === 'custom' ? customCat.trim() : selectedChip;

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
    if (onUpdateCategory && effectiveCategory) {
      await onUpdateCategory(effectiveCategory, subcategory.trim() || undefined);
    }
  }

  return (
    <div>
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

      <div className="mini-field">
        <label>Город</label>
        <input
          className="mini-input"
          list="kz-cities"
          value={city}
          maxLength={80}
          placeholder="Алматы"
          onChange={e => setCity(e.target.value)}
        />
        <datalist id="kz-cities">
          {KZ_CITIES.map(c => <option key={c} value={c} />)}
        </datalist>
      </div>

      {/* Category */}
      <div className="mini-field">
        <label>Категория</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {CATEGORY_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              className="mini-tap"
              onClick={() => setSelectedChip(chip)}
              style={{
                padding: '8px 14px',
                border: selectedChip === chip ? '1.5px solid #7c3aed' : '1.5px solid rgba(0,0,0,.10)',
                borderRadius: 20,
                background: selectedChip === chip ? 'rgba(124,58,237,.08)' : 'transparent',
                color: selectedChip === chip ? '#7c3aed' : 'inherit',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {chip}
            </button>
          ))}
          <button
            type="button"
            className="mini-tap"
            onClick={() => setSelectedChip('custom')}
            style={{
              padding: '8px 14px',
              border: selectedChip === 'custom' ? '1.5px solid #7c3aed' : '1.5px solid rgba(0,0,0,.10)',
              borderRadius: 20,
              background: selectedChip === 'custom' ? 'rgba(124,58,237,.08)' : 'transparent',
              color: selectedChip === 'custom' ? '#7c3aed' : 'inherit',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Другое
          </button>
        </div>
        {selectedChip === 'custom' && (
          <input
            className="mini-input"
            value={customCat}
            maxLength={60}
            placeholder="Ваша специальность"
            onChange={e => setCustomCat(e.target.value)}
          />
        )}
      </div>

      <div className="mini-field">
        <label>Подкатегория <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--tg-theme-hint-color,#6b7280)' }}>— необязательно</span></label>
        <input
          className="mini-input"
          value={subcategory}
          maxLength={60}
          placeholder="Например: Ведущий, DJ, Ньюборн…"
          onChange={e => setSubcategory(e.target.value)}
        />
      </div>

      <div className="mini-section-label">Статус</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 14 }}>
        {(['active', 'inactive', 'sick', 'vacation'] as const).map(s => (
          <button
            key={s}
            className="mini-tap"
            onClick={() => setStatus(s)}
            style={{
              padding: '10px 12px',
              border: status === s ? '1.5px solid #7c3aed' : '1.5px solid rgba(0,0,0,.08)',
              borderRadius: 12,
              background: status === s ? 'rgba(124,58,237,.07)' : 'var(--tg-theme-secondary-bg-color, #fff)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 700,
              color: status === s ? '#7c3aed' : 'inherit',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="mini-toggle-row">
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Показывать на сайте</div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
            {pubVisible ? 'Профиль виден всем' : 'Профиль скрыт от клиентов'}
          </div>
        </div>
        <label className="mini-toggle">
          <input
            type="checkbox"
            checked={pubVisible}
            onChange={e => setPubVisible(e.target.checked)}
          />
          <span className="mini-toggle-track" />
          <span className="mini-toggle-thumb" />
        </label>
      </div>

      <div className="mini-save-bar" style={{ paddingBottom: 8 }}>
        <button
          className="mini-btn mini-btn-primary mini-tap"
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
