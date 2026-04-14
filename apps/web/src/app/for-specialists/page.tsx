import type { Metadata } from 'next';
import Link from 'next/link';
import { OctiMark } from '@/components/OctiLogo';

export const metadata: Metadata = {
  title: 'Специалистам — Octiqa в Telegram Mini App',
  description: 'Создайте профиль, ведите календарь и принимайте клиентов через Telegram Mini App. Профиль автоматически появляется на сайте. 30 дней бесплатно.',
};

const TG_APP = process.env['NEXT_PUBLIC_TG_APP_URL'] ?? 'https://t.me/OctiqaBot';

const STEPS = [
  {
    n: '1', icon: '📱',
    title: 'Откройте Mini App',
    desc: 'Запустите Octiqa в Telegram. Никаких новых приложений — всё в мессенджере.',
  },
  {
    n: '2', icon: '👤',
    title: 'Создайте профиль',
    desc: 'Добавьте фото, описание, категорию и цены. Занимает 5 минут.',
  },
  {
    n: '3', icon: '📅',
    title: 'Ведите календарь',
    desc: 'Отмечайте занятые дни прямо в Mini App или командами боту.',
  },
  {
    n: '4', icon: '🌐',
    title: 'Профиль на сайте',
    desc: 'Ваш профиль и календарь автоматически синхронизируются с сайтом. Клиенты находят вас в поиске.',
  },
];

const FEATURES = [
  { icon: '🪪', color: '#7c3aed', bg: '#f5f3ff', title: 'Публичный профиль',    desc: 'Фото, описание, услуги, цены и контакты. Создаётся в Mini App — виден всем клиентам на сайте.' },
  { icon: '📅', color: '#059669', bg: '#f0fdf4', title: 'Календарь занятости',  desc: 'Клиент сразу видит свободные и занятые дни — без переписки и звонков.' },
  { icon: '🤖', color: '#0ea5e9', bg: '#f0f9ff', title: 'Telegram-бот',         desc: 'Отметить занятость одной командой. Бот работает вместе с Mini App.' },
  { icon: '🔔', color: '#d97706', bg: '#fffbeb', title: 'Напоминания',          desc: 'Бот напоминает о записях заранее. Не пропустите ни одно мероприятие.' },
  { icon: '📊', color: '#0284c7', bg: '#eff6ff', title: 'Аналитика',            desc: 'Просмотры профиля, открытия контактов и конверсия — в вашем кабинете.' },
  { icon: '🔄', color: '#6d28d9', bg: '#f5f3ff', title: 'Авто-синхронизация',   desc: 'Меняете данные в Mini App — сайт обновляется сразу. Клиент всегда видит актуальное.' },
];

const TG_COMMANDS = [
  { cmd: 'занято 22.06 14 20', desc: 'Заблокировать время (дата, с/до часов)' },
  { cmd: 'свободно 22.06',     desc: 'Освободить весь день' },
  { cmd: 'календарь',          desc: 'Посмотреть занятость текущего месяца' },
  { cmd: 'клиент 22.06',       desc: 'Добавить данные клиента на дату' },
];

const PRICE_FEATURES = [
  'Публичный профиль с фото и услугами',
  'Визуальный календарь занятости',
  'Управление через Telegram Mini App',
  'Telegram-бот — быстрые команды',
  'Аналитика просмотров и конверсии',
  'До 3 Telegram аккаунтов',
  '30 дней бесплатно',
];

