'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Summary = {
  profile_views: number;
  contact_reveals: number;
  calendar_views: number;
  conversion_pct: number;
  top_days: { date: string; contact_reveals: number; profile_views: number }[];
};

type DailyRow = {
  date: string;
  profile_views: number;
  contact_reveals: number;
  calendar_views: number;
  search_impressions: number;
};

const DAYS_OPTIONS = [7, 14, 30, 90];

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }

    setLoading(true);
    setError('');

    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const to = new Date().toISOString().slice(0, 10);

    Promise.all([
      fetch(`${API}/dashboard/analytics/summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${API}/dashboard/analytics/daily?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([sum, dly]: [{ ok: boolean; summary: Summary | null }, { ok: boolean; rows: DailyRow[] }]) => {
        if (!sum.ok) { setError('Ошибка загрузки аналитики'); return; }
        setSummary(sum.summary);
        setDaily(dly.rows ?? []);
      })
      .catch(() => setError('Ошибка сети'))
      .finally(() => setLoading(false));
  }, [days]);

  const maxViews = daily.length > 0 ? Math.max(...daily.map(r => r.profile_views), 1) : 1;
  const maxReveals = daily.length > 0 ? Math.max(...daily.map(r => r.contact_reveals), 1) : 1;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark" style={{ fontSize: 17 }}>
          <span className="logo-mark-icon" style={{ width: 28, height: 28, fontSize: 14 }}>✦</span>
          Linkora
        </a>
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Кабинет</a>
      </nav>

      <div className="container-sm" style={{ padding: '32px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Аналитика</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline'}`}
              >
                {d}д
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-lg)' }} />
            ))}
          </div>
        )}

        {error && (
          <div className="card" style={{ padding: 20, color: 'var(--red)', marginBottom: 24 }}>{error}</div>
        )}

        {!loading && !error && summary === null && (
          <div className="empty">
            <span style={{ fontSize: 36 }}>📊</span>
            <p>Нет данных. Аналитика появится после первых просмотров профиля.</p>
          </div>
        )}

        {!loading && !error && summary !== null && (
          <>
            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
              <StatCard icon="👁" label="Просмотры профиля" value={summary.profile_views} />
              <StatCard icon="📲" label="Открытия контактов" value={summary.contact_reveals} />
              <StatCard icon="📅" label="Просмотры календаря" value={summary.calendar_views} />
              <StatCard
                icon="🎯"
                label="Конверсия"
                value={`${summary.conversion_pct}%`}
                hint="контакты / просмотры"
                accent={summary.conversion_pct > 0}
              />
            </div>

            {/* Bar chart — profile views */}
            {daily.length > 0 && (
              <>
                <SectionTitle>Просмотры профиля — по дням</SectionTitle>
                <div className="card" style={{ padding: '16px 12px', marginBottom: 20, overflowX: 'auto' }}>
                  <BarChart rows={daily} field="profile_views" maxVal={maxViews} color="var(--brand)" />
                </div>

                <SectionTitle>Открытия контактов — по дням</SectionTitle>
                <div className="card" style={{ padding: '16px 12px', marginBottom: 20, overflowX: 'auto' }}>
                  <BarChart rows={daily} field="contact_reveals" maxVal={maxReveals} color="var(--green)" />
                </div>
              </>
            )}

            {/* Top days */}
            {summary.top_days.length > 0 && (
              <>
                <SectionTitle>Топ дней по открытиям контактов</SectionTitle>
                <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                        <Th>Дата</Th>
                        <Th align="right">Просмотры</Th>
                        <Th align="right">Открытия</Th>
                        <Th align="right">Конверсия</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.top_days.map((row, i) => {
                        const conv = row.profile_views > 0
                          ? Math.round((row.contact_reveals / row.profile_views) * 100)
                          : 0;
                        return (
                          <tr key={row.date} style={{ borderBottom: i < summary.top_days.length - 1 ? '1px solid var(--border)' : 'none' }}>
                            <Td>{formatDate(row.date)}</Td>
                            <Td align="right">{row.profile_views}</Td>
                            <Td align="right" bold>{row.contact_reveals}</Td>
                            <Td align="right">{conv}%</Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */

function StatCard({ icon, label, value, hint, accent }: {
  icon: string; label: string; value: string | number; hint?: string; accent?: boolean;
}) {
  return (
    <div className="card" style={{ padding: '16px 14px' }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontSize: 26,
        fontWeight: 800,
        color: accent ? 'var(--brand)' : 'var(--ink)',
        lineHeight: 1.1,
        marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.3 }}>{label}</div>
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
      {children}
    </h2>
  );
}

function BarChart({ rows, field, maxVal, color }: {
  rows: DailyRow[]; field: 'profile_views' | 'contact_reveals'; maxVal: number; color: string;
}) {
  const BAR_H = 80;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, minWidth: rows.length * 20, height: BAR_H + 28 }}>
      {rows.map(row => {
        const val = row[field];
        const h = maxVal > 0 ? Math.max(2, Math.round((val / maxVal) * BAR_H)) : 2;
        return (
          <div key={row.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, minWidth: 12 }}>
            <div
              title={`${formatDate(row.date)}: ${val}`}
              style={{
                width: '100%',
                height: h,
                background: color,
                borderRadius: '3px 3px 0 0',
                opacity: val === 0 ? 0.15 : 0.85,
                transition: 'height .3s ease',
              }}
            />
            {rows.length <= 14 && (
              <div style={{ fontSize: 9, color: 'var(--ink-4)', marginTop: 3, writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1 }}>
                {row.date.slice(5)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th style={{ padding: '10px 14px', textAlign: align ?? 'left', fontWeight: 600, color: 'var(--ink-3)', fontSize: 12 }}>
      {children}
    </th>
  );
}

function Td({ children, align, bold }: { children: React.ReactNode; align?: 'right'; bold?: boolean }) {
  return (
    <td style={{ padding: '10px 14px', textAlign: align ?? 'left', fontWeight: bold ? 600 : 400, color: bold ? 'var(--ink)' : 'var(--ink-2)' }}>
      {children}
    </td>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}
