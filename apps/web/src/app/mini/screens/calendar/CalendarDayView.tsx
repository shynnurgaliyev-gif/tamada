/* ── CalendarDayView ───────────────────────────────────────────────────────────
   Day timeline view. 56px per hour (0–23). Entry blocks are absolutely
   positioned inside the entries layer. All-day entries shown as banners above
   the timeline.
────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useRef } from 'react';
import type { CalendarEntryWithClient } from '../../types';

const HOUR_H = 56;   // px per hour
const HOURS  = Array.from({ length: 24 }, (_, i) => i);  // 0..23

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  busy:      { bg: 'rgba(239,68,68,.15)',   text: '#b91c1c', border: '#ef4444' },
  tentative: { bg: 'rgba(234,179,8,.15)',   text: '#92400e', border: '#eab308' },
  blocked:   { bg: 'rgba(107,114,128,.12)', text: '#374151', border: '#9ca3af' },
  free:      { bg: 'rgba(34,197,94,.12)',   text: '#065f46', border: '#22c55e' },
};

const DAY_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const MONTH_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function formatDayTitle(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

function toLocalMinutes(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** True if entry spans the full day (00:00 → 23:59 or next day 00:00) */
function isAllDay(entry: CalendarEntryWithClient): boolean {
  const s = new Date(entry.starts_at);
  const e = new Date(entry.ends_at);
  return (
    s.getHours() === 0 && s.getMinutes() === 0 &&
    (
      (e.getHours() === 23 && e.getMinutes() >= 55) ||
      (e.getHours() === 0  && e.getMinutes() === 0 && e.getDate() > s.getDate())
    )
  );
}

export function CalendarDayView({
  date,
  entries,
  loading,
  onEditEntry,
  onAddEntry,
}: {
  date:        string;
  entries:     CalendarEntryWithClient[];
  loading:     boolean;
  onEditEntry: (entry: CalendarEntryWithClient) => void;
  onAddEntry:  () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  /* Scroll to ~8:00 on mount */
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 8 * HOUR_H - 16;
    }
  }, [date]);

  const allDayEntries = entries.filter(isAllDay);
  const timedEntries  = entries.filter(e => !isAllDay(e));

  return (
    <div>
      {/* Header */}
      <div className="mcal-day-header">
        <div className="mcal-day-title">{formatDayTitle(date)}</div>
        <button className="mcal-day-add mini-tap" onClick={onAddEntry} aria-label="Добавить запись">+</button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--tg-theme-hint-color, #9ca3af)', fontSize: 13 }}>
          Загрузка…
        </div>
      )}

      {/* All-day entries */}
      {allDayEntries.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {allDayEntries.map(entry => {
            const c = STATUS_COLORS[entry.status] ?? STATUS_COLORS['busy']!;
            return (
              <div
                key={entry.id}
                className="mcal-allday-bar mini-tap"
                onClick={() => onEditEntry(entry)}
                style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}20` }}
              >
                🗓 Весь день — {entry.title ?? statusLabel(entry.status)}
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div
        ref={containerRef}
        style={{ position: 'relative', overflowY: 'auto', maxHeight: 'calc(100dvh - 280px)', overscrollBehavior: 'contain' }}
      >
        <div className="mcal-timeline" style={{ height: 24 * HOUR_H }}>
          {/* Hour rows */}
          {HOURS.map(h => (
            <div key={h} className="mcal-hour-row" style={{ top: h * HOUR_H, position: 'absolute', left: 0, right: 0 }}>
              <div className="mcal-hour-label">
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
              <div className="mcal-hour-line" />
            </div>
          ))}
          {/* Half-hour tick lines */}
          {HOURS.map(h => (
            <div
              key={`h${h}`}
              style={{
                position: 'absolute',
                top: h * HOUR_H + HOUR_H / 2,
                left: 44,
                right: 0,
                borderTop: '1px dashed rgba(0,0,0,.04)',
                pointerEvents: 'none',
              }}
            />
          ))}

          {/* Timed entry blocks */}
          <div className="mcal-entries-layer" style={{ position: 'absolute', left: 44, right: 0, top: 0, bottom: 0 }}>
            {timedEntries.map(entry => {
              const startMin = toLocalMinutes(entry.starts_at);
              const endMin   = toLocalMinutes(entry.ends_at);
              const dur      = Math.max(endMin - startMin, 20);
              const top      = (startMin / 60) * HOUR_H;
              const height   = Math.max((dur / 60) * HOUR_H, 24);
              const c        = STATUS_COLORS[entry.status] ?? STATUS_COLORS['busy']!;
              return (
                <div
                  key={entry.id}
                  className="mcal-entry-block mini-tap"
                  onClick={() => onEditEntry(entry)}
                  style={{
                    top, height,
                    background: c.bg,
                    borderLeft: `3px solid ${c.border}`,
                    color: c.text,
                  }}
                >
                  <div className="mcal-entry-title">
                    {entry.title ?? statusLabel(entry.status)}
                  </div>
                  {height >= 36 && (
                    <div className="mcal-entry-time">
                      {formatTime(entry.starts_at)} – {formatTime(entry.ends_at)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state (below timeline when no entries) */}
        {!loading && entries.length === 0 && (
          <div className="mcal-empty-day">
            Записей нет.<br />
            <span
              className="mini-tap"
              onClick={onAddEntry}
              style={{ color: '#7c3aed', fontWeight: 700, cursor: 'pointer' }}
            >
              + Добавить запись
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function statusLabel(s: string): string {
  return s === 'busy' ? 'Занят' : s === 'tentative' ? 'Под вопросом' : s === 'blocked' ? 'Заблокировано' : 'Свободен';
}
