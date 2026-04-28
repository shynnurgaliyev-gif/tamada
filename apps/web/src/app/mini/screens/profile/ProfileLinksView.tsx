/* ── ProfileLinksView ──────────────────────────────────────────────────────────
   Add / delete provider links (social, messengers, maps).
────────────────────────────────────────────────────────────────────────────── */

import { useState } from 'react';
import type { ProviderLink, LinkType } from '../../types';
import { normalizeLinkUrl, cleanPastedUrl } from '@/lib/linkUrl';

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
  onAdd:    (link_type: LinkType, url: string, label?: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (linkId: string) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState<LinkType | null>(null);
  const [url,      setUrl]      = useState('');
  const [urlErr,   setUrlErr]   = useState<string | null>(null);

  const meta = LINK_META.find(m => m.type === selected);

  async function handleAdd() {
    if (!selected) return;
    const check = normalizeLinkUrl(url);
    if (!check.ok) { setUrlErr(check.error); return; }
    setUrlErr(null);
    const res = await onAdd(selected, check.url);
    if (res.ok) { setUrl(''); setSelected(null); }
    else setUrlErr(res.error ?? 'Не удалось сохранить ссылку');
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
            onClick={() => { setSelected(m.type); setUrl(''); setUrlErr(null); }}
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
              data-error={!!urlErr}
              value={url}
              placeholder={meta?.placeholder}
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={e => { setUrl(e.target.value); setUrlErr(null); }}
              onPaste={e => {
                const pasted = e.clipboardData.getData('text');
                if (!pasted) return;
                const cleaned = cleanPastedUrl(pasted);
                if (cleaned !== pasted) {
                  e.preventDefault();
                  setUrl(cleaned);
                  setUrlErr(null);
                }
              }}
              autoFocus
            />
            {urlErr && <div className="mini-error-msg">{urlErr}</div>}
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
