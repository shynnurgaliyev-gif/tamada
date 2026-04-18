/* ── ProfileView ───────────────────────────────────────────────────────────────
   Clean profile detail: compact header + action rows.
   No cover photo. No team section (team is in Ещё → Команда).
────────────────────────────────────────────────────────────────────────────── */

import type { Provider, ProviderPhoto, ProviderLink } from '../../types';

const LINK_COUNT_LABEL = (n: number) => n === 0 ? 'Не добавлено' : `${n} ссылок`;

export function ProfileView({
  provider,
  photos,
  links,
  loading,
  canEditProfile = true,
  onEdit,
  onPhotos,
  onLinks,
}: {
  provider:        Provider;
  photos:          ProviderPhoto[];
  links:           ProviderLink[];
  loading:         boolean;
  canEditProfile?: boolean;
  onEdit:          () => void;
  onPhotos:        () => void;
  onLinks:         () => void;
}) {
  const isActive  = provider.provider_status === 'active';
  const isVisible = provider.publication_status === 'visible';
  const category  = [provider.primary_category, provider.primary_subcategory].filter(Boolean).join(' · ');

  return (
    <div>
      {/* ── Compact profile header ─────────────────────────── */}
      <div className="mini-card" style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <div className="mini-avatar">
            {provider.display_name[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>{provider.display_name}</div>
            {category && (
              <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color,#6b7280)', marginBottom: 4 }}>{category}</div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span className="mini-status-dot" style={{ background: isActive ? '#22c55e' : '#9ca3af' }} />
              <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color,#6b7280)' }}>
                {isActive ? 'Активен' : 'Скрыт'}
                {provider.city ? ` · ${provider.city}` : ''}
              </span>
              {isVisible && (
                <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color,#6b7280)' }}>· Виден клиентам</span>
              )}
            </div>
          </div>
        </div>

        {provider.bio && (
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color,#6b7280)', lineHeight: 1.5, marginBottom: 10, borderTop: '1px solid rgba(0,0,0,.06)', paddingTop: 10 }}>
            {provider.bio}
          </div>
        )}

        <a
          href={`/p/${provider.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mini-tap"
          style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}
        >
          /p/{provider.slug} ↗
        </a>
      </div>

      {/* ── Action rows ────────────────────────────────────── */}
      {canEditProfile && (
        <div className="mini-card" style={{ padding: 0, overflow: 'hidden' }}>
          <ActionRow
            icon="✏️"
            label="Редактировать"
            sub="Имя, описание, категория, статус"
            onClick={onEdit}
          />
          <ActionRow
            icon="📸"
            label="Фотографии"
            sub={loading ? 'Загрузка…' : `${photos.length} из 5`}
            onClick={onPhotos}
            border
          />
          <ActionRow
            icon="🔗"
            label="Ссылки и контакты"
            sub={loading ? 'Загрузка…' : LINK_COUNT_LABEL(links.length)}
            onClick={onLinks}
            border
          />
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}

function ActionRow({ icon, label, sub, onClick, border }: {
  icon:    string;
  label:   string;
  sub:     string;
  onClick: () => void;
  border?: boolean;
}) {
  return (
    <button
      className="mini-tap"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '14px 16px',
        border: 'none',
        borderTop: border ? '1px solid rgba(0,0,0,.07)' : 'none',
        background: 'transparent',
        fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color,#6b7280)', marginTop: 1 }}>{sub}</div>
      </div>
      <span style={{ fontSize: 16, color: 'rgba(0,0,0,.18)', flexShrink: 0 }}>›</span>
    </button>
  );
}
