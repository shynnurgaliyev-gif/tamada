import type { Provider } from '../types';

export function MiniSwitchSheet({
  providers,
  activeIdx,
  onSelect,
  onClose,
}: {
  providers: Provider[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>Сменить профиль</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {providers.map((p, i) => {
              const isSelected = i === activeIdx;
              const isActive   = p.provider_status === 'active';
              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(i)}
                  className="mini-tap"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(124,58,237,.08)' : 'rgba(0,0,0,.04)',
                    border: isSelected
                      ? '1.5px solid rgba(124,58,237,.3)'
                      : '1.5px solid transparent',
                    borderRadius: 13,
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div className="mini-avatar-sm">{p.display_name[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{p.display_name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span
                        className="mini-status-dot"
                        style={{ background: isActive ? '#22c55e' : '#9ca3af' }}
                      />
                      <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                        {isActive ? 'Активен' : 'Скрыт'}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span style={{ fontSize: 18, color: '#7c3aed' }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
