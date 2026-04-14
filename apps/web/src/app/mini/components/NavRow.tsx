export function NavRow({
  icon, iconBg, iconColor, label, sub, href,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  sub: string;
  href: string;
}) {
  return (
    <a href={href} className="mini-row mini-tap">
      <div className="mini-row-icon" style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
          {sub}
        </div>
      </div>
      <span className="mini-row-chevron">›</span>
    </a>
  );
}
