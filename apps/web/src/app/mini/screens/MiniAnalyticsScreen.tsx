import type { AnalyticsSummary } from '../types';

const STATS = [
  { key: 'profile_views'   as const, icon: '👁',  label: 'Просмотры', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'contact_reveals' as const, icon: '📲',  label: 'Контакты',  color: '#059669', bg: '#f0fdf4' },
  { key: 'calendar_views'  as const, icon: '📅',  label: 'Календарь', color: '#d97706', bg: '#fffbeb' },
  { key: 'conversion_pct'  as const, icon: '🎯',  label: 'Конверсия', color: '#0284c7', bg: '#eff6ff' },
] as const;

export function MiniAnalyticsScreen({
  summary,
  loading,
  onRetry,
}: {
  summary: AnalyticsSummary | null;
  loading: boolean;
  onRetry: () => void;
}) {
  /* ── Loading skeleton ─────────────────────────────── */
  if (loading) {
    return (
      <div>
        <div className="mini-section-label">За 30 дней</div>
        <div className="mini-stats">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="mini-stat">
              <div className="mini-skeleton" style={{ height: 16, width: '40%', marginBottom: 8 }} />
              <div className="mini-skeleton" style={{ height: 32, width: '70%', marginBottom: 6 }} />
              <div className="mini-skeleton" style={{ height: 12, width: '90%' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Empty ─────────────────────────────────────────── */
  if (!summary) {
    return (
      <div style={{ textAlign: 'center', paddingTop: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Нет данных</div>
        <div style={{
          fontSize: 14,
          color: 'var(--tg-theme-hint-color, #6b7280)',
          marginBottom: 20,
        }}>
          Аналитика появится после первых просмотров профиля
        </div>
        <button
          onClick={onRetry}
          className="mini-tap"
          style={{
            padding: '11px 24px',
            background: 'rgba(124,58,237,.08)',
            border: 'none',
            borderRadius: 12,
            fontFamily: 'inherit',
            fontSize: 14,
            fontWeight: 600,
            color: '#7c3aed',
            cursor: 'pointer',
          }}
        >
          Обновить
        </button>
      </div>
    );
  }

  /* ── Stats ─────────────────────────────────────────── */
  return (
    <div>
      <div className="mini-section-label">За 30 дней</div>
      <div className="mini-stats">
        {STATS.map(s => {
          const raw   = summary[s.key];
          const value = s.key === 'conversion_pct' ? `${raw}%` : String(raw);
          return (
            <div key={s.label} className="mini-stat" style={{ background: s.bg, border: 'none' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{
                fontSize: 26,
                fontWeight: 900,
                color: s.color,
                letterSpacing: '-.03em',
                lineHeight: 1,
              }}>
                {value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 4 }}>
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      <a href="/dashboard/analytics" className="mini-btn mini-btn-ghost mini-tap" style={{ marginTop: 4 }}>
        Полная аналитика →
      </a>

      <div style={{ height: 16 }} />
    </div>
  );
}
