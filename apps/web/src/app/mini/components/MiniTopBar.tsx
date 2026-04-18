import type { Provider } from '../types';

export function MiniTopBar({
  provider,
  providers,
  onToggleSwitch,
  onCreateFirstProfile,
}: {
  provider: Provider | null;
  providers: Provider[];
  onToggleSwitch: () => void;
  onCreateFirstProfile?: () => void;
}) {
  const activeProviders = providers.filter(p => !p.archived_at && !p.pending_delete_at);
  const hasMultiple = activeProviders.length > 1;
  const isActive    = provider?.provider_status === 'active';
  const isVisible   = isActive && provider?.publication_status === 'visible';

  /* ── No profile yet ──────────────────────────────────── */
  if (!provider) {
    return (
      <div className="mini-topbar">
        <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-.03em', color: 'var(--tg-theme-text-color, #0a0a0f)' }}>Octiqa</span>
        <button
          onClick={onCreateFirstProfile}
          className="mini-tap"
          style={{
            marginLeft: 'auto',
            fontSize: 13,
            fontWeight: 700,
            color: '#7c3aed',
            background: 'rgba(124,58,237,.1)',
            padding: '5px 12px',
            borderRadius: 10,
            border: 'none',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          + Создать профиль
        </button>
      </div>
    );
  }

  /* ── Active profile — compact single line ────────────── */
  const statusText = isActive
    ? (isVisible ? 'Активен · виден клиентам' : 'Активен · скрыт')
    : 'Скрыт · не виден';

  return (
    <button
      className="mini-topbar mini-tap"
      onClick={hasMultiple ? onToggleSwitch : undefined}
      style={{
        border: 'none',
        width: '100%',
        textAlign: 'left',
        cursor: hasMultiple ? 'pointer' : 'default',
        gap: 7,
      }}
    >
      {/* Status dot */}
      <span
        className="mini-status-dot"
        style={{ background: isActive ? '#22c55e' : '#9ca3af', flexShrink: 0 }}
      />

      {/* Name · status */}
      <span style={{
        flex: 1,
        minWidth: 0,
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--tg-theme-hint-color, #6b7280)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        <span style={{ color: 'var(--tg-theme-text-color, #0a0a0f)', fontWeight: 600 }}>
          {provider.display_name}
        </span>
        {hasMultiple && (
          <span style={{ opacity: 0.5 }}>
            {' '}({activeProviders.findIndex(p => p.id === provider.id) + 1}/{activeProviders.length})
          </span>
        )}
        <span style={{ opacity: 0.7 }}>{' · '}{statusText}</span>
      </span>

      {/* Switcher chevron */}
      {hasMultiple && (
        <span style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #9ca3af)', flexShrink: 0 }}>⌄</span>
      )}
    </button>
  );
}
