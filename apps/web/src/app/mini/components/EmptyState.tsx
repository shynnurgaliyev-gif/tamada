export function EmptyState({
  icon, title, sub, href, cta,
}: {
  icon: string;
  title: string;
  sub: string;
  href: string;
  cta: string;
}) {
  return (
    <div style={{ textAlign: 'center', paddingTop: 48 }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>{title}</div>
      <div style={{
        fontSize: 14,
        color: 'var(--tg-theme-hint-color, #6b7280)',
        marginBottom: 28,
        lineHeight: 1.5,
      }}>
        {sub}
      </div>
      <a
        href={href}
        className="mini-tap"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '13px 28px',
          background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
          borderRadius: 13,
          fontSize: 15,
          fontWeight: 700,
          color: '#fff',
          textDecoration: 'none',
          boxShadow: '0 3px 12px rgba(124,58,237,.3)',
        }}
      >
        {cta}
      </a>
    </div>
  );
}
