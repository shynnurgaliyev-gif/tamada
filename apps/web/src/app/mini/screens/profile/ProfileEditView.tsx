/* ── ProfileEditView ───────────────────────────────────────────────────────────
   Edit basic provider fields: display_name, bio, city, provider_status,
   publication_status.
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

export function ProfileEditView({
  provider,
  saving,
  onSave,
}: {
  provider:  Provider;
  saving:    boolean;
  onSave:    (fields: ProviderUpdate) => Promise<void>;
}) {
  const [name,        setName]        = useState(provider.display_name);
  const [bio,         setBio]         = useState(provider.bio ?? '');
  const [city,        setCity]        = useState(provider.city ?? '');
  const [status,      setStatus]      = useState(provider.provider_status);
  const [pubVisible,  setPubVisible]  = useState(provider.publication_status === 'visible');
  const [nameErr,     setNameErr]     = useState(false);

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
          value={city}
          maxLength={80}
          placeholder="Алматы"
          onChange={e => setCity(e.target.value)}
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
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
