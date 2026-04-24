/* ── CalendarEntryView ─────────────────────────────────────────────────────────
   Read-only detail view for a calendar entry.
   Header: [space] title [Редактировать]
   Shows all fields including client data.
────────────────────────────────────────────────────────────────────────────── */

import type { CalendarEntryWithClient } from '../../types';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

const DAY_NAMES   = ['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const MONTH_NAMES = ['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}
function formatTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function isAllDay(e: CalendarEntryWithClient): boolean {
  const s = new Date(e.starts_at), en = new Date(e.ends_at);
  return s.getHours() === 0 && s.getMinutes() === 0 &&
    ((en.getHours() === 23 && en.getMinutes() >= 55) ||
     (en.getHours() === 0  && en.getMinutes() === 0 && en.getDate() > s.getDate()));
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  busy:      { label: 'Занят',         color: '#ef4444', bg: 'rgba(239,68,68,.1)'   },
  tentative: { label: 'Под вопросом',  color: '#ca8a04', bg: 'rgba(234,179,8,.1)'   },
  blocked:   { label: 'Заблокировано', color: '#6b7280', bg: 'rgba(107,114,128,.1)' }, // legacy
  free:      { label: 'Свободен',      color: '#16a34a', bg: 'rgba(34,197,94,.1)'   },
  vacation:  { label: '🏖️ Отпуск',     color: '#0891b2', bg: 'rgba(6,182,212,.1)'   },
};

/* ── Sub-components ───────────────────────────────────────────────────────── */

function InfoRow({ icon, label, value, href }: { icon: string; label: string; value: string; href?: string }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--mini-border)' }}>
      <span style={{ fontSize: 16, flexShrink: 0, opacity: .7 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 2 }}>
          {label}
        </div>
        {href ? (
          <a href={href} style={{ fontSize: 14, fontWeight: 600, color: '#7c3aed', textDecoration: 'none' }}>{value}</a>
        ) : (
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--tg-theme-text-color, #0a0a0f)' }}>{value}</div>
        )}
      </div>
    </div>
  );
}

/* ── Component ────────────────────────────────────────────────────────────── */

export function CalendarEntryView({
  entry,
  deleting,
  onEdit,
  onDelete,
  onBack,
}: {
  entry:    CalendarEntryWithClient;
  deleting: boolean;
  onEdit:   () => void;
  onDelete: () => Promise<void>;
  onBack:   () => void;
}) {
  const allDay  = isAllDay(entry);
  const status  = STATUS_MAP[entry.status] ?? STATUS_MAP['busy']!;
  const cl      = entry.client;
  const hasClient = cl && (cl.client_name || cl.client_phone || cl.event_type || cl.location_text || cl.price_amount || cl.notes);

  return (
    <div>
      {/* ── Header ── */}
      <div className="mini-inline-header">
        <button
          className="mini-tap"
          onClick={onBack}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: 'var(--tg-theme-hint-color,#6b7280)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Назад
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Запись</span>
        <button
          className="mini-tap"
          onClick={onEdit}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: '#7c3aed', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
        >
          Изменить
        </button>
      </div>

      {/* ── Date / time card ── */}
      <div style={{
        background: 'var(--tg-theme-secondary-bg-color, #fff)',
        border: '1px solid var(--mini-border)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 10,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
          {formatDate(entry.starts_at)}
        </div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
          {allDay ? 'Весь день' : `${formatTime(entry.starts_at)} – ${formatTime(entry.ends_at)}`}
        </div>
      </div>

      {/* ── Status badge ── */}
      <div style={{ marginBottom: 10 }}>
        <span style={{
          display: 'inline-block',
          background: status.bg,
          color: status.color,
          borderRadius: 10, padding: '6px 14px',
          fontSize: 13, fontWeight: 700,
        }}>
          {status.label}
        </span>
      </div>

      {/* ── Title ── */}
      {entry.title && (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          border: '1px solid var(--mini-border)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 10,
          fontSize: 16, fontWeight: 700,
        }}>
          {entry.title}
        </div>
      )}

      {/* ── Notes ── */}
      {entry.notes && (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          border: '1px solid var(--mini-border)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 6 }}>Заметки</div>
          <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--tg-theme-text-color, #0a0a0f)' }}>{entry.notes}</div>
        </div>
      )}

      {/* ── Client data ── */}
      {hasClient && (
        <div style={{
          background: 'var(--tg-theme-secondary-bg-color, #fff)',
          border: '1px solid var(--mini-border)',
          borderRadius: 14, padding: '14px 16px', marginBottom: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>👤 Данные клиента</div>
          <div style={{ marginTop: 4 }}>
            {cl!.client_name  && <InfoRow icon="🙍" label="Имя"          value={cl!.client_name} />}
            {cl!.client_phone && <InfoRow icon="📞" label="Телефон"      value={cl!.client_phone} href={`tel:${cl!.client_phone}`} />}
            {cl!.event_type   && <InfoRow icon="🎉" label="Тип события"  value={cl!.event_type} />}
            {cl!.location_text && <InfoRow icon="📍" label="Место"       value={cl!.location_text} />}
            {cl!.price_amount && (
              <InfoRow icon="💰" label="Сумма" value={`${cl!.price_amount} ${cl!.currency}`} />
            )}
            {cl!.notes && <InfoRow icon="📝" label="Заметки клиента" value={cl!.notes} />}
          </div>
        </div>
      )}

      {/* ── Delete ── */}
      <button
        className="mcal-delete-btn mini-tap"
        onClick={onDelete}
        disabled={deleting}
        style={{ opacity: deleting ? 0.6 : 1, marginTop: 8 }}
      >
        {deleting ? '...' : 'Удалить запись'}
      </button>

      <div style={{ height: 24 }} />
    </div>
  );
}
