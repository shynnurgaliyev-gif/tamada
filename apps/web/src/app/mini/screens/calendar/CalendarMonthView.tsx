/* ── CalendarMonthView ─────────────────────────────────────────────────────────
   Month grid with day-status color coding.
   Status colours: busy=#ef4444 partial=#f97316 tentative=#eab308 free=none past=gray
────────────────────────────────────────────────────────────────────────────── */

import type { DayInfo } from '../../types';

const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const STATUS_COLOR: Record<string, string> = {
  busy:     '#ef4444',
  partial:  '#f97316',
  tentative:'#eab308',
  free:     'transparent',
  past:     'rgba(0,0,0,.08)',
};
const STATUS_TEXT_COLOR: Record<string, string> = {
  busy:     '#ef4444',
  partial:  '#f97316',
  tentative:'#eab308',
  past:     '#d1d5db',
};

function buildGrid(year: number, month: number): (string | null)[][] {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  // Convert Sun=0 to Mon=0 offset
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(ds);
  }
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function CalendarMonthView({
  year,
  month,
  days,
  loading,
  selectedDate,
  onSelectDate,
  onPrev,
  onNext,
  onAddEntry,
}: {
  year:         number;
  month:        number;
  days:         DayInfo[];
  loading:      boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrev:       () => void;
  onNext:       () => void;
  onAddEntry:   () => void;
}) {
  const today  = new Date().toISOString().slice(0, 10);
  const grid   = buildGrid(year, month);
  const byDate = Object.fromEntries(days.map(d => [d.date, d]));

  return (
    <div>
      {/* Navigation */}
      <div className="mcal-nav">
        <button className="mcal-nav-btn mini-tap" onClick={onPrev}>‹</button>
        <div className="mcal-month-label">{MONTH_NAMES[month - 1]} {year}</div>
        <button className="mcal-nav-btn mini-tap" onClick={onNext}>›</button>
      </div>

      {/* Day-of-week header */}
      <div className="mcal-dow-row">
        {DOW.map(d => <div key={d} className="mcal-dow">{d}</div>)}
      </div>

      {/* Weeks */}
      {loading ? (
        <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 24, height: 24, border: '3px solid rgba(124,58,237,.25)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'mini-spin .8s linear infinite' }} />
        </div>
      ) : (
        grid.map((week, wi) => (
          <div key={wi} className="mcal-week">
            {week.map((dateStr, di) => {
              if (!dateStr) return <div key={di} className="mcal-cell" data-empty="true" />;
              const info     = byDate[dateStr];
              const status   = info?.status ?? 'free';
              const isToday  = dateStr === today;
              const isSelect = dateStr === selectedDate;
              const dotColor = STATUS_COLOR[status];
              const textDim  = status === 'past' || (!isToday && !isSelect);
              const dayNum   = parseInt(dateStr.slice(8), 10);
              return (
                <div
                  key={di}
                  className="mcal-cell mini-tap"
                  data-today={isToday}
                  data-selected={isSelect}
                  onClick={() => onSelectDate(dateStr)}
                  style={{ color: isSelect ? '#fff' : STATUS_TEXT_COLOR[status] ?? undefined }}
                >
                  <span style={{ opacity: textDim && !isToday && !isSelect ? 0.6 : 1 }}>{dayNum}</span>
                  {info && info.count > 0 && !isSelect && (
                    <span className="mcal-dot" style={{ background: dotColor === 'transparent' ? 'rgba(0,0,0,.2)' : dotColor }} />
                  )}
                </div>
              );
            })}
          </div>
        ))
      )}

      {/* Legend */}
      <div className="mcal-legend">
        {([
          ['busy',     '#ef4444', 'Занят'],
          ['partial',  '#f97316', 'Частично'],
          ['tentative','#eab308', 'Под вопросом'],
          ['free',     '#22c55e', 'Свободен'],
        ] as const).map(([, color, label]) => (
          <div key={label} className="mcal-legend-item">
            <span className="mcal-legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* Quick add */}
      <div style={{ marginTop: 16 }}>
        <button className="mini-btn mini-btn-primary mini-tap" onClick={onAddEntry}>
          + Добавить запись
        </button>
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}
