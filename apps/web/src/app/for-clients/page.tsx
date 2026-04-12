import type { Metadata } from 'next';
import Link from 'next/link';
import { OctiMark } from '@/components/OctiLogo';

export const metadata: Metadata = {
  title: 'Клиентам — найдите специалиста на мероприятие',
  description: 'Найдите тамаду, фотографа, видеографа, диджея в вашем городе. Смотрите занятость, изучайте профили и связывайтесь напрямую — бесплатно.',
};

const STEPS = [
  {
    n: '1', icon: '🔍',
    title: 'Найдите специалиста',
    desc: 'Фильтры по городу, дате и категории. Тамада, фотограф, диджей — выберите нужного в своём городе.',
  },
  {
    n: '2', icon: '📋',
    title: 'Изучите профиль',
    desc: 'Фото, описание, услуги и цены — всё на одной странице. Оцените специалиста до того, как напишете.',
  },
  {
    n: '3', icon: '📅',
    title: 'Проверьте занятость',
    desc: 'Цветной календарь прямо на профиле. Сразу видно свободные и занятые даты — без переписки и ожидания.',
  },
  {
    n: '4', icon: '💬',
    title: 'Свяжитесь напрямую',
    desc: 'WhatsApp, Telegram, Instagram — один клик и вы уже пишете специалисту. Никаких посредников.',
  },
];

const CATEGORIES = [
  { icon: '🎤', label: 'Тамада',    q: 'тамада' },
  { icon: '📸', label: 'Фотограф', q: 'фотограф' },
  { icon: '🎬', label: 'Видеограф',q: 'видеограф' },
  { icon: '🎧', label: 'Диджей',   q: 'диджей' },
  { icon: '🎵', label: 'Музыкант', q: 'музыкант' },
  { icon: '💄', label: 'Визажист', q: 'визажист' },
  { icon: '🌸', label: 'Флорист',  q: 'флорист' },
  { icon: '🎪', label: 'Аниматор',q: 'аниматор' },
];

