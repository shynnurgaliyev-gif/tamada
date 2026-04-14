import { Suspense } from 'react';
import MiniShell from './MiniShell';

export default function MiniPage() {
  return (
    <Suspense fallback={<MiniLoader />}>
      <MiniShell />
    </Suspense>
  );
}

function MiniLoader() {
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--tg-theme-bg-color, #f7f6ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #7c3aed', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
