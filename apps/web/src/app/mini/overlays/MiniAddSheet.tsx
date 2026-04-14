export function MiniAddSheet({
  hasProfile,
  onClose,
}: {
  hasProfile: boolean;
  onClose: () => void;
}) {
  return (
    <div className="mini-overlay" onClick={onClose}>
      <div className="mini-sheet mini-slideup" onClick={e => e.stopPropagation()}>
        <div className="mini-sheet-handle" />
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Что добавить?</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Calendar entry */}
            <a href="/dashboard/calendar/new" className="mini-row mini-tap">
              <div className="mini-row-icon" style={{ background: '#f0fdf4', color: '#059669' }}>📅</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>Запись в календарь</div>
                <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                  Занятость, бронь или свободный день
                </div>
              </div>
              <span className="mini-row-chevron">›</span>
            </a>

            {/* New profile — only when none exists */}
            {!hasProfile && (
              <a href="/dashboard/onboarding" className="mini-row mini-tap">
                <div className="mini-row-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Новый профиль</div>
                  <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                    Создать публичный профиль специалиста
                  </div>
                </div>
                <span className="mini-row-chevron">›</span>
              </a>
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
