'use client';
import { useEffect, useState, useRef } from 'react';
import { FaWhatsapp, FaTelegram, FaInstagram, FaYoutube, FaTiktok, FaGlobe, FaPhone, FaLink, FaMapMarkerAlt, FaComments } from 'react-icons/fa';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = {
  id: string; display_name: string; slug: string; bio: string | null;
  city: string | null; region: string | null; is_verified: boolean;
  provider_status: string;
};
type Service = { id: string; category: string; title: string; description: string | null; price_from: string | null; price_to: string | null; currency: string; };
type Photo = { id: string; url: string; is_cover: boolean; };
type Link = { id: string; link_type: string; url: string; label: string | null; };
type DayInfo = { date: string; status: string; count: number };

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const CAL_ST: Record<string, { bg: string; color: string; label: string }> = {
  free:     { bg: '#dcfce7', color: '#166534', label: 'Свободно' },
  busy:     { bg: '#fee2e2', color: '#991b1b', label: 'Занято' },
  partial:  { bg: '#ffedd5', color: '#9a3412', label: 'Частично' },
  tentative:{ bg: '#fef9c3', color: '#92400e', label: 'Под вопросом' },
  past:     { bg: '#f3f4f6', color: '#d1d5db', label: 'Прошлое' },
};

import type { IconType } from 'react-icons';

type LinkCfg = { Icon: IconType; label: string; bg: string; text: string };
const LINK_CFG: Record<string, LinkCfg> = {
  phone:     { Icon: FaPhone,         label: 'Позвонить', bg: 'var(--brand)',  text: '#fff' },
  whatsapp:  { Icon: FaWhatsapp,      label: 'WhatsApp',  bg: '#25D366',       text: '#fff' },
  telegram:  { Icon: FaTelegram,      label: 'Telegram',  bg: '#229ED9',       text: '#fff' },
  instagram: { Icon: FaInstagram,     label: 'Instagram', bg: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', text: '#fff' },
  tiktok:    { Icon: FaTiktok,        label: 'TikTok',    bg: '#010101',       text: '#fff' },
  youtube:   { Icon: FaYoutube,       label: 'YouTube',   bg: '#FF0000',       text: '#fff' },
  website:   { Icon: FaGlobe,         label: 'Сайт',      bg: 'var(--surface-2)', text: 'var(--ink)' },
  two_gis:   { Icon: FaMapMarkerAlt,  label: '2GIS',      bg: 'var(--surface-2)', text: 'var(--ink)' },
  map:       { Icon: FaMapMarkerAlt,  label: 'Карта',     bg: 'var(--surface-2)', text: 'var(--ink)' },
  other:     { Icon: FaLink,          label: 'Ссылка',    bg: 'var(--surface-2)', text: 'var(--ink)' },
};

// Stable anonymous session id (not tied to user identity)
function getSessionId(): string {
  const key = 'lk_sid';
  let id = sessionStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem(key, id); }
  return id;
}

