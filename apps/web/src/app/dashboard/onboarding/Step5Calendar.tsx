'use client';
import { useState } from 'react';
import { API_URL as API } from '@/lib/env';
import type { Provider } from '@octiqa/types';
import { getToken, StepHeader } from './_shared';

export function Step5Calendar({ provider, onDone, onSkip, onBack, saving }: {
  provider: Provider; onDone: () => void; onSkip: () => void; onBack: () => void; saving: boolean;
}) {
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());
  const [creating, setCreating]   = useState(false);

  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return d.toISOString().slice(0, 10);
  });

  function toggle(date: string) {
    setBusyDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }

  async function createEntries() {
    if (busyDates.size === 0) { onDone(); return; }
    setCreating(true);
    const token = getToken();
    for (const date of busyDates) {
      const startsAt = `${date}T00:00:00.000Z`;
      const endsAt   = `${date}T23:59:00.000Z`;
      await fetch(`${API}/providers/${provider.id}/calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt, status: 'busy' }),
      }).catch(() => null);
    }
    setCreating(false);
    onDone();
  }

  return (
    <div>
      <StepHeader icon="📅" title="Отметьте занятые дни" sub="Клиенты сразу увидят ваше расписание. Можно изменить позже" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 20 }}>
        {days.map(date => {
          const d = new Date(date + 'T12:00:00Z');
          const isBusy = busyDates.has(date);
          const dow = d.toLocaleDateString('ru-RU', { weekday: 'short' });
          const day = d.getDate();
          const mon = d.toLocaleDateString('ru-RU', { month: 'short' });
          return (
            <button
              key={date}
              onClick={() => toggle(date)}
              style={{
                padding: '10px 6px', borderRadius: 'var(--r-lg)', border: '1.5px solid',
                borderColor: isBusy ? 'var(--red)' : 'var(--border)',
                background: isBusy ? '#fee2e2' : 'var(--surface)',
                color: isBusy ? '#991b1b' : 'var(--ink-2)',
                cursor: 'pointer', textAlign: 'center', fontWeight: isBusy ? 700 : 400,
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 10, color: 'inherit', opacity: .7, marginBottom: 2, textTransform: 'uppercase' }}>{dow}</div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{day}</div>
              <div style={{ fontSize: 10, color: 'inherit', opacity: .7, marginTop: 2 }}>{mon}</div>
            </button>
          );
        })}
      </div>

      {busyDates.size > 0 && (
        <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
          🔴 Отмечено занятых дней: {busyDates.size}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
        <button
          onClick={() => void createEntries()}
          disabled={creating || saving}
          className="btn btn-brand btn-lg btn-full"
        >
          {creating || saving ? 'Сохраняю...' : busyDates.size > 0 ? '✅ Сохранить и завершить' : 'Завершить настройку'}
        </button>
        <button onClick={onBack} className="btn btn-ghost btn-full">← Назад</button>
        {busyDates.size === 0 && (
          <button onClick={onSkip} className="btn btn-ghost btn-full" style={{ color: 'var(--ink-4)', fontSize: 13 }}>
            Пропустить, добавлю позже
          </button>
        )}
      </div>
    </div>
  );
}
