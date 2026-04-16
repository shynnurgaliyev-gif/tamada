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
  const activeProviders = providers
    .map((provider, idx) => ({ provider, idx }))
    .filter(({ provider }) => !provider.archived_at && !provider.pending_delete_at);

  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Сменить активный профиль</div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 14 }}>
            Календарь, аналитика и быстрые действия будут работать с выбранным профилем.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeProviders.map(({ provider: p, idx }) => {
              const isSelected = idx === activeIdx;
              const isVisible = p.provider_status === 'active' && p.publication_status === 'visible';
              const meta = [p.primary_category, p.city].filter(Boolean).join(' · ') || (isVisible ? 'Виден клиентам' : 'Скрыт');

              return (
                <button
                  key={p.id}
                  onClick={() => onSelect(idx)}
                  className="mini-tap"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    background: isSelected ? 'rgba(124,58,237,.08)' : 'rgba(0,0,0,.04)',
                    border: isSelected ? '1.5px solid rgba(124,58,237,.3)' : '1.5px solid transparent',
                    borderRadius: 13,
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                  }}
                >
                  <div className="mini-avatar-sm">{p.display_name[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.display_name}</div>
                      {isSelected && (
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#7c3aed', background: 'rgba(124,58,237,.1)', padding: '2px 5px', borderRadius: 6, flexShrink: 0 }}>
                          Активный
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
                      <span className="mini-status-dot" style={{ background: isVisible ? '#22c55e' : '#9ca3af' }} />
                      <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>{meta}</span>
                    </div>
                  </div>
                  {isSelected && <span style={{ fontSize: 18, color: '#7c3aed' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
