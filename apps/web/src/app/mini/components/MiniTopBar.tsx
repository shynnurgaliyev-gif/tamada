import { OctiMark } from '@/components/OctiLogo';
import type { Provider } from '../types';

export function MiniTopBar({
  provider,
  providers,
  onToggleSwitch,
}: {
  provider: Provider | null;
  providers: Provider[];
  onToggleSwitch: () => void;
}) {
  const activeProviders = providers.filter(p => !p.archived_at && !p.pending_delete_at);
  const hasMultiple = activeProviders.length > 1;
  const isActive    = provider?.provider_status === 'active';

  /* ── No profile yet ──────────────────────────────────── */
  if (!provider) {
    return (
      <div className="mini-topbar">
        <OctiMark size={28} />
        <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-.04em' }}>Octiqa</span>
        <a
          href="/dashboard/onboarding"
          className="mini-tap"
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            fontWeight: 700,
            color: '#7c3aed',
            background: 'rgba(124,58,237,.1)',
            padding: '6px 12px',
            borderRadius: 10,
            textDecoration: 'none',
          }}
        >
          + Создать профиль
        </a>
      </div>
    );
  }

  /* ── Active profile ──────────────────────────────────── */
  return (
    <button
      className="mini-topbar mini-tap"
      onClick={hasMultiple ? onToggleSwitch : undefined}
      style={{
        border: 'none',
        width: '100%',
        textAlign: 'left',
        cursor: hasMultiple ? 'pointer' : 'default',
      }}
    >
      {/* Avatar */}
      <div className="mini-avatar">
        {provider.display_name[0]?.toUpperCase()}
      </div>

      {/* Name + status */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 900,
          textTransform: 'uppercase',
          color: '#7c3aed',
          letterSpacing: '.04em',
          marginBottom: 2,
        }}>
          Активный профиль{hasMultiple ? ' · нажмите для смены' : ''}
        </div>
        <div style={{
          fontWeight: 800,
          fontSize: 16,
          letterSpacing: '-.02em',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
            {provider.display_name}
            {hasMultiple && (
              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--tg-theme-hint-color, #9ca3af)', fontWeight: 700 }}>
                {activeProviders.findIndex(p => p.id === provider.id) + 1}/{activeProviders.length}
              </span>
            )}
          </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
          <span
            className="mini-status-dot"
            style={{ background: isActive ? '#22c55e' : '#9ca3af' }}
          />
          <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            {isActive ? 'Активен · виден клиентам' : 'Скрыт · не виден клиентам'}
          </span>
        </div>
      </div>

      {/* Switcher chevron */}
      {hasMultiple && (
        <span style={{
          fontSize: 18,
          color: 'var(--tg-theme-hint-color, #9ca3af)',
          flexShrink: 0,
          lineHeight: 1,
        }}>
          ⌄
        </span>
      )}
    </button>
  );
}
