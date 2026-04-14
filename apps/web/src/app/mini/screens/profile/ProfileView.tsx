/* ── ProfileView ───────────────────────────────────────────────────────────────
   Read-only overview of a provider: cover photo, name, bio, stats, photos,
   links. Entry point for navigation into edit / photos / links sub-views.
────────────────────────────────────────────────────────────────────────────── */

import type { Provider, ProviderPhoto, ProviderLink } from '../../types';

const LINK_ICONS: Record<string, string> = {
  instagram: '📸', whatsapp: '💬', telegram: '✈️', tiktok: '🎵',
  youtube: '▶️', website: '🌐', two_gis: '📍', map: '🗺️', other: '🔗',
};
const LINK_LABELS: Record<string, string> = {
  instagram: 'Instagram', whatsapp: 'WhatsApp', telegram: 'Telegram',
  tiktok: 'TikTok', youtube: 'YouTube', website: 'Сайт',
  two_gis: '2GIS', map: 'Карта', other: 'Другое',
};

export function ProfileView({
  provider,
  photos,
  links,
  loading,
  onEdit,
  onPhotos,
  onLinks,
}: {
  provider: Provider;
  photos:   ProviderPhoto[];
  links:    ProviderLink[];
  loading:  boolean;
  onEdit:   () => void;
  onPhotos: () => void;
  onLinks:  () => void;
}) {
  const cover  = photos.find(p => p.is_cover) ?? photos[0] ?? null;
  const isActive = provider.provider_status === 'active';

  return (
    <div>
      {/* Cover / avatar */}
      <div className="mini-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 12 }}>
        {cover ? (
          <img
            src={cover.url}
            alt=""
            style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              height: 100,
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 40, color: '#fff',
            }}
          >
            {provider.display_name[0]?.toUpperCase()}
          </div>
        )}

        <div style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>
                {provider.display_name}
              </div>
              {provider.bio && (
                <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.5 }}>
                  {provider.bio}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              className="mini-status-dot"
              style={{ background: isActive ? '#22c55e' : '#9ca3af' }}
            />
            <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
              {isActive ? 'Активен' : 'Скрыт'}
            </span>
            {provider.city && (
              <>
                <span style={{ fontSize: 12, color: 'rgba(0,0,0,.2)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                  📍 {provider.city}
                </span>
              </>
            )}
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,.2)' }}>·</span>
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
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        <button className="mini-btn mini-btn-primary mini-tap" onClick={onEdit} style={{ fontSize: 13 }}>
          ✏️ Редактировать
        </button>
        <a
          href={`/p/${provider.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mini-btn mini-btn-outline mini-tap"
          style={{ fontSize: 13 }}
        >
          👁 Просмотр
        </a>
      </div>

      {/* Photos section */}
      <div
        className="mini-card mini-tap"
        style={{ cursor: 'pointer' }}
        onClick={onPhotos}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: photos.length ? 10 : 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>📸 Фотографии</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
              {loading ? 'Загрузка…' : `${photos.length} из 5`}
            </div>
          </div>
          <span style={{ fontSize: 16, color: 'rgba(0,0,0,.2)' }}>›</span>
        </div>
        {photos.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {photos.slice(0, 4).map(p => (
              <img
                key={p.id}
                src={p.url}
                alt=""
                style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover' }}
              />
            ))}
            {photos.length > 4 && (
              <div style={{
                width: 52, height: 52, borderRadius: 8,
                background: 'rgba(0,0,0,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color, #6b7280)',
              }}>
                +{photos.length - 4}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Links section */}
      <div
        className="mini-card mini-tap"
        style={{ cursor: 'pointer' }}
        onClick={onLinks}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: links.length ? 10 : 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>🔗 Ссылки и контакты</div>
            <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
              {loading ? 'Загрузка…' : links.length ? `${links.length} ссылок` : 'Не добавлено'}
            </div>
          </div>
          <span style={{ fontSize: 16, color: 'rgba(0,0,0,.2)' }}>›</span>
        </div>
        {links.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {links.map(link => (
              <span
                key={link.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px',
                  background: 'rgba(0,0,0,.05)', borderRadius: 8,
                  fontSize: 12, fontWeight: 600,
                }}
              >
                {LINK_ICONS[link.link_type] ?? '🔗'}
                {LINK_LABELS[link.link_type] ?? link.link_type}
              </span>
            ))}
          </div>
        )}
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}