export default function ProfileClient({ slug }: { slug: string }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDays, setCalDays] = useState<DayInfo[]>([]);
  const [calTimezone, setCalTimezone] = useState('Asia/Almaty');
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Contact reveal state
  const [revealLinks, setRevealLinks] = useState<Link[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      const res = await fetch(`${API}/public/providers/${slug}`).catch(() => null);
      const d = res ? await res.json() as { ok: boolean; provider?: Provider; services?: Service[]; photos?: Photo[] } : null;

      if (d?.ok) {
        setProvider(d.provider ?? null);
        setServices(d.services ?? []);
        setPhotos(d.photos ?? []);
        const yr = new Date().getFullYear();
        const mo = new Date().getMonth() + 1;
        fetch(`${API}/public/providers/${slug}/calendar/month?year=${yr}&month=${mo}`)
          .then(r => r.json())
          .then((c: { ok: boolean; days?: DayInfo[]; timezone?: string }) => {
            if (c.ok) { setCalDays(c.days ?? []); if (c.timezone) setCalTimezone(c.timezone); }
          })
          .catch(() => null);
      } else {
        // Owner preview fallback
        const token = localStorage.getItem('session_token');
        if (token) {
          try {
            const meRes = await fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } });
            const me = await meRes.json() as { ok: boolean; providers?: (Provider & { id: string })[] };
            const own = me.providers?.find(p => p.slug === slug);
            if (own) {
              setIsPreview(true);
              setProvider(own);
              const dataRes = await fetch(`${API}/providers/${own.id}/data`, { headers: { Authorization: `Bearer ${token}` } });
              const data = await dataRes.json() as { ok: boolean; services?: Service[]; photos?: Photo[]; links?: Link[] };
              if (data.ok) {
                setServices(data.services ?? []);
                setPhotos(data.photos ?? []);
                // In preview mode, show links directly (owner sees their own contacts)
                setRevealLinks(data.links ?? []);
                setRevealed(true);
              }
            } else { setNotFound(true); }
          } catch { setNotFound(true); }
        } else { setNotFound(true); }
      }
      setLoading(false);
    }

    void load();
  }, [slug]);

  useEffect(() => {
    if (!provider || !slug) return;
    fetch(`${API}/public/providers/${slug}/calendar/month?year=${calYear}&month=${calMonth}`)
      .then(r => r.json())
      .then((c: { ok: boolean; days?: DayInfo[] }) => { if (c.ok) setCalDays(c.days ?? []); })
      .catch(() => null);
  }, [calYear, calMonth, slug, provider]);

  void calTimezone;

  async function revealContacts() {
    if (revealed || revealing || !provider) return;
    setRevealing(true);
    try {
      const res = await fetch(`${API}/public/providers/${slug}/reveal-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_page: 'profile',
          selected_date: selectedCalDate ?? undefined,
          viewer_session_id: getSessionId(),
        }),
      });
      const data = await res.json() as { ok: boolean; links?: Link[] };
      if (data.ok) {
        setRevealLinks(data.links ?? []);
        setRevealed(true);
        setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
      }
    } catch { /* ignore */ }
    setRevealing(false);
  }

  function calPrev() {
    setSelectedCalDate(null);
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function calNext() {
    setSelectedCalDate(null);
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const calFirstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const calPad = (calFirstDow + 6) % 7;
  const calCells: (DayInfo | null)[] = [...Array(calPad).fill(null), ...calDays];
  while (calCells.length % 7 !== 0) calCells.push(null);
  const calTodayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const selectedDayInfo = calDays.find(d => d.date === selectedCalDate);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
    </div>
  );

  if (notFound || !provider) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <h2 style={{ margin: 0, fontSize: 22 }}>Профиль не найден</h2>
      <p style={{ color: 'var(--ink-3)', margin: 0 }}>Возможно, он скрыт или не существует.</p>
      <a href="/search" className="btn btn-primary" style={{ marginTop: 8 }}>Найти исполнителей</a>
    </div>
  );

  const cover = photos.find(p => p.is_cover) ?? photos[0];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {isPreview && (
        <div style={{ background: 'var(--amber)', color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: 14, fontWeight: 500 }}>
          👁 Предпросмотр — профиль скрыт от публики.{' '}
          <a href="/dashboard/provider" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>Изменить статус</a>
        </div>
      )}

      <nav className="nav-frosted">
        <a href="/search" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none' }}>← Назад</a>
        <a href="/" className="logo-mark" style={{ fontSize: 16 }}>
          <span className="logo-mark-icon" style={{ width: 26, height: 26, fontSize: 13 }}>✦</span>
          Linkora
        </a>
      </nav>

      {/* Hero cover */}
      <div style={{ position: 'relative', height: 300, backgroundSize: 'cover', backgroundPosition: 'center', background: 'linear-gradient(135deg,#1e1b4b,#4c1d95)', backgroundImage: cover ? `url(${cover.url})` : undefined }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,.15) 60%)' }} />
        <div style={{ position: 'absolute', bottom: 28, left: 24, right: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>{provider.display_name}</h1>
            {provider.is_verified && <span className="badge badge-verified" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none' }}>✓ Верификация</span>}
          </div>
          {(provider.city ?? provider.region) && (
            <p style={{ margin: '6px 0 0', color: 'rgba(255,255,255,.8)', fontSize: 14 }}>
              📍 {[provider.city, provider.region].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 48px' }}>

        {provider.bio && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.65, fontSize: 15 }}>{provider.bio}</p>
          </div>
        )}

        {services.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>Услуги</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {services.map(sv => (
                <div key={sv.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{sv.category}</span>
                  <h3 style={{ margin: '4px 0 6px', fontSize: 14, fontWeight: 700 }}>{sv.title}</h3>
                  {sv.description && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>{sv.description}</p>}
                  {sv.price_from && (
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                      от {sv.price_from}{sv.price_to ? ` — ${sv.price_to}` : ''} {sv.currency}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Фото</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
              {photos.map(ph => (
                <img key={ph.id} src={ph.url} alt={provider.display_name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 }} />
              ))}
            </div>
          </div>
        )}

        {/* Calendar */}
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Занятость</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 }}>
            <button onClick={calPrev} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)' }}>‹</button>
            <span style={{ fontSize: 15, fontWeight: 700, minWidth: 140, textAlign: 'center' }}>{MONTHS_RU[calMonth - 1]} {calYear}</span>
            <button onClick={calNext} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)' }}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {DAYS_SHORT.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 10, color: 'var(--ink-4)', fontWeight: 600, padding: '3px 0', textTransform: 'uppercase' }}>{d}</div>)}
            {calCells.map((cell, i) => {
              if (!cell) return <div key={`ep-${i}`} />;
              const st = CAL_ST[cell.status] ?? CAL_ST.free;
              const isToday = cell.date === calTodayStr;
              const isSel = cell.date === selectedCalDate;
              return (
                <button
                  key={cell.date}
                  onClick={() => setSelectedCalDate(isSel ? null : cell.date)}
                  style={{
                    minHeight: 44, border: 'none', borderRadius: 6, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                    background: st.bg, color: st.color,
                    boxShadow: isSel ? 'inset 0 0 0 2px #111' : isToday ? 'inset 0 0 0 2px #3b82f6' : undefined,
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{parseInt(cell.date.slice(8), 10)}</span>
                  {cell.count > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: st.color, display: 'inline-block' }} />}
                </button>
              );
            })}
          </div>
          {selectedCalDate && (
            <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, fontSize: 14 }}>
              {selectedDayInfo
                ? <span style={{ color: CAL_ST[selectedDayInfo.status]?.color ?? 'var(--ink)', fontWeight: 600 }}>
                    {new Date(selectedCalDate + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    {' — '}{CAL_ST[selectedDayInfo.status]?.label ?? selectedDayInfo.status}
                  </span>
                : <span style={{ color: 'var(--ink-3)' }}>Нет данных</span>
              }
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12, fontSize: 11, color: 'var(--ink-3)' }}>
            {Object.entries(CAL_ST).filter(([k]) => k !== 'past').map(([key, val]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.color, display: 'inline-block' }} />
                {val.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Contact Reveal ─────────────────────────────────── */}
        <div ref={contactRef}>
          {!revealed ? (
            /* ── Reveal gate ── */
            <div className="card" style={{ padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--brand-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--brand)' }}>
                <FaComments size={26} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800 }}>Связаться с исполнителем</h2>
              <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                WhatsApp, Telegram, Instagram — откроются после нажатия
              </p>
              {selectedCalDate && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '5px 12px', background: 'var(--brand-xlight)', borderRadius: 20, fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
                  📅 {new Date(selectedCalDate + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </div>
              )}
              <div style={{ height: 20 }} />
              <button
                onClick={() => void revealContacts()}
                disabled={revealing}
                className="btn btn-brand btn-lg btn-full"
                style={{ maxWidth: 340, margin: '0 auto', fontSize: 16 }}
              >
                {revealing
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Загрузка...</span>
                  : '📲 Показать контакты'
                }
              </button>
            </div>
          ) : (
            /* ── Contact card ── */
            <div className="card anim-fadeUp" style={{ padding: '22px 20px 24px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>Контакты</h2>
                <span style={{ fontSize: 11, background: 'var(--green-bg)', color: 'var(--green-text)', padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '.03em' }}>● Открыто</span>
              </div>

              {revealLinks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🤷</div>
                  <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14 }}>Исполнитель пока не добавил контакты</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
                  gap: 10,
                }}>
                  {revealLinks.map((lk, i) => {
                    const cfg = LINK_CFG[lk.link_type] ?? LINK_CFG['other']!;
                    const isLight = cfg.bg.startsWith('var(--surface');
                    const { Icon } = cfg;
                    return (
                      <a
                        key={lk.id}
                        href={lk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '15px 18px',
                          minHeight: 62,
                          borderRadius: 'var(--r-lg)',
                          background: cfg.bg,
                          border: isLight ? '1.5px solid var(--border)' : 'none',
                          textDecoration: 'none',
                          color: cfg.text,
                          fontWeight: 700,
                          fontSize: 15,
                          transition: 'opacity .15s, transform .15s',
                          animation: `fadeUp .3s ${i * 60}ms both`,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.85'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                      >
                        <Icon size={22} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{lk.label ?? cfg.label}</span>
                        <span style={{ fontSize: 16, opacity: .6, flexShrink: 0 }}>→</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
