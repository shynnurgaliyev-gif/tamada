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
    <div>
      {/* Nav */}
      <nav className="nav">
        <span className="nav-logo">🎤 Тамада</span>
        <div className="nav-links">
          <Link href="/search" className="nav-link">Поиск</Link>
          <Link href="/login" className="nav-link" style={{ color: 'var(--ink-3)' }}>Войти</Link>
          <Link href="/signup" className="btn btn-brand btn-sm">Регистрация</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container-sm" style={{ textAlign: 'center' }}>
          <h1 className="hero-title">
            Найдите лучшего<br />исполнителя на мероприятие
          </h1>
          <p className="hero-sub">
            Тамады, фотографы, видеографы, диджеи и другие профессионалы<br className="hide-mobile" />
            по всему Казахстану — в одном месте.
          </p>
          <div className="hero-actions">
            <Link href="/search" className="btn btn-lg" style={{ background: '#fff', color: 'var(--brand)', fontWeight: 700 }}>Найти исполнителя</Link>
            <Link href="/signup" className="btn btn-lg" style={{ color: 'rgba(255,255,255,.85)', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)' }}>Я исполнитель →</Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section style={{ padding: '64px 0' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '0 0 40px', color: 'var(--ink)' }}>Категории</h2>
          <div className="cat-grid">
            {CATEGORIES.map(c => (
              <Link
                key={c.label}
                href={`/search?category=${encodeURIComponent(c.label.toLowerCase())}`}
                className="cat-card"
              >
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-2)' }}>{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '64px 0', background: 'var(--bg)' }}>
        <div className="container">
          <h2 style={{ textAlign: 'center', fontSize: 28, fontWeight: 700, margin: '0 0 40px', color: 'var(--ink)' }}>Как это работает</h2>
          <div className="how-grid">
            {HOW_IT_WORKS.map(h => (
              <div key={h.step} className="card" style={{ padding: 28 }}>
                <div style={{ width: 36, height: 36, background: 'var(--brand)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, marginBottom: 14 }}>{h.step}</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>{h.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.6 }}>{h.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section style={{ background: '#0f172a', padding: '72px 16px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, color: '#fff' }}>Вы исполнитель?</h2>
        <p style={{ margin: '0 0 32px', fontSize: 16, color: 'rgba(255,255,255,.7)' }}>Создайте профиль бесплатно и получайте клиентов через платформу.</p>
        <Link href="/signup" className="btn btn-brand btn-lg">Создать профиль</Link>
      </section>

      {/* Footer */}
      <footer style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>🎤 Тамада</span>
        <span style={{ fontSize: 13, color: 'var(--ink-4)' }}>© 2025 — Платформа для исполнителей Казахстана</span>
      </footer>
    </div>
  );
}
