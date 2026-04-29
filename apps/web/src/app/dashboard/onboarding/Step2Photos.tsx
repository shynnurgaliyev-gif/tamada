'use client';
import { useEffect, useRef, useState } from 'react';
import { API_URL as API } from '@/lib/env';
import type { Provider, ProviderPhoto as Photo } from '@octiqa/types';
import { getToken, StepHeader, NavButtons } from './_shared';

export function Step2Photos({ provider, onNext, onBack }: { provider: Provider; onNext: () => void; onBack: () => void }) {
  const [photos, setPhotos]   = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/providers/${provider.id}/data`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json())
      .then((d: { ok: boolean; photos?: Photo[] }) => { if (d.ok) setPhotos(d.photos ?? []); })
      .catch(() => null);
  }, [provider.id]);

  async function upload(file: File) {
    if (photos.length >= 5) { setError('Максимум 5 фото'); return; }
    setUploading(true); setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API}/providers/${provider.id}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const d = await res.json() as { ok: boolean; photo?: Photo; error?: string };
      if (d.ok && d.photo) setPhotos(prev => [...prev, d.photo!]);
      else setError(d.error ?? 'Ошибка загрузки');
    } catch { setError('Ошибка сети'); }
    setUploading(false);
  }

  async function deletePhoto(id: string) {
    await fetch(`${API}/providers/${provider.id}/photos/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div>
      <StepHeader icon="📷" title="Добавьте фото" sub="Хотя бы одно фото сделает профиль в 3× привлекательнее" />

      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed var(--border)', borderRadius: 'var(--r-xl)', padding: '28px 20px',
          textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--surface)',
          transition: 'border-color .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          {uploading ? 'Загружаю...' : 'Нажмите чтобы выбрать фото'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>JPEG, PNG, WebP · до 10 МБ · максимум 5 фото</div>
        <input
          ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }}
        />
      </div>

      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
          {photos.map(ph => (
            <div key={ph.id} style={{ position: 'relative', aspectRatio: '1' }}>
              <img src={ph.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
              {ph.is_cover && (
                <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, background: 'var(--brand)', color: '#fff', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>ОБЛОЖКА</span>
              )}
              <button
                onClick={() => void deletePhoto(ph.id)}
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={photos.length === 0 ? 'Пропустить →' : 'Далее →'}
        nextVariant={photos.length === 0 ? 'ghost' : 'brand'}
      />
    </div>
  );
}
