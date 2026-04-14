import { EmptyState } from '../components/EmptyState';
import type { Provider } from '../types';

export function MiniCalendarScreen({ provider }: { provider: Provider | null }) {
  if (!provider) {
    return (
      <EmptyState
        icon="📅"
        title="Нет профиля"
        sub="Создайте профиль чтобы управлять расписанием"
        href="/dashboard/onboarding"
        cta="Создать профиль"
      />
    );
  }

  return (
    <div>
      {/* Mini month calendar */}
      <div className="mini-card">
        <MonthHeader />
        <MonthGrid />

        {/* Legend */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 14px',
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid rgba(0,0,0,.06)',
        }}>
          {LEGEND.map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 8, height: 8,
                borderRadius: '50%',
                background: color,
                display: 'block',
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 11, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <a href="/dashboard/calendar/new" className="mini-btn mini-btn-primary mini-tap" style={{ marginBottom: 10 }}>
        ＋ Добавить запись
      </a>
      <a href="/dashboard/calendar" className="mini-btn mini-btn-ghost mini-tap">
        Открыть полный календарь →
      </a>

      <div style={{ height: 16 }} />
    </div>
  );
}

/* ── Private sub-components ─────────────────────────── */

const LEGEND = [
  { color: '#22c55e', label: 'Свободен'    },
  { color: '#ef4444', label: 'Занят'       },
  { color: '#f59e0b', label: 'Под вопросом' },
  { color: '#f97316', label: 'Частично'    },
];

function MonthHeader() {
  const now   = new Date();
  const month = now.toLocaleDateString('ru-RU', { month: 'long' });
  const year  = now.getFullYear();
  return (
    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, textAlign: 'center' }}>
      {month[0]!.toUpperCase() + month.slice(1)} {year}
    </div>
  );
}

function MonthGrid() {
  const now    = new Date();
  const year   = now.getFullYear();
  const month  = now.getMonth();
  const today  = now.getDate();
  const first  = new Date(year, month, 1).getDay();
  const offset = (first + 6) % 7; // Mon-first
  const total  = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="mini-cal-grid" style={{ marginBottom: 4 }}>
        {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => (
          <div key={d} style={{
            textAlign: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--tg-theme-hint-color, #9ca3af)',
            paddingBottom: 4,
          }}>
            {d}
          </div>
        ))}
      </div>
      <div className="mini-cal-grid">
        {cells.map((d, i) => {
          const isToday = d === today;
          const isPast  = d !== null && d < today;
          return (
            <div
              key={i}
              className="mini-cal-day"
              style={{
                background: isToday ? '#7c3aed' : 'transparent',
                color: isToday ? '#fff'
                      : isPast ? 'var(--tg-theme-hint-color, #c4c9d4)'
                      : 'inherit',
                fontWeight: isToday ? 800 : 400,
                fontSize: 12,
              }}
            >
              {d ?? ''}
            </div>
          );
        })}
      </div>
    </>
  );
}
