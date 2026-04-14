export function MiniLoader() {
  return (
    <>
      <style>{`
        html, body { margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        @keyframes mini-spin { to { transform: rotate(360deg); } }
      `}</style>
      <div style={{
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--tg-theme-bg-color, #f7f6ff)',
      }}>
        <div style={{
          width: 28, height: 28,
          border: '3px solid rgba(124,58,237,.2)',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'mini-spin 0.7s linear infinite',
        }} />
      </div>
    </>
  );
}
