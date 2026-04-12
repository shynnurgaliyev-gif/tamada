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

const linkIcons: Record<string, string> = {
  instagram: '📸', whatsapp: '💬', telegram: '✈️', tiktok: '🎵',
  youtube: '▶️', website: '🌐', two_gis: '📍', map: '🗺️', other: '🔗',
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
      // Try public endpoint first
      const res = await fetch(`${API}/public/providers/${slug}`).catch(() => null);
      const d = res ? await res.json() as { ok: boolean; provider?: Provider; services?: Service[]; photos?: Photo[]; links?: Link[] } : null;

      if (d?.ok) {
        setProvider(d.provider ?? null);
        setServices(d.services ?? []);
        setPhotos(d.photos ?? []);
        setLinks(d.links ?? []);
        // load calendar
        const yr = new Date().getFullYear();
        const mo = new Date().getMonth() + 1;
        fetch(`${API}/public/providers/${slug}/calendar/month?year=${yr}&month=${mo}`)
          .then(r => r.json())
          .then((c: { ok: boolean; days?: DayInfo[]; timezone?: string }) => {
            if (c.ok) { setCalDays(c.days ?? []); if (c.timezone) setCalTimezone(c.timezone); }
          })
          .catch(() => null);
      } else {
        // Profile not public — check if owner is viewing
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

  // Load calendar month when calYear/calMonth changes (after initial load)
  useEffect(() => {
    if (!provider || !slug) return;
    fetch(`${API}/public/providers/${slug}/calendar/month?year=${calYear}&month=${calMonth}`)
      .then(r => r.json())
      .then((c: { ok: boolean; days?: DayInfo[] }) => { if (c.ok) setCalDays(c.days ?? []); })
      .catch(() => null);
  }, [calYear, calMonth, slug, provider]);

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

  // Build calendar grid
  const calFirstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const calPad = (calFirstDow + 6) % 7;
  const calCells: (DayInfo | null)[] = [...Array(calPad).fill(null), ...calDays];
  while (calCells.length % 7 !== 0) calCells.push(null);
  const calTodayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const selectedDayInfo = calDays.find(d => d.date === selectedCalDate);

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;
  if (notFound || !provider) return (
    <div style={{ ...s.page, textAlign: 'center', paddingTop: 80 }}>
      <h2>Профиль не найден</h2>
      <p style={{ color: '#6b7280' }}>Возможно, он скрыт или не существует.</p>
    </div>
  );

  const cover = photos.find(p => p.is_cover) ?? photos[0];

  return (
    <div style={s.root}>
      {isPreview && (
        <div style={s.previewBanner}>
          👁 Предпросмотр — профиль скрыт от публики. <a href="/dashboard/provider" style={{ color: '#fff', fontWeight: 600 }}>Изменить статус</a>
        </div>
      )}
      <div style={{ ...s.hero, backgroundImage: cover ? `url(${cover.url})` : undefined }}>
        <div style={s.heroOverlay} />
        <div style={s.heroContent}>
          <div style={s.nameRow}>
            <h1 style={s.name}>{provider.display_name}</h1>
            {provider.is_verified && <span style={s.verified}>✓</span>}
          </div>
          {(provider.city ?? provider.region) && (
            <p style={s.location}>📍 {[provider.city, provider.region].filter(Boolean).join(', ')}</p>
          )}
          {provider.provider_status !== 'active' && (
            <span style={s.statusBadge}>{provider.provider_status}</span>
          )}
        </div>
      </div>

      <div style={s.body}>
        {provider.bio && (
          <section style={s.section}>
            <p style={s.bio}>{provider.bio}</p>
          </section>
        )}

        {services.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Услуги</h2>
            <div style={s.servicesGrid}>
              {services.map(sv => (
                <div key={sv.id} style={s.serviceCard}>
                  <span style={s.serviceCategory}>{sv.category}</span>
                  <h3 style={s.serviceTitle}>{sv.title}</h3>
                  {sv.description && <p style={s.serviceDesc}>{sv.description}</p>}
                  {sv.price_from && (
                    <p style={s.servicePrice}>
                      от {sv.price_from}{sv.price_to ? ` — ${sv.price_to}` : ''} {sv.currency}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {photos.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Фото</h2>
            <div style={s.photoGrid}>
              {photos.map(ph => (
                <img key={ph.id} src={ph.url} alt={provider.display_name} style={s.photo} />
              ))}
            </div>
          </section>
        )}

        <section style={s.section}>
          <h2 style={s.sectionTitle}>Занятость</h2>
          {/* Month nav */}
          <div style={s.calNav}>
            <button onClick={calPrev} style={s.calNavBtn}>‹</button>
            <span style={s.calMonthLabel}>{MONTHS_RU[calMonth - 1]} {calYear}</span>
            <button onClick={calNext} style={s.calNavBtn}>›</button>
          </div>
          {/* Grid */}
          <div style={s.calGrid}>
            {DAYS_SHORT.map(d => <div key={d} style={s.calDayHeader}>{d}</div>)}
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
                    ...s.calCell,
                    background: st.bg,
                    color: st.color,
                    boxShadow: isSel ? 'inset 0 0 0 2px #111' : isToday ? 'inset 0 0 0 2px #3b82f6' : undefined,
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{parseInt(cell.date.slice(8), 10)}</span>
                  {cell.count > 0 && <span style={{ ...s.calDotPub, background: st.color }} />}
                </button>
              );
            })}
          </div>
          {/* Selected day info */}
          {selectedCalDate && (
            <div style={s.calDayInfo}>
              {selectedDayInfo
                ? <span style={{ color: CAL_ST[selectedDayInfo.status]?.color ?? '#111', fontWeight: 600 }}>
                    {new Date(selectedCalDate + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                    {' — '}{CAL_ST[selectedDayInfo.status]?.label ?? selectedDayInfo.status}
                  </span>
                : <span style={{ color: '#6b7280' }}>Нет данных</span>
              }
            </div>
          )}
          {/* Legend */}
          <div style={s.calLegend}>
            {Object.entries(CAL_ST).filter(([k]) => k !== 'past').map(([key, val]) => (
              <span key={key} style={s.calLegendItem}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: val.color, display: 'inline-block' }} />
                {val.label}
              </span>
            ))}
          </div>
        </section>

        {links.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Контакты и соцсети</h2>
            <div style={s.linksRow}>
              {links.map(lk => (
                <a key={lk.id} href={lk.url} target="_blank" rel="noopener noreferrer" style={s.linkItem}>
                  <span style={s.linkIcon}>{linkIcons[lk.link_type] ?? '🔗'}</span>
                  <span style={s.linkLabel}>{lk.label ?? lk.link_type}</span>
                </a>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  root: { fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f9fafb' },
  previewBanner: { background: '#f59e0b', color: '#fff', textAlign: 'center' as const, padding: '10px 16px', fontSize: 14 },
  hero: { position: 'relative', height: 280, backgroundSize: 'cover', backgroundPosition: 'center', background: '#1f2937' },
  heroOverlay: { position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, rgba(0,0,0,.2) 100%)' },
  heroContent: { position: 'absolute', bottom: 28, left: 24, right: 24 },
  nameRow: { display: 'flex', alignItems: 'center', gap: 10 },
  name: { margin: 0, fontSize: 28, fontWeight: 700, color: '#fff' },
  verified: { background: '#3b82f6', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 },
  location: { margin: '6px 0 0', color: 'rgba(255,255,255,.8)', fontSize: 14 },
  statusBadge: { display: 'inline-block', marginTop: 8, background: 'rgba(255,255,255,.15)', color: '#fff', padding: '2px 10px', borderRadius: 20, fontSize: 12 },
  body: { maxWidth: 700, margin: '0 auto', padding: '24px 16px' },
  section: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  sectionTitle: { margin: '0 0 16px', fontSize: 17, fontWeight: 600, color: '#111' },
  bio: { margin: 0, color: '#374151', lineHeight: 1.6, fontSize: 15 },
  servicesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  serviceCard: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14 },
  serviceCategory: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' },
  serviceTitle: { margin: '4px 0 6px', fontSize: 15, fontWeight: 600 },
  serviceDesc: { margin: '0 0 8px', fontSize: 13, color: '#6b7280', lineHeight: 1.4 },
  servicePrice: { margin: 0, fontSize: 14, fontWeight: 600, color: '#111' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  photo: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 },
  linksRow: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  linkItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f3f4f6', borderRadius: 10, textDecoration: 'none', color: '#111', fontSize: 14 },
  linkIcon: { fontSize: 18 },
  linkLabel: { fontWeight: 500 },
  page: { maxWidth: 700, margin: '40px auto', padding: '0 16px' },
  calNav:        { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 },
  calNavBtn:     { background: 'none', border: '1px solid #e5e7eb', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#374151' },
  calMonthLabel: { fontSize: 15, fontWeight: 600, minWidth: 140, textAlign: 'center' },
  calGrid:       { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 },
  calDayHeader:  { textAlign: 'center', fontSize: 10, color: '#9ca3af', fontWeight: 600, padding: '3px 0', textTransform: 'uppercase' },
  calCell:       { minHeight: 44, border: 'none', borderRadius: 6, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3 },
  calDotPub:     { width: 5, height: 5, borderRadius: '50%' },
  calDayInfo:    { marginTop: 10, padding: '8px 12px', background: '#f9fafb', borderRadius: 8, fontSize: 14 },
  calLegend:     { display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10, fontSize: 11, color: '#6b7280' },
  calLegendItem: { display: 'flex', alignItems: 'center', gap: 4 },
};
