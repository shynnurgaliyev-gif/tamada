import Link from 'next/link';

const CATEGORIES = [
  { icon: '🎤', label: 'Тамада' },
  { icon: '📸', label: 'Фотограф' },
  { icon: '🎬', label: 'Видеограф' },
  { icon: '🎧', label: 'Диджей' },
  { icon: '🎵', label: 'Музыкант' },
  { icon: '💃', label: 'Танцор' },
  { icon: '💄', label: 'Визажист' },
  { icon: '🌸', label: 'Флорист' },
  { icon: '🎪', label: 'Аниматор' },
  { icon: '✨', label: 'Шоу' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Найдите исполнителя', desc: 'Ищите по городу, дате, категории и цене. Умный поиск понимает обычный текст.' },
  { step: '2', title: 'Проверьте профиль', desc: 'Смотрите фото, услуги, цены и расписание занятости прямо на сайте.' },
  { step: '3', title: 'Свяжитесь напрямую', desc: 'Контакты исполнителя открыты — WhatsApp, Instagram, Telegram.' },
];

export default function HomePage() {
  return (
    <div style={s.root}>

      {/* Nav */}
      <nav style={s.nav}>
        <span style={s.logo}>🎤 Тамада</span>
        <div style={s.navLinks}>
          <Link href="/search" style={s.navLink}>Поиск</Link>
          <Link href="/login" style={s.navLinkSecondary}>Войти</Link>
          <Link href="/signup" style={s.navBtn}>Регистрация</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={s.hero}>
        <div style={s.heroInner}>
          <h1 style={s.heroTitle}>
            Найдите лучшего<br />исполнителя на мероприятие
          </h1>
          <p style={s.heroSub}>
            Тамады, фотографы, видеографы, диджеи и другие профессионалы<br />
            по всему Казахстану — в одном месте.
          </p>
          <div style={s.heroActions}>
            <Link href="/search" style={s.heroCta}>Найти исполнителя</Link>
            <Link href="/signup" style={s.heroSecondary}>Я исполнитель →</Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Категории</h2>
        <div style={s.catGrid}>
          {CATEGORIES.map(c => (
            <Link
              key={c.label}
              href={`/search?category=${encodeURIComponent(c.label.toLowerCase())}`}
              style={s.catCard}
            >
              <span style={s.catIcon}>{c.icon}</span>
              <span style={s.catLabel}>{c.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ ...s.section, background: '#f3f4f6' }}>
        <h2 style={s.sectionTitle}>Как это работает</h2>
        <div style={s.howGrid}>
          {HOW_IT_WORKS.map(h => (
            <div key={h.step} style={s.howCard}>
              <div style={s.howStep}>{h.step}</div>
              <h3 style={s.howTitle}>{h.title}</h3>
              <p style={s.howDesc}>{h.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section style={s.banner}>
        <h2 style={s.bannerTitle}>Вы исполнитель?</h2>
        <p style={s.bannerSub}>Создайте профиль бесплатно и получайте клиентов через платформу.</p>
        <Link href="/signup" style={s.bannerBtn}>Создать профиль</Link>
      </section>

      {/* Footer */}
      <footer style={s.footer}>
        <span style={s.footerLogo}>🎤 Тамада</span>
        <span style={s.footerText}>© 2025 — Платформа для исполнителей Казахстана</span>
      </footer>

    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#111', background: '#fff' },

  // Nav
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 32px', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, background: '#fff', zIndex: 10 },
  logo: { fontSize: 20, fontWeight: 700, color: '#111' },
  navLinks: { display: 'flex', alignItems: 'center', gap: 20 },
  navLink: { color: '#374151', textDecoration: 'none', fontSize: 15, fontWeight: 500 },
  navLinkSecondary: { color: '#6b7280', textDecoration: 'none', fontSize: 15 },
  navBtn: { background: '#7c3aed', color: '#fff', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 600 },

  // Hero
  hero: { background: 'linear-gradient(135deg, #1e1b4b 0%, #4c1d95 50%, #6d28d9 100%)', padding: '96px 32px', textAlign: 'center' },
  heroInner: { maxWidth: 680, margin: '0 auto' },
  heroTitle: { margin: '0 0 20px', fontSize: 48, fontWeight: 800, color: '#fff', lineHeight: 1.15 },
  heroSub: { margin: '0 0 40px', fontSize: 18, color: 'rgba(255,255,255,.8)', lineHeight: 1.6 },
  heroActions: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' },
  heroCta: { background: '#fff', color: '#7c3aed', padding: '14px 32px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none' },
  heroSecondary: { color: 'rgba(255,255,255,.85)', padding: '14px 20px', fontSize: 16, textDecoration: 'none', fontWeight: 500 },

  // Sections
  section: { padding: '64px 32px', maxWidth: 1100, margin: '0 auto' },
  sectionTitle: { textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '0 0 40px', color: '#111' },

  // Categories
  catGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 12 },
  catCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 12px', background: '#f9fafb', borderRadius: 12, textDecoration: 'none', color: '#111', border: '1px solid #e5e7eb', transition: 'box-shadow .2s' },
  catIcon: { fontSize: 28 },
  catLabel: { fontSize: 13, fontWeight: 600, color: '#374151' },

  // How it works
  howGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, maxWidth: 900, margin: '0 auto' },
  howCard: { background: '#fff', borderRadius: 14, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,.07)' },
  howStep: { width: 36, height: 36, background: '#7c3aed', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, marginBottom: 14 },
  howTitle: { margin: '0 0 8px', fontSize: 16, fontWeight: 700 },
  howDesc: { margin: 0, fontSize: 14, color: '#6b7280', lineHeight: 1.6 },

  // Banner
  banner: { background: '#0f172a', padding: '72px 32px', textAlign: 'center' },
  bannerTitle: { margin: '0 0 12px', fontSize: 32, fontWeight: 800, color: '#fff' },
  bannerSub: { margin: '0 0 32px', fontSize: 16, color: 'rgba(255,255,255,.7)' },
  bannerBtn: { background: '#7c3aed', color: '#fff', padding: '14px 36px', borderRadius: 10, fontWeight: 700, fontSize: 16, textDecoration: 'none' },

  // Footer
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderTop: '1px solid #e5e7eb', flexWrap: 'wrap', gap: 8 },
  footerLogo: { fontWeight: 700, fontSize: 16 },
  footerText: { fontSize: 13, color: '#9ca3af' },
};
