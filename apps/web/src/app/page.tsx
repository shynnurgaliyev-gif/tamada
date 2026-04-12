import Link from 'next/link';

const BRAND = 'BRAND_NAME';

/* ── Data ──────────────────────────────────── */
const STATS = [
  { num: '500+', label: 'исполнителей' },
  { num: '12',   label: 'городов КЗ' },
  { num: '30',   label: 'дней бесплатно' },
];

const CATEGORIES = [
  { icon: '🎤', label: 'Тамада',    q: 'тамада' },
  { icon: '📸', label: 'Фотограф', q: 'фотограф' },
  { icon: '🎬', label: 'Видеограф',q: 'видеограф' },
  { icon: '🎧', label: 'Диджей',   q: 'диджей' },
  { icon: '🎵', label: 'Музыкант', q: 'музыкант' },
  { icon: '💃', label: 'Танцор',   q: 'танцор' },
  { icon: '💄', label: 'Визажист', q: 'визажист' },
  { icon: '🌸', label: 'Флорист',  q: 'флорист' },
  { icon: '🎪', label: 'Аниматор',q: 'аниматор' },
  { icon: '✨', label: 'Шоу',      q: 'шоу' },
];

const STEPS = [
  {
    n: '1', icon: '🔍',
    title: 'Найдите исполнителя',
    desc: 'Умный поиск по городу, дате и категории. Можно написать обычным текстом — AI разберётся.',
  },
  {
    n: '2', icon: '📅',
    title: 'Проверьте занятость',
    desc: 'Прямо на профиле — цветной календарь с занятыми и свободными датами. Без переписки.',
  },
  {
    n: '3', icon: '💬',
    title: 'Свяжитесь напрямую',
    desc: 'Все контакты открыты: WhatsApp, Telegram, Instagram. Никаких посредников.',
  },
];

const FEATURES = [
  {
    icon: '⚡', title: 'Быстрый поиск',
    desc: 'Фильтры по цене, дате, городу. Умный AI-поиск понимает обычные фразы без формул.',
  },
  {
    icon: '📅', title: 'Живой календарь',
    desc: 'Занятость исполнителя видна сразу. Не нужно ждать ответа — всё на странице профиля.',
  },
  {
    icon: '🔗', title: 'Прямой контакт',
    desc: 'WhatsApp, Telegram, Instagram — всё в одном месте. Нажал, написал, договорился.',
  },
  {
    icon: '🔔', title: 'Telegram-бот',
    desc: 'Исполнители управляют расписанием прямо в Telegram. Команды за секунды.',
  },
  {
    icon: '🌍', title: 'Весь Казахстан',
    desc: 'Алматы, Астана и 10+ городов. Найдите специалиста рядом или по всей стране.',
  },
  {
    icon: '🆓', title: 'Бесплатно для клиентов',
    desc: 'Просмотр профилей, поиск и контакты — бесплатно. Платят только исполнители.',
  },
];

const TG_COMMANDS = [
  { cmd: 'календарь',           desc: 'Показать занятость текущего месяца' },
  { cmd: 'занято 15.06 13 18',  desc: 'Заблокировать время (дата, с/до часов)' },
  { cmd: 'свободно 15.06',      desc: 'Освободить весь день' },
  { cmd: 'клиент 15.06',        desc: 'Добавить данные клиента на дату' },
];

const PRICE_FEATURES_FREE = [
  'Просмотр всех профилей',
  'Проверка занятости по календарю',
  'Прямые контакты исполнителей',
  'Умный AI-поиск',
  'Без регистрации',
];
const PRICE_FEATURES_PRO = [
  'Публичный профиль с фото',
  'Визуальный календарь занятости',
  'Управление через Telegram-бот',
  'До 3 Telegram аккаунтов',
  '30 дней бесплатно',
];

/* ── Calendar mock data ─────────────────── */
const CAL_DAYS = [
  null, null,
  { d: 1,  s: 'free' },
  { d: 2,  s: 'free' },
  { d: 3,  s: 'busy' },
  { d: 4,  s: 'busy' },
  { d: 5,  s: 'free' },
  { d: 6,  s: 'past' },
  { d: 7,  s: 'past' },
  { d: 8,  s: 'past' },
  { d: 9,  s: 'past' },
  { d: 10, s: 'past' },
  { d: 11, s: 'past' },
  { d: 12, s: 'past' },
  { d: 13, s: 'free' },
  { d: 14, s: 'free' },
  { d: 15, s: 'tentative' },
  { d: 16, s: 'busy' },
  { d: 17, s: 'busy' },
  { d: 18, s: 'partial' },
  { d: 19, s: 'free' },
  { d: 20, s: 'free' },
  { d: 21, s: 'free' },
  { d: 22, s: 'busy' },
  { d: 23, s: 'busy' },
  { d: 24, s: 'free' },
  { d: 25, s: 'free' },
  { d: 26, s: 'free' },
  { d: 27, s: 'free' },
  { d: 28, s: 'tentative' },
  { d: 29, s: 'free' },
  { d: 30, s: 'free' },
];

