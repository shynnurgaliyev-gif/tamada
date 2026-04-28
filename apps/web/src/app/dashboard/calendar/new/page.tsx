'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { API_URL as API } from '@/lib/env';

function toLocalInputValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function NewEntryForm() {
  const params = useSearchParams();
  const providerId = params.get('provider') ?? '';
  const dateParam = params.get('date'); // YYYY-MM-DD

  const now = new Date();
  const baseDate = dateParam ? new Date(`${dateParam}T10:00:00`) : now;
  const later = new Date(baseDate.getTime() + 2 * 3600000);

  const [form, setForm] = useState({
    starts_at: toLocalInputValue(baseDate),
    ends_at: toLocalInputValue(later),
    status: 'busy',
    title: '',
    notes: '',
  });
  const [client, setClient] = useState({
    client_name: '', client_phone: '', event_type: '', location_text: '', price_amount: '', currency: 'KZT',
  });
  const [showClient, setShowClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const token = localStorage.getItem('session_token') ?? '';
    try {
      const body: Record<string, unknown> = {
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        status: form.status,
        title: form.title || undefined,
        notes: form.notes || undefined,
      };
      if (showClient && client.client_name) {
        body['client'] = {
          client_name: client.client_name || undefined,
          client_phone: client.client_phone || undefined,
          event_type: client.event_type || undefined,
          location_text: client.location_text || undefined,
          price_amount: client.price_amount ? Number(client.price_amount) : undefined,
          currency: client.currency,
        };
      }
      const res = await fetch(`${API}/providers/${providerId}/calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(String(data.error ?? 'Ошибка')); return; }
      window.location.href = `/dashboard/calendar`;
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={s.page}>
      <a href="/dashboard/calendar" style={s.back}>← Календарь</a>
      <h1 style={s.title}>Новая запись</h1>
      <form onSubmit={submit} style={s.form}>
        <section style={s.section}>
          <h2 style={s.sectionTitle}>Время</h2>
          <label style={s.label}>Начало<input type="datetime-local" style={s.input} value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} required /></label>
          <label style={s.label}>Конец<input type="datetime-local" style={s.input} value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} required /></label>
          <label style={s.label}>Статус
            <select style={s.input} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              <option value="busy">Занято</option>
              <option value="free">Свободно</option>
              <option value="tentative">Под вопросом</option>
              <option value="blocked">Недоступно</option>
            </select>
          </label>
          <label style={s.label}>Название (опц.)<input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label style={s.label}>Заметки<textarea style={{ ...s.input, height: 60 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
        </section>

        <button type="button" onClick={() => setShowClient(v => !v)} style={s.toggleBtn}>
          {showClient ? '▲ Скрыть данные клиента' : '▼ Добавить данные клиента'}
        </button>

        {showClient && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Клиент</h2>
            <label style={s.label}>Имя<input style={s.input} value={client.client_name} onChange={e => setClient(c => ({ ...c, client_name: e.target.value }))} /></label>
            <label style={s.label}>Телефон<input style={s.input} value={client.client_phone} onChange={e => setClient(c => ({ ...c, client_phone: e.target.value }))} /></label>
            <label style={s.label}>Тип события<input style={s.input} value={client.event_type} onChange={e => setClient(c => ({ ...c, event_type: e.target.value }))} placeholder="свадьба, юбилей..." /></label>
            <label style={s.label}>Место<input style={s.input} value={client.location_text} onChange={e => setClient(c => ({ ...c, location_text: e.target.value }))} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
              <label style={s.label}>Сумма<input style={s.input} type="number" value={client.price_amount} onChange={e => setClient(c => ({ ...c, price_amount: e.target.value }))} /></label>
              <label style={s.label}>Валюта<input style={s.input} value={client.currency} onChange={e => setClient(c => ({ ...c, currency: e.target.value }))} /></label>
            </div>
          </section>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
        <button type="submit" style={s.btn} disabled={saving}>{saving ? '...' : 'Сохранить'}</button>
      </form>
    </div>
  );
}

export default function NewCalendarEntryPage() {
  return <Suspense><NewEntryForm /></Suspense>;
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 560, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, sans-serif' },
  back: { color: '#9ca3af', textDecoration: 'none', fontSize: 14 },
  title: { margin: '16px 0 24px', fontSize: 22, fontWeight: 700 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 },
  sectionTitle: { margin: '0 0 14px', fontSize: 15, fontWeight: 600 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#374151', marginBottom: 10 },
  input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' },
  toggleBtn: { background: 'none', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: '#6b7280', textAlign: 'left' },
  btn: { background: '#111', color: '#fff', padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600 },
};
