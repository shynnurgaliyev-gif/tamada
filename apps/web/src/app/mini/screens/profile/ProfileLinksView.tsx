/* ── ProfileLinksView ──────────────────────────────────────────────────────────
   Add / delete provider links (social, messengers, maps).
────────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { ProviderLink, LinkType } from '../../types';

const LINK_META: { type: LinkType; icon: string; label: string; placeholder: string }[] = [
  { type: 'instagram', icon: '📸', label: 'Instagram',  placeholder: 'https://instagram.com/…' },
  { type: 'whatsapp',  icon: '💬', label: 'WhatsApp',   placeholder: 'https://wa.me/7700…' },
  { type: 'telegram',  icon: '✈️', label: 'Telegram',   placeholder: 'https://t.me/username' },
  { type: 'tiktok',    icon: '🎵', label: 'TikTok',     placeholder: 'https://tiktok.com/@…' },
  { type: 'youtube',   icon: '▶️', label: 'YouTube',    placeholder: 'https://youtube.com/…' },
  { type: 'website',   icon: '🌐', label: 'Сайт',       placeholder: 'https://mysite.kz' },
  { type: 'two_gis',   icon: '📍', label: '2GIS',       placeholder: 'https://2gis.kz/…' },
  { type: 'map',       icon: '🗺️', label: 'Карта',      placeholder: 'https://maps.google.com/…' },
  { type: 'other',     icon: '🔗', label: 'Другое',     placeholder: 'https://…' },
];

export function ProfileLinksView({
  links,
  saving,
  onAdd,
  onDelete,
}: {
  links:    ProviderLink[];
  saving:   boolean;
  onAdd:    (link_type: LinkType, url: string, label?: string) => Promise<boolean>;
  onDelete: (linkId: string) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<LinkType | null>(null);
  const [url,      setUrl]      = useState('');
  const [urlErr,   setUrlErr]   = useState(false);

  const meta = LINK_META.find(m => m.type === selected);

  async function handleAdd() {
    if (!selected || !url.trim()) { setUrlErr(true); return; }
    setUrlErr(false);
    const ok = await onAdd(selected, url.trim());
    if (ok) { setUrl(''); setSelected(null); }
  }

  return (
    <div>
      {/* Existing links */}
      {links.length > 0 && (
        <>
          <div className="mini-section-label">Добавленные ссылки</div>
          {links.map(link => {
            const m = LINK_META.find(x => x.type === link.link_type);
            return (
              <div key={link.id} className="mini-link-row">
                <span className="mini-link-row-icon">{m?.icon ?? '🔗'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 1 }}>{m?.label ?? link.link_type}</div>
                  <div className="mini-link-row-url">{link.url}</div>
                </div>
                <button
                  className="mini-link-del mini-tap"
                  onClick={() => onDelete(link.id)}
                  disabled={saving}
                  aria-label="Удалить"
                >
                  🗑
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Add link */}
      <div className="mini-section-label" style={{ marginTop: links.length ? 16 : 0 }}>
        Добавить ссылку
      </div>

      <div className="mini-link-type-grid">
        {LINK_META.map(m => (
          <button
            key={m.type}
            className="mini-link-type-btn mini-tap"
            data-selected={selected === m.type}
            onClick={() => { setSelected(m.type); setUrl(''); setUrlErr(false); }}
          >
            <span className="mini-link-type-icon">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {selected && (
        <div style={{ marginBottom: 12 }}>
          <div className="mini-field">
            <label>{meta?.label ?? 'URL'}</label>
            <input
              className="mini-input"
              data-error={urlErr}
              value={url}
              placeholder={meta?.placeholder}
              onChange={e => { setUrl(e.target.value); setUrlErr(false); }}
              autoFocus
            />
            {urlErr && <div className="mini-error-msg">Введите URL</div>}
          </div>
          <button
            className="mini-btn mini-btn-primary mini-tap"
            onClick={handleAdd}
            disabled={saving}
            style={{ opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Добавление…' : 'Добавить'}
          </button>
        </div>
      )}
    </div>
  );
}
