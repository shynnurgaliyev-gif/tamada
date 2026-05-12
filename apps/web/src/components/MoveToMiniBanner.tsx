'use client';

/* ── MoveToMiniBanner ────────────────────────────────────────────────────────
   Soft phase-out nudge for the web dashboard (Idea 3, Phase 1 in
   complexity-analysis): web dashboard is becoming a parallel surface.
   Mini App in Telegram is the recommended place to manage things.

   Web pages still work. Banner just guides existing web users towards Telegram.
────────────────────────────────────────────────────────────────────────────── */

import { TELEGRAM_DASHBOARD_LINK } from '@/lib/telegramLinks';

export function MoveToMiniBanner() {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(124,58,237,.08), rgba(79,70,229,.05))',
        borderBottom: '1px solid rgba(124,58,237,.18)',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        flexWrap: 'wrap',
        fontSize: 13,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ fontSize: 18 }}>📱</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--ink-1)' }}>
            Управление в Telegram Mini App
          </div>
          <div style={{ color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.4 }}>
            Быстрее и больше возможностей — календарь, аналитика, команда, передачи
          </div>
        </div>
      </div>
      <a
        href={TELEGRAM_DASHBOARD_LINK}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          background: '#7c3aed',
          color: '#fff',
          padding: '7px 14px',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: 13,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Открыть →
      </a>
    </div>
  );
}
