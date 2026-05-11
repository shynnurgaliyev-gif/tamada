'use client';
import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { API_URL as API } from '@/lib/env';
import { getSessionToken } from '@/lib/auth';

type Entry = {
  id: string; starts_at: string; ends_at: string;
  status: string; title: string | null; notes: string | null;
  client: {
    client_name: string | null; client_phone: string | null;
    event_type: string | null; location_text: string | null;
    price_amount: string | null; currency: string; notes: string | null;
  } | null;
};

function toLocalInputValue(isoStr: string) {
  const d = new Date(isoStr);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEntryForm() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const providerId = params.get('provider') ?? '';

  const [form, setForm] = useState({ starts_at: '', ends_at: '', status: 'busy', title: '', notes: '' });
  const [client, setClient] = useState({ client_name: '', client_phone: '', event_type: '', location_text: '', price_amount: '', currency: 'KZT', notes: '' });
  const [showClient, setShowClient] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = getSessionToken();
    const from = new Date(0).toISOString();
    const to = new Date(Date.now() + 365 * 86400000).toISOString();
    fetch(`${API}/providers/${providerId}/calendar?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; entries?: Entry[] }) => {
        const entry = d.entries?.find(e => e.id === id);
        if (entry) {
          setForm({
            starts_at: toLocalInputValue(entry.starts_at),
            ends_at: toLocalInputValue(entry.ends_at),
            status: entry.status,
            title: entry.title ?? '',
            notes: entry.notes ?? '',
          });
          if (entry.client) {
            setClient({
              client_name: entry.client.client_name ?? '',
              client_phone: entry.client.client_phone ?? '',
              event_type: entry.client.event_type ?? '',
              location_text: entry.client.location_text ?? '',
              price_amount: entry.client.price_amount ?? '',
              currency: entry.client.currency ?? 'KZT',
              notes: entry.client.notes ?? '',
            });
            setShowClient(true);
          }
        }
      })
      .finally(() => setLoading(false));
  }, [id, providerId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMsg('');
    const token = getSessionToken();
    try {
      const body: Record<string, unknown> = {
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        status: form.status,
        title: form.title || undefined,
        notes: form.notes || undefined,
      };
      if (showClient) {
        body['client'] = {
          client_name: client.client_name || undefined,
          client_phone: client.client_phone || undefined,
          event_type: client.event_type || undefined,
          location_text: client.location_text || undefined,
          price_amount: client.price_amount ? Number(client.price_amount) : undefined,
          currency: client.currency,
          notes: client.notes || undefined,
        };
      }
      const res = await fetch(`${API}/providers/${providerId}/calendar/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!data.ok) { setError(String(data.error ?? 'Ошибка')); return; }
      setMsg('Сохранено');
    } catch {
      setError('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  return (
    <div style={s.page}>
      <a href="/dashboard/calendar" style={s.back}>← Календарь</a>
      <h1 style={s.title}>Редактировать запись</h1>
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
          <label style={s.label}>Название<input style={s.input} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
          <label style={s.label}>Заметки<textarea style={{ ...s.input, height: 60 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label>
        </section>

        <button type="button" onClick={() => setShowClient(v => !v)} style={s.toggleBtn}>
          {showClient ? '▲ Скрыть данные клиента' : '▼ Данные клиента'}
        </button>

        {showClient && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Клиент</h2>
            <label style={s.label}>Имя<input style={s.input} value={client.client_name} onChange={e => setClient(c => ({ ...c, client_name: e.target.value }))} /></label>
            <label style={s.label}>Телефон<input style={s.input} value={client.client_phone} onChange={e => setClient(c => ({ ...c, client_phone: e.target.value }))} /></label>
            <label style={s.label}>Тип события<input style={s.input} value={client.event_type} onChange={e => setClient(c => ({ ...c, event_type: e.target.value }))} /></label>
            <label style={s.label}>Место<input style={s.input} value={client.location_text} onChange={e => setClient(c => ({ ...c, location_text: e.target.value }))} /></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 8 }}>
              <label style={s.label}>Сумма<input style={s.input} type="number" value={client.price_amount} onChange={e => setClient(c => ({ ...c, price_amount: e.target.value }))} /></label>
              <label style={s.label}>Валюта<input style={s.input} value={client.currency} onChange={e => setClient(c => ({ ...c, currency: e.target.value }))} /></label>
            </div>
            <label style={s.label}>Заметки<textarea style={{ ...s.input, height: 60 }} value={client.notes} onChange={e => setClient(c => ({ ...c, notes: e.target.value }))} /></label>
          </section>
        )}

        {error && <p style={{ color: '#ef4444', fontSize: 14 }}>{error}</p>}
        {msg && <p style={{ color: '#22c55e', fontSize: 14 }}>{msg}</p>}
        <button type="submit" style={s.btn} disabled={saving}>{saving ? '...' : 'Сохранить'}</button>
      </form>
    </div>
  );
}

export default function EditCalendarEntryPage() {
  return <Suspense><EditEntryForm /></Suspense>;
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
