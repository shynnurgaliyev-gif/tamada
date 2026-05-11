'use client';
import { useEffect, useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';

import { API_URL as API } from '@/lib/env';
import { getSessionToken } from '@/lib/auth';
import type { AnalyticsSummary } from '@octiqa/types';

type Summary = AnalyticsSummary;

type DailyRow = {
  date: string;
  profile_views: number;
  contact_reveals: number;
  calendar_views: number;
  search_impressions: number;
};

const DAYS_OPTIONS = [7, 14, 30, 90];

/** Fill in every day of the range, zero-padding missing dates */
function fillDays(rows: DailyRow[], days: number): DailyRow[] {
  const map = new Map(rows.map(r => {
    const key = typeof r.date === 'string' ? r.date : (r.date as unknown as Date).toISOString().slice(0, 10);
    return [key, r];
  }));
  const result: DailyRow[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    result.push(map.get(key) ?? {
      date: key,
      profile_views: 0,
      contact_reveals: 0,
      calendar_views: 0,
      search_impressions: 0,
    });
  }
  return result;
}

function formatDate(dateStr: string, short = false): string {
  const d = new Date(dateStr + 'T00:00:00');
  if (short) return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getSessionToken();
    if (!token) { window.location.href = '/login'; return; }

    setLoading(true);
    setError('');

    const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const to   = new Date().toISOString().slice(0, 10);

    Promise.all([
      fetch(`${API}/dashboard/analytics/summary?days=${days}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`${API}/dashboard/analytics/daily?from=${from}&to=${to}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ])
      .then(([sum, dly]: [
        { ok: boolean; summary: Summary | null },
        { ok: boolean; rows: DailyRow[] }
      ]) => {
        if (!sum.ok) { setError('Ошибка загрузки аналитики'); return; }
        setSummary(sum.summary);
        setDaily(fillDays(dly.rows ?? [], days));
      })
      .catch(() => setError('Ошибка сети'))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="nav-frosted">
        <a href="/" className="logo-mark" style={{ fontSize: 17 }}>
          <OctiMark size={28} />
          Octiqa
        </a>
        <a href="/dashboard" className="btn btn-ghost btn-sm">← Кабинет</a>
      </nav>

      <div className="container-sm" style={{ padding: '32px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Аналитика</h1>
          <div style={{ display: 'flex', gap: 6 }}>
            {DAYS_OPTIONS.map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`btn btn-sm ${days === d ? 'btn-primary' : 'btn-outline'}`}
              >{d}д</button>
            ))}
          </div>
        </div>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-lg)' }} />)}
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
            {/* ── KPI cards ─────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 28 }}>
              <StatCard icon="👁" label="Просмотры профиля"   value={summary.profile_views} />
              <StatCard icon="📲" label="Открытия контактов"  value={summary.contact_reveals} />
              <StatCard icon="📅" label="Просмотры календаря" value={summary.calendar_views} />
              <StatCard
                icon="🎯"
                label="Конверсия"
                value={`${summary.conversion_pct}%`}
                hint="контакты / просмотры"
                accent={summary.conversion_pct > 0}
              />
            </div>

            {/* ── Combined chart ────────────────────────── */}
            {daily.length > 0 && (
              <>
                <SectionTitle>Динамика за {days} дней</SectionTitle>
                <div className="card" style={{ padding: '20px 16px 12px', marginBottom: 24 }}>
                  <CombinedChart rows={daily} days={days} />
                  {/* Legend */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    <LegendItem color="#7c3aed" label="Просмотры профиля" />
                    <LegendItem color="#22c55e" label="Открытия контактов" />
                    {summary.calendar_views > 0 && <LegendItem color="#f59e0b" label="Просмотры календаря" />}
                  </div>
                </div>
              </>
            )}

            {/* ── Top days table ───────────────────────── */}
            {summary.top_days.length > 0 && (
              <>
                <SectionTitle>Топ дней по открытиям контактов</SectionTitle>
                <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 360 }}>
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
      <div style={{ fontSize: 26, fontWeight: 800, color: accent ? 'var(--brand)' : 'var(--ink)', lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
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

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-3)' }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block', flexShrink: 0 }} />
      {label}
    </div>
  );
}

function CombinedChart({ rows, days }: { rows: DailyRow[]; days: number }) {
  // SVG-based chart — avoids all CSS flex height issues
  const VW = 660;
  const VH = 170;
  const PT = 20;  // top padding (value labels)
  const PB = 22;  // bottom padding (date labels)
  const PL = 4;
  const PR = 4;
  const chartW = VW - PL - PR;
  const chartH = VH - PT - PB;
  const baseY  = PT + chartH;

  const n      = rows.length;
  const colW   = chartW / n;
  const barW   = Math.max(1.5, Math.min(10, colW * 0.24));
  const maxVal = Math.max(...rows.map(r => Math.max(r.profile_views, r.contact_reveals, r.calendar_views)), 1);
  const labelEvery = days <= 7 ? 1 : days <= 14 ? 2 : days <= 30 ? 5 : 10;

  const bh = (v: number) => v > 0 ? Math.max(2, Math.round((v / maxVal) * chartH)) : 0;
  const cx = (i: number) => PL + (i + 0.5) * colW;

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      style={{ width: '100%', height: 'auto', display: 'block' }}
      aria-label="График динамики"
    >
      {/* Baseline */}
      <line x1={PL} y1={baseY} x2={VW - PR} y2={baseY} stroke="#e5e7eb" strokeWidth="1" />

      {rows.map((row, idx) => {
        const x       = cx(idx);
        const pvH     = bh(row.profile_views);
        const crH     = bh(row.contact_reveals);
        const cvH     = bh(row.calendar_views);
        const showLbl = idx % labelEvery === 0 || idx === n - 1;

        return (
          <g key={row.date}>
            {/* Dim stub for zero days */}
            <rect x={x - barW * 1.2} y={baseY - 1} width={barW} height={1} fill="#7c3aed" opacity="0.12" />

            {/* Profile views bar */}
            {pvH > 0 && (
              <rect x={x - barW * 1.2} y={baseY - pvH} width={barW} height={pvH} fill="#7c3aed" opacity="0.85" rx="1" />
            )}

            {/* Contact reveals bar */}
            {crH > 0 && (
              <rect x={x - barW * 0.1} y={baseY - crH} width={barW} height={crH} fill="#22c55e" opacity="0.9" rx="1" />
            )}

            {/* Calendar views bar */}
            {cvH > 0 && (
              <rect x={x + barW * 1.0} y={baseY - cvH} width={barW} height={cvH} fill="#f59e0b" opacity="0.9" rx="1" />
            )}

            {/* Value label above profile bar */}
            {pvH > 0 && (
              <text x={x} y={baseY - pvH - 4} textAnchor="middle" fontSize="9" fill="#6b7280" fontWeight="600">
                {row.profile_views}
              </text>
            )}

            {/* Date label */}
            {showLbl && (
              <text x={x} y={VH - 5} textAnchor="middle" fontSize="9" fill="#9ca3af">
                {row.date.slice(5).replace('-', '/')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
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
