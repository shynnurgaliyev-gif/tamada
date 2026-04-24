/* ── MiniAnalyticsScreen ────────────────────────────────────────────────────
   Analytics dashboard: period selector → hero metric → grid → top-days chart.
────────────────────────────────────────────────────────────────────────────── */

import type { AnalyticsSummary } from '../types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const MONTH_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

const PERIODS = [
  { days: 7,  label: '7 дней'  },
  { days: 30, label: '30 дней' },
  { days: 90, label: '90 дней' },
] as const;

/* ── Sub-components ───────────────────────────────────────────────────────── */

function SkeletonRect({ w, h, mb }: { w: string; h: number; mb?: number }) {
  return (
    <div className="mini-skeleton" style={{ width: w, height: h, borderRadius: 8, marginBottom: mb ?? 0 }} />
  );
}

function SmallCard({
  icon, value, label, color, iconBg,
}: {
  icon: string; value: string; label: string; color: string; iconBg: string;
}) {
  return (
    <div style={{
      background: 'var(--tg-theme-secondary-bg-color, #fff)',
      border: '1px solid var(--mini-border)',
      borderRadius: 16,
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: '-.03em', lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 3, fontWeight: 600 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function MiniAnalyticsScreen({
  summary,
  loading,
  days,
  onSwitchPeriod,
}: {
  summary:        AnalyticsSummary | null;
  loading:        boolean;
  days:           number;
  onSwitchPeriod: (d: number) => void;
}) {
  /* ── Period selector (always visible) ─────────────────────────────────── */
  const periodRow = (
    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
      {PERIODS.map(p => {
        const active = days === p.days;
        return (
          <button
            key={p.days}
            className="mini-tap"
            onClick={() => onSwitchPeriod(p.days)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: 'none',
              background: active ? '#7c3aed' : 'rgba(124,58,237,.1)',
              color: active ? '#fff' : '#7c3aed',
              fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'background .15s, color .15s',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );

  /* ── Loading skeleton ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        {periodRow}
        {/* Hero skeleton */}
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          border: '1px solid var(--mini-border)',
          borderRadius: 18, padding: '20px', marginBottom: 10,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div className="mini-skeleton" style={{ width: 52, height: 52, borderRadius: 14, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonRect w="50%" h={34} mb={6} />
            <SkeletonRect w="70%" h={13} />
          </div>
        </div>
        {/* 2-col skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[0,1].map(i => (
            <div key={i} style={{ background: 'var(--tg-theme-secondary-bg-color,#fff)', border: '1px solid var(--mini-border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="mini-skeleton" style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <SkeletonRect w="55%" h={22} mb={5} />
                <SkeletonRect w="80%" h={11} />
              </div>
            </div>
          ))}
        </div>
        {/* Calendar row skeleton */}
        <div style={{ background: 'var(--tg-theme-secondary-bg-color,#fff)', border: '1px solid var(--mini-border)', borderRadius: 16, padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
          <div className="mini-skeleton" style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <SkeletonRect w="40%" h={22} mb={5} />
            <SkeletonRect w="65%" h={11} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Empty state ───────────────────────────────────────────────────────── */
  if (!summary) {
    return (
      <div>
        {periodRow}
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📊</div>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 8 }}>Нет данных</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.55 }}>
            Аналитика появится после первых просмотров профиля
          </div>
        </div>
      </div>
    );
  }

  /* ── Top days bar chart ────────────────────────────────────────────────── */
  const topDays = summary.top_days ?? [];
  const maxViews = Math.max(...topDays.map(d => d.profile_views), 1);

  /* ── Main render ───────────────────────────────────────────────────────── */
  return (
    <div>
      {periodRow}

      {/* Hero: profile views */}
      <div style={{
        background: 'var(--tg-theme-secondary-bg-color, #fff)',
        border: '1px solid rgba(124,58,237,.2)',
        borderRadius: 18,
        padding: '20px',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 16,
        backgroundImage: 'linear-gradient(135deg, rgba(124,58,237,.06) 0%, transparent 70%)',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'rgba(124,58,237,.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, flexShrink: 0,
        }}>
          👁
        </div>
        <div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#7c3aed', letterSpacing: '-.04em', lineHeight: 1 }}>
            {summary.profile_views}
          </div>
          <div style={{ fontSize: 13, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 4, fontWeight: 600 }}>
            просмотров профиля · за {days} дней
          </div>
        </div>
      </div>

      {/* 2-col: contacts + conversion */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <SmallCard
          icon="📲"
          value={String(summary.contact_reveals)}
          label="Контакты"
          color="#059669"
          iconBg="rgba(5,150,105,.1)"
        />
        <SmallCard
          icon="🎯"
          value={`${summary.conversion_pct}%`}
          label="Конверсия"
          color="#0284c7"
          iconBg="rgba(2,132,199,.1)"
        />
      </div>

      {/* Calendar views */}
      <SmallCard
        icon="📅"
        value={String(summary.calendar_views)}
        label="Открытий календаря"
        color="#d97706"
        iconBg="rgba(217,119,6,.1)"
      />

      {/* Top days */}
      {topDays.length > 0 && (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          border: '1px solid var(--mini-border)',
          borderRadius: 16,
          padding: '14px 16px',
          marginTop: 10,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '.06em', color: 'var(--tg-theme-hint-color, #6b7280)',
            marginBottom: 14,
          }}>
            Топ дней по просмотрам
          </div>

          {topDays.map((day, i) => {
            const barPct = Math.round((day.profile_views / maxViews) * 100);
            return (
              <div key={day.date} style={{ marginBottom: i < topDays.length - 1 ? 12 : 0 }}>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 5,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-text-color, #0a0a0f)' }}>
                    {fmtDate(day.date)}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', display: 'flex', gap: 10 }}>
                    <span>{day.profile_views} 👁</span>
                    <span>{day.contact_reveals} 📲</span>
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--mini-border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${barPct}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
                    borderRadius: 3,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
