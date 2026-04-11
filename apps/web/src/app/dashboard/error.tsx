'use client';
import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard error]', error);
  }, [error]);

  return (
    <div style={{ maxWidth: 520, margin: '80px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Что-то пошло не так</h2>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 16 }}>{error.message}</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={reset}
          style={{ background: '#111', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: 'pointer', fontSize: 14 }}
        >
          Попробовать снова
        </button>
        <a href="/dashboard" style={{ border: '1px solid #ccc', borderRadius: 8, padding: '8px 18px', fontSize: 14, textDecoration: 'none', color: '#374151' }}>
          В кабинет
        </a>
      </div>
    </div>
  );
}
