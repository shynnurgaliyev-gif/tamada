/* ── CalendarMonthView ─────────────────────────────────────────────────────────
   Month grid + inline day panel (expands below calendar on date click).
   No separate day-view navigation — entries are shown inline.
────────────────────────────────────────────────────────────────────────────── */

import type { DayInfo, CalendarEntryWithClient } from '../../types';

const DOW = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];
const MONTH_SHORT = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
const DAY_NAMES   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];

const STATUS_COLOR: Record<string, string> = {
  busy:     '#ef4444',
  partial:  '#f97316',
  tentative:'#eab308',
  free:     'transparent',
  past:     'rgba(0,0,0,.08)',
  vacation: '#06b6d4',
};
const STATUS_TEXT_COLOR: Record<string, string> = {
  busy:     '#ef4444',
  partial:  '#f97316',
  tentative:'#eab308',
  past:     '#d1d5db',
};
const ENTRY_COLORS: Record<string, { border: string; bg: string; label: string }> = {
  busy:      { border: '#ef4444', bg: 'rgba(239,68,68,.08)',   label: 'Занят'          },
  tentative: { border: '#eab308', bg: 'rgba(234,179,8,.08)',   label: 'Под вопросом'   },
  blocked:   { border: '#9ca3af', bg: 'rgba(107,114,128,.08)', label: 'Заблокировано'  },
  free:      { border: '#22c55e', bg: 'rgba(34,197,94,.08)',   label: 'Свободен'       },
  vacation:  { border: '#06b6d4', bg: 'rgba(6,182,212,.08)',   label: '🏖️ Отпуск'      },
};

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function buildGrid(year: number, month: number): (string | null)[][] {
  const firstDay    = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function formatDayTitle(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function isAllDayEntry(e: CalendarEntryWithClient): boolean {
  const s = new Date(e.starts_at), en = new Date(e.ends_at);
  return s.getHours() === 0 && s.getMinutes() === 0 &&
    ((en.getHours() === 23 && en.getMinutes() >= 55) ||
     (en.getHours() === 0  && en.getMinutes() === 0 && en.getDate() > s.getDate()));
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/* ── Entry row (compact inline card) ─────────────────────────────────────── */

function EntryRow({ entry, onEdit }: { entry: CalendarEntryWithClient; onEdit: () => void }) {
  const c       = ENTRY_COLORS[entry.status] ?? ENTRY_COLORS['busy']!;
  const allDay  = isAllDayEntry(entry);
  const timeStr = allDay ? 'Весь день' : `${fmtTime(entry.starts_at)} – ${fmtTime(entry.ends_at)}`;
  const label   = entry.title || c.label;

  return (
    <button
      className="mini-tap"
      onClick={onEdit}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        width: '100%', padding: '10px 12px', marginBottom: 6,
        background: c.bg,
        border: `1px solid ${c.border}30`,
        borderLeft: `3px solid ${c.border}`,
        borderRadius: 10,
        fontFamily: 'inherit', textAlign: 'left', cursor: 'pointer',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tg-theme-text-color, #0a0a0f)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: c.border, marginTop: 2 }}>{timeStr}</div>
      </div>
      <span style={{ fontSize: 15, color: 'var(--tg-theme-hint-color, #9ca3af)', flexShrink: 0 }}>›</span>
    </button>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function CalendarMonthView({
  year, month, days, loading,
  selectedDate, onSelectDate, onPrev, onNext,
  dayEntries, dayLoading, onEditEntry, onAddEntry,
}: {
  year:         number;
  month:        number;
  days:         DayInfo[];
  loading:      boolean;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onPrev:       () => void;
  onNext:       () => void;
  dayEntries:   CalendarEntryWithClient[];
  dayLoading:   boolean;
  onEditEntry:  (entry: CalendarEntryWithClient) => void;
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
                  <span style={{ opacity: !isToday && !isSelect ? 0.6 : 1 }}>{dayNum}</span>
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
          ['vacation', '#06b6d4', 'Отпуск'],
        ] as const).map(([, color, label]) => (
          <div key={label} className="mcal-legend-item">
            <span className="mcal-legend-dot" style={{ background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── Inline day panel ────────────────────────────────── */}
      {selectedDate && (
        <div style={{ marginTop: 16 }}>
          {/* Panel header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--tg-theme-hint-color, #6b7280)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              {formatDayTitle(selectedDate)}
            </div>
            <button
              className="mini-tap"
              onClick={onAddEntry}
              style={{
                border: '1.5px solid rgba(124,58,237,.35)',
                background: 'rgba(124,58,237,.07)',
                color: '#7c3aed',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 12, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
              }}
            >
              + Добавить
            </button>
          </div>

          {/* Entries */}
          {dayLoading ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: 20, height: 20, border: '2px solid rgba(124,58,237,.25)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'mini-spin .8s linear infinite', display: 'inline-block' }} />
            </div>
          ) : dayEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--tg-theme-hint-color, #9ca3af)', fontSize: 13 }}>
              Записей нет
            </div>
          ) : (
            dayEntries.map(entry => (
              <EntryRow key={entry.id} entry={entry} onEdit={() => onEditEntry(entry)} />
            ))
          )}
        </div>
      )}

      <div style={{ height: 16 }} />
    </div>
  );
}
