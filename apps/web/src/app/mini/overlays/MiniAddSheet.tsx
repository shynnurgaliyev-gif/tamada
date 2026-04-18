import type { MiniPermissions } from '../types';

export function MiniAddSheet({
  hasProfile,
  permissions,
  onClose,
  onNewCalendarEntry,
  onCreateFirstProfile,
}: {
  hasProfile:            boolean;
  permissions:           MiniPermissions;
  onClose:               () => void;
  onNewCalendarEntry:    () => void;
  onCreateFirstProfile?: () => void;
}) {
  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Что добавить?</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Calendar entry */}
            {permissions.can_manage_calendar && (
            <button
              className="mini-row mini-tap"
              onClick={onNewCalendarEntry}
              style={{ border: '1px solid rgba(0,0,0,.07)', cursor: 'pointer', background: 'var(--tg-theme-secondary-bg-color, #fff)', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
            >
              <div className="mini-row-icon" style={{ background: '#f0fdf4', color: '#059669' }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Запись в календарь</div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                  Занятость, бронь или свободный день
                </div>
              </div>
              <span className="mini-row-chevron">›</span>
            </button>
            )}

            {/* New profile — only when none exists */}
            {!hasProfile && permissions.can_create_profile && (
              <button
                className="mini-row mini-tap"
                onClick={() => { onCreateFirstProfile?.(); onClose(); }}
                style={{ border: '1px solid rgba(0,0,0,.07)', cursor: 'pointer', background: 'var(--tg-theme-secondary-bg-color, #fff)', fontFamily: 'inherit', textAlign: 'left', width: '100%' }}
              >
                <div className="mini-row-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Новый профиль</div>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                    Создать публичный профиль специалиста
                  </div>
                </div>
                <span className="mini-row-chevron">›</span>
              </button>
            )}
          </div>

          {/* Cancel */}
          <button
            onClick={onClose}
            className="mini-tap"
            style={{
              marginTop: 16,
              width: '100%',
              padding: '13px',
              border: 'none',
              background: 'rgba(0,0,0,.06)',
              borderRadius: 13,
              fontFamily: 'inherit',
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--tg-theme-text-color, #0a0a0f)',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
