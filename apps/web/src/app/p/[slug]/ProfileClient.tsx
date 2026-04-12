'use client';
import { useEffect, useState } from 'react';

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

const LINK_ICONS: Record<string, string> = {
  instagram: '📸', whatsapp: '💬', telegram: '✈️', tiktok: '🎵',
  youtube: '▶️', website: '🌐', two_gis: '📍', map: '🗺️', other: '🔗',
};
const LINK_NAMES: Record<string, string> = {
  instagram: 'Instagram', whatsapp: 'WhatsApp', telegram: 'Telegram', tiktok: 'TikTok',
  youtube: 'YouTube', website: 'Сайт', two_gis: '2GIS', map: 'Карта', other: 'Ссылка',
};

export default function ProfileClient({ slug }: { slug: string }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDays, setCalDays] = useState<DayInfo[]>([]);
  const [calTimezone, setCalTimezone] = useState('Asia/Almaty');
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      const res = await fetch(`${API}/public/providers/${slug}`).catch(() => null);
      const d = res ? await res.json() as { ok: boolean; provider?: Provider; services?: Service[]; photos?: Photo[]; links?: Link[] } : null;

      if (d?.ok) {
        setProvider(d.provider ?? null);
        setServices(d.services ?? []);
        setPhotos(d.photos ?? []);
        setLinks(d.links ?? []);
        const yr = new Date().getFullYear();
        const mo = new Date().getMonth() + 1;
        fetch(`${API}/public/providers/${slug}/calendar/month?year=${yr}&month=${mo}`)
          .then(r => r.json())
          .then((c: { ok: boolean; days?: DayInfo[]; timezone?: string }) => {
            if (c.ok) { setCalDays(c.days ?? []); if (c.timezone) setCalTimezone(c.timezone); }
          })
          .catch(() => null);
      } else {
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
                setLinks(data.links ?? []);
              }
            } else {
              setNotFound(true);
            }
          } catch {
            setNotFound(true);
          }
        } else {
          setNotFound(true);
        }
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

  void calTimezone; // used for future locale formatting

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
      {/* Preview banner */}
      {isPreview && (
        <div style={{ background: 'var(--amber)', color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: 14, fontWeight: 500 }}>
          👁 Предпросмотр — профиль скрыт от публики.{' '}
          <a href="/dashboard/provider" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>Изменить статус</a>
        </div>
      )}

      {/* Back nav */}
      <nav className="nav">
        <a href="/search" className="nav-logo" style={{ fontSize: 16 }}>← Поиск</a>
        <a href="/" style={{ fontSize: 13, color: 'var(--ink-3)' }}>🎤 Тамада</a>
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

      {/* Body */}
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

        {links.length > 0 && (
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Контакты и соцсети</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {links.map(lk => (
                <a key={lk.id} href={lk.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, textDecoration: 'none', color: 'var(--ink)', fontSize: 14, transition: 'box-shadow .15s' }}>
                  <span style={{ fontSize: 18 }}>{LINK_ICONS[lk.link_type] ?? '🔗'}</span>
                  <span style={{ fontWeight: 600 }}>{lk.label ?? LINK_NAMES[lk.link_type] ?? lk.link_type}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