const CAL_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  free:     { bg: '#dcfce7', color: '#166534', dot: '#22c55e' },
  busy:     { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' },
  partial:  { bg: '#ffedd5', color: '#9a3412', dot: '#f97316' },
  tentative:{ bg: '#fef9c3', color: '#92400e', dot: '#f59e0b' },
  past:     { bg: '#f3f4f6', color: '#d1d5db', dot: '#d1d5db' },
};

/* ── Component ──────────────────────────── */
export default function HomePage() {
  return (
    <div>

      {/* ── Nav ──────────────────────────── */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <span className="logo-mark-icon">✦</span>
          {BRAND}
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/search" className="btn btn-ghost btn-sm hide-mobile">Найти</Link>
          <Link href="/login"  className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-3)' }}>Войти</Link>
          <Link href="/signup" className="btn btn-brand btn-sm">Регистрация</Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────── */}
      <section className="hero-land">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-land-eyebrow">
            ✦ Платформа для организаторов мероприятий
          </div>
          <h1 className="hero-land-title">
            Найдите исполнителя —<br />без лишних шагов
          </h1>
          <p className="hero-land-sub">
            Тамады, фотографы, диджеи и другие профессионалы по всему Казахстану.
            Смотрите занятость, связывайтесь напрямую.
          </p>
          <div className="hero-land-actions">
            <Link href="/search" className="btn btn-white btn-lg">
              Найти исполнителя
            </Link>
            <Link href="/signup" className="btn btn-ghost-inv btn-lg">
              Я исполнитель →
            </Link>
          </div>
          <p className="hero-land-note">Бесплатно для клиентов · 30 дней триала для исполнителей</p>
        </div>
      </section>

      {/* ── Stats strip ──────────────────── */}
      <div className="stats-strip">
        <div className="stats-inner">
          {STATS.map(s => (
            <div key={s.label} className="stat-item">
              <span className="stat-num">{s.num}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── How it works ─────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Как это работает</p>
            <h2 className="land-title">Три шага до вашего мероприятия</h2>
            <p className="land-sub">Никаких посредников и лишних звонков — только вы и нужный специалист.</p>
          </div>
          <div className="steps-grid">
            {STEPS.map((st, i) => (
              <div key={st.n} className={`step-card slide-up slide-up-${i + 1}`}>
                <div className="step-num">{st.n}</div>
                <div style={{ fontSize: 28, marginBottom: 10 }}>{st.icon}</div>
                <h3 className="step-title">{st.title}</h3>
                <p className="step-desc">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────── */}
      <section className="land-section">
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Категории</p>
            <h2 className="land-title">Любой специалист для вашего события</h2>
          </div>
          <div className="cat-chips">
            {CATEGORIES.map(c => (
              <Link
                key={c.label}
                href={`/search?category=${encodeURIComponent(c.q)}`}
                className="cat-chip"
              >
                <span className="cat-chip-icon">{c.icon}</span>
                {c.label}
              </Link>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/search" className="btn btn-outline">Смотреть всех исполнителей →</Link>
          </div>
        </div>
      </section>

      {/* ── Calendar demo ────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="cal-section-grid" style={{ display: 'grid', gap: 48, gridTemplateColumns: '1fr', alignItems: 'center', maxWidth: 960, margin: '0 auto' }}>
            <div style={{ order: 0 }}>
              <CalendarDemo />
            </div>
            <div style={{ order: 1 }}>
              <p className="land-eyebrow">Визуальный календарь</p>
              <h2 className="land-title" style={{ textAlign: 'left', maxWidth: 440 }}>
                Смотрите занятость<br />без переписки
              </h2>
              <p className="land-sub" style={{ textAlign: 'left', margin: 0 }}>
                На профиле каждого исполнителя — живой цветной календарь.
                Сразу видно занятые и свободные дни. Никакой переписки — просто открываете и видите.
              </p>
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  '🟢 Зелёный — день свободен',
                  '🔴 Красный — день занят',
                  '🟡 Жёлтый — под вопросом',
                  '🟠 Оранжевый — частично занят',
                ].map(item => (
                  <div key={item} style={{ fontSize: 14, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8 }}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <style>{`@media(min-width:768px){.cal-section-grid{grid-template-columns:1fr 1fr !important}}`}</style>
      </section>

      {/* ── Why features ─────────────────── */}
      <section className="land-section">
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Почему удобно</p>
            <h2 className="land-title">Всё что нужно — в одном месте</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feature-card slide-up slide-up-${(i % 3) + 1}`}>
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Telegram section ─────────────── */}
      <section className="land-section-dark">
        <div className="container">
          <div className="tg-grid">
            {/* Text */}
            <div>
              <p className="land-eyebrow land-eyebrow-inv">Telegram-интеграция</p>
              <h2 className="land-title" style={{ color: '#fff', textAlign: 'left', maxWidth: 420 }}>
                Управляйте расписанием прямо в Telegram
              </h2>
              <p className="land-sub land-sub-inv" style={{ textAlign: 'left', margin: '0 0 28px' }}>
                Подключите бота — и управляйте своим календарём командами.
                Быстро, без открытия сайта.
              </p>
              <div className="tg-commands">
                {TG_COMMANDS.map(c => (
                  <div key={c.cmd} className="tg-cmd">
                    <code className="tg-cmd-code">{c.cmd}</code>
                    <span className="tg-cmd-desc">{c.desc}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28 }}>
                <Link href="/signup" className="btn btn-white btn-lg">Подключить Telegram</Link>
              </div>
            </div>
            {/* Chat mockup */}
            <div>
              <div className="tg-chat">
                <div className="tg-msg tg-msg-in">
                  <span className="tg-time">10:01</span>
                  <div className="tg-bubble tg-bubble-in">занято 22.06 14 20</div>
                </div>
                <div className="tg-msg tg-msg-out">
                  <div className="tg-bubble tg-bubble-out">✅ Запись добавлена<br />22 июня, 14:00–20:00<br />Статус: занято</div>
                  <span className="tg-time">10:01</span>
                </div>
                <div className="tg-msg tg-msg-in">
                  <span className="tg-time">10:03</span>
                  <div className="tg-bubble tg-bubble-in">календарь</div>
                </div>
                <div className="tg-msg tg-msg-out">
                  <div className="tg-bubble tg-bubble-out">📅 Июнь 2026<br /><br />🔴 16, 22–23<br />🟡 28<br />🟢 Остальные дни — свободны</div>
                  <span className="tg-time">10:03</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Тарифы</p>
            <h2 className="land-title">Прозрачно и честно</h2>
            <p className="land-sub">Для клиентов — всегда бесплатно. Исполнители платят только за свой профиль.</p>
          </div>
          <div className="pricing-grid">
            {/* Client */}
            <div className="price-card">
              <span className="price-tag">Для клиентов</span>
              <h3 className="price-name">Поиск</h3>
              <div className="price-amount">0 ₸<span className="price-period">навсегда</span></div>
              <p className="price-desc">Найдите идеального исполнителя и свяжитесь напрямую.</p>
              <ul className="price-features">
                {PRICE_FEATURES_FREE.map(f => <li key={f}>{f}</li>)}
              </ul>
              <div className="price-cta">
                <Link href="/search" className="btn btn-outline btn-full">Найти исполнителя</Link>
              </div>
            </div>
            {/* Pro */}
            <div className="price-card price-card-featured">
              <span className="price-tag">Для исполнителей</span>
              <h3 className="price-name">Профиль</h3>
              <div className="price-amount"><sup>от </sup>9 900<span className="price-period">₸/мес</span></div>
              <p className="price-desc">Публичный профиль с календарём и Telegram-управлением.</p>
              <ul className="price-features">
                {PRICE_FEATURES_PRO.map(f => <li key={f}>{f}</li>)}
              </ul>
              <div className="price-cta">
                <Link href="/signup" className="btn btn-brand btn-full">Начать 30 дней бесплатно</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────── */}
      <section className="cta-band">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="cta-band-title">Готовы начать?</h2>
          <p className="cta-band-sub">Зарегистрируйтесь за минуту. Первые 30 дней — бесплатно.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-white btn-lg">Создать профиль</Link>
            <Link href="/search" className="btn btn-ghost-inv btn-lg">Найти исполнителя</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────── */}
      <footer className="footer-land">
        <div className="footer-land-inner">
          <div className="footer-land-top">
            <a href="/" className="logo-mark logo-mark-inv" style={{ fontSize: 18 }}>
              <span className="logo-mark-icon" style={{ width: 28, height: 28, fontSize: 14 }}>✦</span>
              {BRAND}
            </a>
            <div className="footer-land-links">
              <Link href="/search"  className="footer-land-link">Поиск</Link>
              <Link href="/login"   className="footer-land-link">Войти</Link>
              <Link href="/signup"  className="footer-land-link">Регистрация</Link>
              <Link href="/dashboard" className="footer-land-link">Кабинет</Link>
            </div>
          </div>
          <div className="footer-land-bottom">
            <span className="footer-land-copy">© 2025 {BRAND} — Платформа исполнителей Казахстана</span>
            <span style={{ fontSize: 13 }}>Алматы · Астана · Шымкент и ещё</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ── Calendar demo component ─────────────── */
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
          const st = CAL_STYLE[cell.s] ?? CAL_STYLE.free;
          return (
            <div
              key={cell.d}
              className="cal-demo-cell"
              style={{ background: st.bg, color: st.color }}
            >
              {cell.d}
              {cell.s !== 'past' && cell.s !== 'free' && (
                <span className="cal-demo-dot" style={{ background: st.dot }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="cal-demo-legend">
        {[
          { color: '#22c55e', label: 'Свободно' },
          { color: '#ef4444', label: 'Занято' },
          { color: '#f59e0b', label: 'Под вопросом' },
          { color: '#f97316', label: 'Частично' },
        ].map(l => (
          <div key={l.label} className="cal-demo-legend-item">
            <span className="cal-demo-legend-dot" style={{ background: l.color }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
