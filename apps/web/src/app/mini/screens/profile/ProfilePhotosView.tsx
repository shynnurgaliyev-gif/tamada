/* ── ProfilePhotosView ─────────────────────────────────────────────────────────
   Photo grid: upload (max 5), delete. First photo is auto-cover.
────────────────────────────────────────────────────────────────────────────── */

import { useRef } from 'react';
import type { ProviderPhoto } from '../../types';

export function ProfilePhotosView({
  photos,
  saving,
  onUpload,
  onDelete,
}: {
  photos:   ProviderPhoto[];
  saving:   boolean;
  onUpload: (file: File) => Promise<boolean>;
  onDelete: (photoId: string) => Promise<boolean>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAdd   = photos.length < 5;

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await onUpload(file);
  }

  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 14, lineHeight: 1.5 }}>
        До 5 фотографий. Первая фотография становится обложкой профиля.
      </div>

      <div className="mini-photo-grid">
        {photos.map(photo => (
          <div key={photo.id} className="mini-photo-cell">
            <img src={photo.url} alt="" />
            {photo.is_cover && (
              <div className="mini-photo-cover-badge">COVER</div>
            )}
            <button
              className="mini-photo-del mini-tap"
              onClick={() => onDelete(photo.id)}
              disabled={saving}
              aria-label="Удалить фото"
            >
              ✕
            </button>
          </div>
        ))}

        {canAdd && (
          <button
            className="mini-photo-add mini-tap"
            onClick={() => inputRef.current?.click()}
            disabled={saving}
          >
            <span className="mini-photo-add-icon">📷</span>
            {saving ? 'Загрузка…' : 'Добавить'}
          </button>
        )}
      </div>

      {photos.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '32px 0',
          color: 'var(--tg-theme-hint-color, #9ca3af)', fontSize: 14,
        }}>
          Фотографий ещё нет.<br />Добавьте первую фотографию профиля.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}
