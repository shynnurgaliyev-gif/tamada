import type { Provider } from '../types';

export function MiniTopBar({
  provider,
  providers,
  ownerName,
  subStatus,
  subDaysLeft,
  onToggleSwitch,
  onCreateFirstProfile,
}: {
  provider: Provider | null;
  providers: Provider[];
  ownerName?: string | null;
  subStatus?: string | null;
  subDaysLeft?: number | null;
  onToggleSwitch: () => void;
  onCreateFirstProfile?: () => void;
}) {
  const subBadge = renderSubBadge(subStatus, subDaysLeft);
  const activeProviders = providers.filter(p => !p.archived_at && !p.pending_delete_at);
  const hasMultiple = activeProviders.length > 1;
  const isActive    = provider?.provider_status === 'active';
  const isVisible   = isActive && provider?.publication_status === 'visible';

  /* ── No profile yet ──────────────────────────────────── */
  if (!provider) {
    return (
      <div className="mini-topbar" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
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
        {ownerName && (
          <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)', fontWeight: 500 }}>
            {ownerName}
          </span>
        )}
      </div>
    );
  }

  /* ── Active profile ────────────────────────────────────── */
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
        alignItems: 'center',
      }}
    >
      {/* Status dot */}
      <span
        className="mini-status-dot"
        style={{ background: isActive ? '#22c55e' : '#9ca3af', flexShrink: 0, alignSelf: ownerName ? 'flex-start' : undefined, marginTop: ownerName ? 4 : undefined }}
      />

      {/* Owner name + profile name · status */}
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        {ownerName && (
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--tg-theme-hint-color, #6b7280)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {ownerName}
          </span>
        )}
        <span style={{
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
      </span>

      {subBadge}
      {/* Switcher chevron */}
      {hasMultiple && (
        <span style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #9ca3af)', flexShrink: 0 }}>⌄</span>
      )}
    </button>
  );
}

function renderSubBadge(status?: string | null, daysLeft?: number | null) {
  if (!status) return null;
  const d = Math.max(0, daysLeft ?? 0);
  const base = {
    fontSize: 10,
    fontWeight: 800,
    padding: '3px 7px',
    borderRadius: 6,
    flexShrink: 0,
    letterSpacing: '.02em',
    whiteSpace: 'nowrap' as const,
  };
  if (status === 'expired' || status === 'blocked' || status === 'cancelled') {
    return <span style={{ ...base, background: 'rgba(220,38,38,.12)', color: '#b91c1c' }}>Подписка истекла</span>;
  }
  if (status === 'expiring') {
    return <span style={{ ...base, background: 'rgba(234,88,12,.12)', color: '#c2410c' }}>Истекает: {d} дн</span>;
  }
  if (status === 'trial') {
    const urgent = d <= 7;
    return (
      <span style={{
        ...base,
        background: urgent ? 'rgba(234,88,12,.12)' : 'rgba(107,114,128,.12)',
        color: urgent ? '#c2410c' : '#6b7280',
      }}>
        Trial: {d} дн
      </span>
    );
  }
  return null;
}
