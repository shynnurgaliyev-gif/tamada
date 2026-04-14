import { NavRow }    from '../components/NavRow';
import { EmptyState } from '../components/EmptyState';
import type { Provider } from '../types';

export function MiniProfilesScreen({
  providers,
  activeIdx,
}: {
  providers: Provider[];
  activeIdx: number;
}) {
  const provider = providers[activeIdx] ?? null;

  if (!provider) {
    return (
      <EmptyState
        icon="👤"
        title="Профиль не создан"
        sub="Создайте профиль чтобы клиенты нашли вас"
        href="/dashboard/onboarding"
        cta="Создать профиль"
      />
    );
  }

  const isActive = provider.provider_status === 'active';

  return (
    <div>
      {/* Profile card */}
      <div className="mini-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div className="mini-avatar">
            {provider.display_name[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>
              {provider.display_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                className="mini-status-dot"
                style={{ background: isActive ? '#22c55e' : '#9ca3af' }}
              />
              <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                {isActive ? 'Активен' : 'Скрыт'}
              </span>
              <span style={{ fontSize: 12, color: 'rgba(0,0,0,.2)' }}>·</span>
              <a
                href={`/p/${provider.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mini-tap"
                style={{ fontSize: 12, color: '#7c3aed', textDecoration: 'none', fontWeight: 600 }}
              >
                /p/{provider.slug}
              </a>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <a href="/dashboard/provider/edit" className="mini-btn mini-btn-primary mini-tap" style={{ fontSize: 13 }}>
            ✏️ Редактировать
          </a>
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
      </div>

      {/* Quick links */}
      <div className="mini-section-label">Управление профилем</div>
      <NavRow icon="📸" iconBg="#f0fdf4" iconColor="#059669" label="Фотографии"    sub="Загрузить и упорядочить"      href="/dashboard/provider/edit" />
      <NavRow icon="💰" iconBg="#fffbeb" iconColor="#d97706" label="Цены и услуги" sub="Обновить прайс-лист"           href="/dashboard/provider/edit" />
      <NavRow icon="📞" iconBg="#f0f9ff" iconColor="#0ea5e9" label="Контакты"      sub="WhatsApp, Telegram, Instagram"  href="/dashboard/provider/edit" />

      <div style={{ height: 16 }} />
    </div>
  );
}
