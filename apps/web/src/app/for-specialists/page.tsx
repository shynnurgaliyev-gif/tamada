import type { Metadata } from 'next';
import Link from 'next/link';
import { OctiMark } from '@/components/OctiLogo';

export const metadata: Metadata = {
  title: 'Специалистам — профиль, календарь и Telegram-бот',
  description: 'Создайте публичный профиль, ведите календарь занятости и управляйте расписанием через Telegram. 30 дней бесплатно.',
};

const STEPS = [
  {
    n: '1', icon: '👤',
    title: 'Создайте профиль',
    desc: 'Добавьте фото, описание, список услуг и цены. Ваш профиль станет публичным и доступным для клиентов.',
  },
  {
    n: '2', icon: '📅',
    title: 'Ведите календарь',
    desc: 'Отмечайте занятые и свободные дни. Клиенты видят вашу занятость сразу — без звонков и переписки.',
  },
  {
    n: '3', icon: '✈️',
    title: 'Подключите Telegram',
    desc: 'Управляйте расписанием прямо из чата. Добавить запись или посмотреть календарь — одна команда.',
  },
  {
    n: '4', icon: '💼',
    title: 'Принимайте клиентов',
    desc: 'Клиенты сами вас находят и пишут напрямую. Вы работаете — Octiqa занимается видимостью.',
  },
];

const FEATURES = [
  { icon: '🪪', color: '#7c3aed', bg: '#f5f3ff', title: 'Публичный профиль',     desc: 'Фото, описание, услуги, цены, контакты — всё в одном месте. Ваша витрина 24/7.' },
  { icon: '📅', color: '#059669', bg: '#f0fdf4', title: 'Визуальный календарь',  desc: 'Цветной календарь занятости. Клиент сразу видит, когда вы свободны.' },
  { icon: '🤖', color: '#0ea5e9', bg: '#f0f9ff', title: 'Telegram-бот',          desc: 'Управляйте расписанием командами прямо в Telegram. Быстро и без открытия сайта.' },
  { icon: '🔔', color: '#d97706', bg: '#fffbeb', title: 'Напоминания',           desc: 'Бот напоминает о записях заранее. Не забудете ни один ивент.' },
  { icon: '📊', color: '#0284c7', bg: '#eff6ff', title: 'Аналитика',             desc: 'Просмотры профиля, открытия контактов, конверсия — в вашем кабинете.' },
  { icon: '🌍', color: '#e11d48', bg: '#fff1f2', title: 'Весь Казахстан',        desc: 'Алматы, Астана и 10+ городов. Ваш профиль виден клиентам по всей стране.' },
];

const TG_COMMANDS = [
  { cmd: 'календарь',           desc: 'Показать занятость текущего месяца' },
  { cmd: 'занято 15.06 13 18',  desc: 'Заблокировать время (дата, с/до часов)' },
  { cmd: 'свободно 15.06',      desc: 'Освободить весь день' },
  { cmd: 'клиент 15.06',        desc: 'Добавить данные клиента на дату' },
];

const PRICE_FEATURES_PRO = [
  'Публичный профиль с фото',
  'Визуальный календарь занятости',
  'Управление через Telegram-бот',
  'До 3 Telegram аккаунтов',
  'Аналитика просмотров',
  '30 дней бесплатно',
];

export default function ForSpecialistsPage() {
  return (
    <div>

      {/* ── Nav ─────────────────────────────── */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <OctiMark size={28} />
          Octiqa
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/search" className="btn btn-ghost btn-sm hide-mobile">Найти</Link>
          <Link href="/login"  className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-3)' }}>Войти</Link>
          <Link href="/signup" className="btn btn-brand btn-sm">Регистрация</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="hero-land">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="hero-land-eyebrow">
            ✦ Для специалистов
          </div>
          <h1 className="hero-land-title">
            Профиль, который<br />работает на вас
          </h1>
          <p className="hero-land-sub">
            Создайте профиль, ведите календарь занятости и принимайте клиентов напрямую. Управление через Telegram — без открытия сайта.
          </p>
          <div className="hero-land-actions">
            <Link href="/signup" className="btn btn-white btn-lg">Создать профиль</Link>
            <Link href="/login"  className="btn btn-ghost-inv btn-lg">Уже есть аккаунт →</Link>
          </div>
        </div>
      </section>

      {/* ── Steps ───────────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Как начать</p>
            <h2 className="land-title">Четыре шага до первого клиента</h2>
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

      {/* ── Features ────────────────────────── */}
      <section className="land-section">
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Возможности</p>
            <h2 className="land-title">Всё для вашей работы</h2>
          </div>
          <div className="feature-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} className={`feature-card slide-up slide-up-${(i % 3) + 1}`}>
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}>{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Telegram section ────────────────── */}
      <section className="land-section-dark">
        <div className="container">
          <div className="tg-grid">
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

      {/* ── Pricing ─────────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Тарифы</p>
            <h2 className="land-title">Прозрачно и честно</h2>
            <p className="land-sub">Платите только за активный профиль. Первые 30 дней — бесплатно.</p>
          </div>
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div className="price-card price-card-featured">
              <span className="price-tag">Для специалистов</span>
              <h3 className="price-name">Профиль</h3>
              <div className="price-amount"><sup>от </sup>9 900<span className="price-period">₸/мес</span></div>
              <p className="price-desc">Публичный профиль с календарём и Telegram-управлением. Оплата только после пробного периода.</p>
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

      {/* ── CTA ─────────────────────────────── */}
      <section className="cta-band">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="cta-band-title">Начните с Octiqa сегодня</h2>
          <p className="cta-band-sub">Создайте профиль и начните принимать клиентов.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/signup" className="btn btn-white btn-lg">Создать профиль</Link>
            <Link href="/login"  className="btn btn-ghost-inv btn-lg">Войти</Link>
          </div>
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
              <Link href="/search"  className="footer-land-link">Поиск</Link>
              <Link href="/login"   className="footer-land-link">Войти</Link>
              <Link href="/signup"  className="footer-land-link">Регистрация</Link>
              <a href="mailto:octiqa.info@gmail.com" className="footer-land-link">octiqa.info@gmail.com</a>
            </div>
          </div>
          <div className="footer-land-bottom">
            <span className="footer-land-copy">© 2026 Octiqa — Управляй занятостью. Находи клиентов.</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