export default function ForSpecialistsPage() {
  return (
    <div>

      {/* ── Nav ─────────────────────────────── */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <OctiMark size={28} />
          <span className="hide-mobile">Octiqa</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link href="/search" className="btn btn-ghost btn-sm hide-mobile">Найти</Link>
          <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-sm">
            <span className="hide-mobile">Открыть в </span>Telegram
          </a>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="hero-land">
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div className="hero-land-eyebrow">✦ Для специалистов</div>
          <h1 className="hero-land-title">
            Ваш профиль — в Telegram.<br />Клиенты — на сайте.
          </h1>
          <p className="hero-land-sub">
            Создайте профиль и ведите календарь через Telegram Mini App.
            Данные автоматически синхронизируются с сайтом — клиенты видят вас в поиске.
          </p>
          <div className="hero-land-actions">
            <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-white btn-lg">
              Стать специалистом
            </a>
            <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-inv btn-lg">
              Уже есть аккаунт →
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────── */}
      <section className="land-section" style={{ background: 'var(--bg)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Как это работает</p>
            <h2 className="land-title">Четыре шага до первого клиента</h2>
            <p className="land-sub">Всё управление — в Telegram. Клиентский профиль — на сайте автоматически.</p>
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

      {/* ── Mini App Screen Mocks ────────────── */}
      <section className="land-section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="land-header">
            <p className="land-eyebrow">Интерфейс</p>
            <h2 className="land-title">Всё — в одном Mini App</h2>
            <p className="land-sub">Профиль, календарь, аналитика и меню — в привычном Telegram.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, maxWidth: 820, margin: '0 auto' }}>
            <MockScreen label="Профиль" icon="👤" lines={['Иван Тамада', 'Алматы · тамада', '★★★★★  4.9', 'от 60 000 ₸']} accent="#7c3aed" />
            <MockScreen label="Календарь" icon="📅" lines={['Июнь 2026', '🟢 Свободен: 5, 6, 13', '🔴 Занят: 14, 21', '🟡 28 — под вопросом']} accent="#059669" />
            <MockScreen label="Аналитика" icon="📊" lines={['Просмотры: 142', 'Контакты: 28', 'Конверсия: 19.7%', '↑ +12% за неделю']} accent="#0284c7" />
            <MockScreen label="Меню" icon="⚙️" lines={['Редактировать профиль', 'Управление фото', 'Настройки бота', 'Подписка']} accent="#6d28d9" />
          </div>
          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--ink-4)', marginTop: 20 }}>
            * предварительный вид экранов Mini App
          </p>
        </div>
      </section>

      {/* ── Sync explanation ────────────────── */}
      <section className="land-section-dark">
        <div className="container">
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
            <p className="land-eyebrow land-eyebrow-inv">Синхронизация</p>
            <h2 className="land-title" style={{ color: '#fff' }}>
              Одно изменение — везде актуально
            </h2>
            <p className="land-sub land-sub-inv" style={{ margin: '0 auto 48px' }}>
              Вы управляете профилем в Telegram Mini App. Сайт обновляется автоматически. Клиент всегда видит актуальные фото, цены и занятость.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, flexWrap: 'wrap' }}>
              <SyncNode icon="📱" label="Telegram Mini App" sub="вы управляете здесь" color="#a78bfa" />
              <SyncArrow />
              <SyncNode icon="🔄" label="Синхронизация" sub="автоматически" color="#34d399" small />
              <SyncArrow />
              <SyncNode icon="🌐" label="Сайт Octiqa" sub="клиенты видят здесь" color="#60a5fa" />
            </div>
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

      {/* ── Telegram Bot section ────────────── */}
      <section className="land-section-dark">
        <div className="container">
          <div className="tg-grid">
            <div>
              <p className="land-eyebrow land-eyebrow-inv">Telegram-бот</p>
              <h2 className="land-title" style={{ color: '#fff', textAlign: 'left', maxWidth: 420 }}>
                Занятость одной командой
              </h2>
              <p className="land-sub land-sub-inv" style={{ textAlign: 'left', margin: '0 0 28px' }}>
                Не нужно открывать Mini App каждый раз. Бот принимает команды прямо в чате и мгновенно обновляет календарь на сайте.
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
                <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-white btn-lg">
                  Открыть в Telegram
                </a>
              </div>
            </div>
            <div>
              <div className="tg-chat">
                <div className="tg-msg tg-msg-in">
                  <span className="tg-time">14:20</span>
                  <div className="tg-bubble tg-bubble-in">занято 22.06 14 20</div>
                </div>
                <div className="tg-msg tg-msg-out">
                  <div className="tg-bubble tg-bubble-out">✅ Запись добавлена<br />22 июня, 14:00–20:00<br />Статус: занято</div>
                  <span className="tg-time">14:20</span>
                </div>
                <div className="tg-msg tg-msg-in">
                  <span className="tg-time">14:22</span>
                  <div className="tg-bubble tg-bubble-in">календарь</div>
                </div>
                <div className="tg-msg tg-msg-out">
                  <div className="tg-bubble tg-bubble-out">📅 Июнь 2026<br /><br />🔴 Занято: 14, 22<br />🟡 Под вопросом: 28<br />🟢 Остальные — свободны<br /><br />Обновлено на сайте ✓</div>
                  <span className="tg-time">14:22</span>
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
            <p className="land-sub">Первые 30 дней — бесплатно. Платите только за активный профиль.</p>
          </div>
          <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <div className="price-card price-card-featured">
              <span className="price-tag">Для специалистов</span>
              <h3 className="price-name">Профиль</h3>
              <div className="price-amount"><sup>от </sup>9 900<span className="price-period">₸/мес</span></div>
              <p className="price-desc">Публичный профиль, календарь и бот. Управление через Telegram Mini App. Оплата после пробного периода.</p>
              <ul className="price-features">
                {PRICE_FEATURES.map(f => <li key={f}>{f}</li>)}
              </ul>
              <div className="price-cta">
                <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-brand btn-full">
                  Начать 30 дней бесплатно
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA band ────────────────────────── */}
      <section className="cta-band">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 className="cta-band-title">Начните прямо сейчас</h2>
          <p className="cta-band-sub">Профиль — через Telegram. Клиенты — на сайте.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-white btn-lg">
              Стать специалистом
            </a>
            <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="btn btn-ghost-inv btn-lg">
              Открыть в Telegram
            </a>
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
              <Link href="/search"          className="footer-land-link">Поиск</Link>
              <Link href="/for-specialists" className="footer-land-link">Специалистам</Link>
              <a href={TG_APP} target="_blank" rel="noopener noreferrer" className="footer-land-link">Открыть в Telegram</a>
              <a href="mailto:octiqa.info@gmail.com" className="footer-land-link">octiqa.info@gmail.com</a>
            </div>
          </div>
          <div className="footer-land-bottom">
            <span className="footer-land-copy">© 2026 Octiqa — Находи специалистов в Казахстане</span>
            <span style={{ fontSize: 13 }}>Алматы · Астана · Шымкент и ещё</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

