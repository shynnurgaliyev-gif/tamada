import Link from 'next/link';
import { OctiMark } from '@/components/OctiLogo';
import { TELEGRAM_DASHBOARD_LINK } from '@/lib/telegramLinks';

const BRAND  = 'Octiqa';

const CATEGORIES = [
  { icon: '🎤', label: 'Тамада',    q: 'тамада',    grad: 'linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)' },
  { icon: '📸', label: 'Фотограф', q: 'фотограф',  grad: 'linear-gradient(135deg,#0369a1 0%,#0284c7 100%)' },
  { icon: '🎬', label: 'Видеограф',q: 'видеограф', grad: 'linear-gradient(135deg,#1e1b4b 0%,#4338ca 100%)' },
  { icon: '🎧', label: 'Диджей',   q: 'диджей',    grad: 'linear-gradient(135deg,#9333ea 0%,#db2777 100%)' },
  { icon: '🎵', label: 'Музыкант', q: 'музыкант',  grad: 'linear-gradient(135deg,#b45309 0%,#d97706 100%)' },
  { icon: '💃', label: 'Танцор',   q: 'танцор',    grad: 'linear-gradient(135deg,#e11d48 0%,#9d174d 100%)' },
  { icon: '💄', label: 'Визажист', q: 'визажист',  grad: 'linear-gradient(135deg,#db2777 0%,#be185d 100%)' },
  { icon: '🌸', label: 'Флорист',  q: 'флорист',   grad: 'linear-gradient(135deg,#059669 0%,#0d9488 100%)' },
  { icon: '🎪', label: 'Аниматор',q: 'аниматор',   grad: 'linear-gradient(135deg,#ea580c 0%,#d97706 100%)' },
  { icon: '✨', label: 'Шоу',      q: 'шоу',        grad: 'linear-gradient(135deg,#ca8a04 0%,#b45309 100%)' },
];

const STEPS = [
  {
    n: '1', icon: '🔍',
    title: 'Найдите специалиста',
    desc: 'Фильтры по городу, дате и категории. Тамада, фотограф, диджей — в любом городе Казахстана.',
  },
  {
    n: '2', icon: '📋',
    title: 'Изучите профиль',
    desc: 'Фото, описание, услуги и цены — всё на одной странице. Оцените специалиста до того, как напишете.',
  },
  {
    n: '3', icon: '📅',
    title: 'Проверьте занятость',
    desc: 'Цветной календарь прямо на профиле. Сразу видно свободные и занятые даты — без переписки.',
  },
  {
    n: '4', icon: '💬',
    title: 'Свяжитесь напрямую',
    desc: 'WhatsApp, Telegram, Instagram — один клик и вы уже пишете специалисту. Никаких посредников.',
  },
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

export default function HomePage() {
  return (
    <div>

      {/* ── Nav ─────────────────────────────── */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <OctiMark size={32} />
          <span className="hide-mobile">{BRAND}</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/search"          className="btn btn-ghost btn-sm hide-mobile">Найти</Link>
          <Link href="/for-specialists" className="btn btn-ghost btn-sm hide-mobile">Специалистам</Link>
          <a href={TELEGRAM_DASHBOARD_LINK} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-sm">
            <span className="hide-mobile">Открыть в </span>Telegram
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="hero-land">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-land-eyebrow">
            ✦ Octiqa — найди специалиста на мероприятие
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
        </div>
      </section>

      {/* ── Stats band ──────────────────────── */}
      <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ padding: '18px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 32 }}>
            {[
              { n: '150+', label: 'специалистов' },
              { n: '10+',  label: 'городов' },
              { n: '0',    label: 'комиссий' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--brand)', lineHeight: 1 }}>{s.n}</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Как это работает</p>
            <h2 className="land-title">Четыре шага до результата</h2>
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

      {/* ── Categories ──────────────────────── */}
      <section className="land-section">
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Категории</p>
            <h2 className="land-title">Специалисты на любое мероприятие</h2>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map(c => (
              <Link
                key={c.label}
                href={`/search?category=${encodeURIComponent(c.q)}`}
                className="cat-card"
                style={{ background: c.grad }}
              >
                <span className="cat-card-icon">{c.icon}</span>
                <span className="cat-card-label">{c.label}</span>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/search" className="btn btn-outline">Смотреть всех специалистов →</Link>
          </div>
        </div>
      </section>

      {/* ── Calendar section ────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="cal-section-grid" style={{ display: 'grid', gap: 48, gridTemplateColumns: '1fr', alignItems: 'center', maxWidth: 960, margin: '0 auto' }}>
            <div style={{ order: 0 }}>
              <CalendarDemo />
            </div>
            <div style={{ order: 1 }}>
              <p className="land-eyebrow">Занятость без звонков</p>
              <h2 className="land-title" style={{ textAlign: 'left', maxWidth: 440 }}>
                Проверьте занятость<br />прямо сейчас
              </h2>
              <p className="land-sub" style={{ textAlign: 'left', margin: '0 0 20px' }}>
                На профиле каждого специалиста — живой цветной календарь. Сразу видно свободные и занятые дни. Не нужно ждать ответа.
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

      {/* ── CTA band ────────────────────────── */}
      <section className="cta-band">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="cta-band-title">Начните прямо сейчас</h2>
          <p className="cta-band-sub">Поиск специалиста — без регистрации.</p>
          <Link href="/search" className="btn btn-white btn-lg">Найти специалиста</Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="footer-land">
        <div className="footer-land-inner">
          <div className="footer-land-top">
            <a href="/" className="logo-mark logo-mark-inv" style={{ fontSize: 18 }}>
              <OctiMark size={28} />
              {BRAND}
            </a>
            <div className="footer-land-links">
              <Link href="/search"          className="footer-land-link">Поиск</Link>
              <Link href="/for-specialists" className="footer-land-link">Специалистам</Link>
              <a href={TELEGRAM_DASHBOARD_LINK} target="_blank" rel="noopener noreferrer" className="footer-land-link">Открыть в Telegram</a>
              <a href="mailto:octiqa.info@gmail.com" className="footer-land-link">octiqa.info@gmail.com</a>
            </div>
          </div>
          <div className="footer-land-bottom">
            <span className="footer-land-copy">© 2026 {BRAND} — Находи специалистов в Казахстане</span>
            <span style={{ fontSize: 13 }}>Алматы · Астана · Шымкент и ещё</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

function CalendarDemo() {
  const days = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  return (
    <div className="cal-demo-wrap">
      <div className="cal-demo-header">
        <span className="cal-demo-month">Июнь 2026</span>
        <div className="cal-demo-nav">
          <div className="cal-demo-nav-btn">‹</div>
          <div className="cal-demo-nav-btn">›</div>
        </div>
      </div>
      <div className="cal-demo-grid">
        {days.map(d => <div key={d} className="cal-demo-dh">{d}</div>)}
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
  );
}