const CAL_DAYS = [
  null, null,
  { d: 1,  s: 'free' }, { d: 2,  s: 'free' }, { d: 3,  s: 'busy' },
  { d: 4,  s: 'busy' }, { d: 5,  s: 'free' }, { d: 6,  s: 'past' },
  { d: 7,  s: 'past' }, { d: 8,  s: 'past' }, { d: 9,  s: 'past' },
  { d: 10, s: 'past' }, { d: 11, s: 'past' }, { d: 12, s: 'past' },
  { d: 13, s: 'free' }, { d: 14, s: 'free' }, { d: 15, s: 'tentative' },
  { d: 16, s: 'busy' }, { d: 17, s: 'busy' }, { d: 18, s: 'partial' },
  { d: 19, s: 'free' }, { d: 20, s: 'free' }, { d: 21, s: 'free' },
  { d: 22, s: 'busy' }, { d: 23, s: 'busy' }, { d: 24, s: 'free' },
  { d: 25, s: 'free' }, { d: 26, s: 'free' }, { d: 27, s: 'free' },
  { d: 28, s: 'tentative' }, { d: 29, s: 'free' }, { d: 30, s: 'free' },
];
const CAL_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  free:     { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  busy:     { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  partial:  { bg: '#ffedd5', color: '#9a3412', dot: '#f97316' },
  tentative:{ bg: '#fef9c3', color: '#92400e', dot: '#f59e0b' },
  past:     { bg: '#f3f4f6', color: '#d1d5db', dot: '#d1d5db' },
};

export default function ForClientsPage() {
  return (
    <div>

      {/* ── Nav ─────────────────────────────── */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <OctiMark size={28} />
          Octiqa
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/for-specialists" className="btn btn-ghost btn-sm hide-mobile">Специалистам</Link>
          <Link href="/login"  className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-3)' }}>Войти</Link>
          <Link href="/search" className="btn btn-brand btn-sm">Найти</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="hero-land">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-land-eyebrow">
            ✦ Для клиентов — бесплатно
          </div>
          <h1 className="hero-land-title">
            Найдите нужного<br />специалиста за минуты
          </h1>
          <p className="hero-land-sub">
            Смотрите профили, проверяйте занятость и связывайтесь напрямую — без посредников, по всему Казахстану.
          </p>
          <div className="hero-land-actions">
            <Link href="/search" className="btn btn-white btn-lg">Найти специалиста</Link>
          </div>
          <p className="hero-land-note">Поиск, просмотр профилей и контакты — всегда бесплатно</p>
        </div>
      </section>

      {/* ── Steps ───────────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Как найти специалиста</p>
            <h2 className="land-title">Четыре шага</h2>
            <p className="land-sub">От поиска до первого сообщения — быстро и без лишних действий.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {STEPS.map((st, i) => (
              <div key={st.n} className={`step-card slide-up slide-up-${(i % 3) + 1}`}>
                <div className="step-num">{st.n}</div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{st.icon}</div>
                <h3 className="step-title">{st.title}</h3>
                <p className="step-desc">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Calendar section ────────────────── */}
      <section className="land-section">
        <div className="container">
          <div className="cal-section-grid" style={{ display: 'grid', gap: 48, gridTemplateColumns: '1fr', alignItems: 'center', maxWidth: 960, margin: '0 auto' }}>
            <div style={{ order: 0 }}>
              <div className="cal-demo-wrap">
                <div className="cal-demo-header">
                  <span className="cal-demo-month">Июнь 2026</span>
                  <div className="cal-demo-nav">
                    <div className="cal-demo-nav-btn">‹</div>
                    <div className="cal-demo-nav-btn">›</div>
                  </div>
                </div>
                <div className="cal-demo-grid">
                  {['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].map(d => <div key={d} className="cal-demo-dh">{d}</div>)}
                  {CAL_DAYS.map((cell, i) => {
                    if (!cell) return <div key={`e-${i}`} />;
                    const st = CAL_STYLE[cell.s] ?? CAL_STYLE.free!;
                    return (
                      <div key={cell.d} className="cal-demo-cell" style={{ background: st!.bg, color: st!.color }}>
                        {cell.d}
                        {cell.s !== 'past' && cell.s !== 'free' && (
                          <span className="cal-demo-dot" style={{ background: st!.dot }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div style={{ order: 1 }}>
              <p className="land-eyebrow">Занятость без звонков</p>
              <h2 className="land-title" style={{ textAlign: 'left', maxWidth: 440 }}>
                Проверьте занятость<br />прямо сейчас
              </h2>
              <p className="land-sub" style={{ textAlign: 'left', margin: '0 0 20px' }}>
                На каждом профиле — цветной календарь. Сразу понятно, когда специалист свободен. Не нужно ждать ответа.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { dot: '#22c55e', text: 'Зелёный — свободен' },
                  { dot: '#ef4444', text: 'Красный — занят' },
                  { dot: '#f59e0b', text: 'Жёлтый — под вопросом' },
                  { dot: '#f97316', text: 'Оранжевый — частично занят' },
                ].map(item => (
                  <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: 'var(--ink-2)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: item.dot, flexShrink: 0 }} />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style>{`@media(min-width:768px){.cal-section-grid{grid-template-columns:1fr 1fr !important}}`}</style>
      </section>

      {/* ── Categories ──────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Категории</p>
            <h2 className="land-title">Кого ищёте?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {CATEGORIES.map(c => (
              <Link
                key={c.label}
                href={`/search?category=${encodeURIComponent(c.q)}`}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '20px 12px', background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 14, textDecoration: 'none', color: 'var(--ink)',
                  fontWeight: 600, fontSize: 14, transition: 'box-shadow .15s, transform .15s',
                }}
              >
                <span style={{ fontSize: 28 }}>{c.icon}</span>
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why free ────────────────────────── */}
      <section className="land-section">
        <div className="container" style={{ maxWidth: 720, textAlign: 'center' }}>
          <p className="land-eyebrow">Для вас</p>
          <h2 className="land-title">Всё бесплатно для клиентов</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 32, textAlign: 'left' }}>
            {[
              { icon: '🔍', text: 'Поиск по всем специалистам' },
              { icon: '📅', text: 'Просмотр календарей занятости' },
              { icon: '📱', text: 'Открытие контактов' },
              { icon: '🚫', text: 'Без регистрации' },
            ].map(f => (
              <div key={f.text} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────── */}
      <section className="cta-band">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="cta-band-title">Начните прямо сейчас</h2>
          <p className="cta-band-sub">Поиск специалиста — бесплатно и без регистрации.</p>
          <Link href="/search" className="btn btn-white btn-lg">Найти специалиста</Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="footer-land">
        <div className="footer-land-inner">
          <div className="footer-land-top">
            <a href="/" className="logo-mark logo-mark-inv" style={{ fontSize: 16 }}>
              <OctiMark size={24} />
              Octiqa
            </a>
            <div className="footer-land-links">
              <Link href="/search"          className="footer-land-link">Поиск</Link>
              <Link href="/for-specialists" className="footer-land-link">Специалистам</Link>
              <Link href="/login"           className="footer-land-link">Войти</Link>
            </div>
          </div>
          <div className="footer-land-bottom">
            <span className="footer-land-copy">© 2026 Octiqa — Связываем клиента и специалиста</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