/* ── Sub-components ──────────────────────────────── */

function MockScreen({ label, icon, lines, accent }: {
  label: string;
  icon: string;
  lines: string[];
  accent: string;
}) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--border)',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      fontFamily: 'var(--font)',
    }}>
      {/* Phone notch bar */}
      <div style={{
        background: accent,
        padding: '10px 14px 8px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.6)' }}>Octiqa</span>
      </div>
      {/* Screen content */}
      <div style={{ padding: '14px 14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {lines.map((line, i) => (
          <div key={i} style={{
            fontSize: i === 0 ? 14 : 12,
            fontWeight: i === 0 ? 700 : 400,
            color: i === 0 ? 'var(--ink)' : 'var(--ink-3)',
            background: i === 0 ? 'transparent' : 'var(--surface-3)',
            borderRadius: i === 0 ? 0 : 6,
            padding: i === 0 ? '0' : '5px 8px',
            lineHeight: 1.4,
          }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

function SyncNode({ icon, label, sub, color, small }: {
  icon: string;
  label: string;
  sub: string;
  color: string;
  small?: boolean;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 8,
      padding: small ? '16px 20px' : '20px 28px',
      background: 'rgba(255,255,255,.07)',
      border: `1.5px solid ${color}40`,
      borderRadius: 16,
      minWidth: small ? 110 : 140,
      margin: 4,
    }}>
      <div style={{
        width: small ? 44 : 52,
        height: small ? 44 : 52,
        background: `${color}22`,
        border: `2px solid ${color}66`,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: small ? 20 : 24,
      }}>
        {icon}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: small ? 12 : 14, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.45)', marginTop: 3 }}>{sub}</div>
      </div>
    </div>
  );
}

function SyncArrow() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px',
      color: 'rgba(255,255,255,.25)',
      fontSize: 22,
      flexShrink: 0,
    }}>
      →
    </div>
  );
}
