'use client';
import { useEffect, useState, useCallback } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = {
  id: string; display_name: string; slug: string;
  city: string | null; region: string | null;
  is_featured: boolean; is_verified: boolean;
  cover_url: string | null; min_price: string | null; min_currency: string | null;
  categories: string[] | null;
  has_instagram: boolean; has_whatsapp: boolean; has_two_gis: boolean;
};
type Meta = { cities: string[]; categories: string[] };
type Sort = 'featured_first' | 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

const SORT_LABELS: Record<Sort, string> = {
  featured_first: 'Сначала рекомендуемые',
  newest:         'Сначала новые',
  price_asc:      'Цена: по возрастанию',
  price_desc:     'Цена: по убыванию',
  name_asc:       'По алфавиту',
};

export default function SearchPage() {
  const [city,        setCity]        = useState('');
  const [category,    setCategory]    = useState('');
  const [date,        setDate]        = useState('');
  const [timeFrom,    setTimeFrom]    = useState('');
  const [timeTo,      setTimeTo]      = useState('');
  const [priceFrom,   setPriceFrom]   = useState('');
  const [priceTo,     setPriceTo]     = useState('');
  const [featured,    setFeatured]    = useState(false);
  const [hasInsta,    setHasInsta]    = useState(false);
  const [hasWhatsapp, setHasWhatsapp] = useState(false);
  const [hasTwoGis,   setHasTwoGis]  = useState(false);
  const [sort,        setSort]        = useState<Sort>('featured_first');
  const [showMore,    setShowMore]    = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total,     setTotal]     = useState(0);
  const [page,      setPage]      = useState(1);
  const [pages,     setPages]     = useState(1);
  const [loading,   setLoading]   = useState(false);
  const [searched,  setSearched]  = useState(false);

  const [meta, setMeta] = useState<Meta>({ cities: [], categories: [] });

  useEffect(() => {
    fetch(`${API}/search/filters/meta`)
      .then(r => r.json())
      .then((d: { ok: boolean; cities?: string[]; categories?: string[] }) => {
        if (d.ok) setMeta({ cities: d.cities ?? [], categories: d.categories ?? [] });
      })
      .catch(() => null);
    // auto-search on load
    void doSearch(1);
  }, []);

  const doSearch = useCallback(async (p = 1) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (city)     params.set('city', city);
    if (category) params.set('category', category);
    if (date)     params.set('date', date);
    if (timeFrom) params.set('time_from', timeFrom);
    if (timeTo)   params.set('time_to', timeTo);
    if (priceFrom) params.set('price_from', priceFrom);
    if (priceTo)   params.set('price_to', priceTo);
    if (featured)    params.set('featured', 'true');
    if (hasInsta)    params.set('has_instagram', 'true');
    if (hasWhatsapp) params.set('has_whatsapp', 'true');
    if (hasTwoGis)   params.set('has_two_gis', 'true');
    params.set('sort', sort);
    params.set('page', String(p));
    params.set('limit', '18');

    const res = await fetch(`${API}/search/providers?${params.toString()}`);
    const data = await res.json() as { ok: boolean; providers?: Provider[]; total?: number; page?: number; pages?: number };
    if (data.ok) {
      if (p === 1) setProviders(data.providers ?? []);
      else setProviders(prev => [...prev, ...(data.providers ?? [])]);
      setTotal(data.total ?? 0);
      setPage(data.page ?? 1);
      setPages(data.pages ?? 1);
    }
    setLoading(false);
    setSearched(true);
  }, [city, category, date, timeFrom, timeTo, priceFrom, priceTo, featured, hasInsta, hasWhatsapp, hasTwoGis, sort]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void doSearch(1);
  }

  return (
    <div style={s.root}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <a href="/" style={s.logo}>🎭 тамада</a>
          <h1 style={s.title}>Найти исполнителя</h1>
        </div>
      </div>

      <div style={s.wrap}>
        {/* Filter form */}
        <form onSubmit={handleSearch} style={s.filterForm}>
          <div style={s.filterRow}>
            <select style={s.select} value={city} onChange={e => setCity(e.target.value)}>
              <option value="">Все города</option>
              {meta.cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={s.select} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Все категории</option>
              {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={s.input} type="date" value={date} onChange={e => setDate(e.target.value)} placeholder="Дата" />
            <button type="submit" style={s.searchBtn} disabled={loading}>
              {loading ? '...' : 'Найти'}
            </button>
          </div>

          {/* More filters toggle */}
          <button type="button" style={s.moreBtn} onClick={() => setShowMore(v => !v)}>
            {showMore ? '▲ Скрыть фильтры' : '▼ Ещё фильтры'}
          </button>

          {showMore && (
            <div style={s.moreFilters}>
              <div style={s.filterRow}>
                <input style={s.input} type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} placeholder="Время с" title="Время с (Алматы)" />
                <input style={s.input} type="time" value={timeTo}   onChange={e => setTimeTo(e.target.value)}   placeholder="Время до" title="Время до (Алматы)" />
                <input style={{ ...s.input, maxWidth: 130 }} type="number" value={priceFrom} onChange={e => setPriceFrom(e.target.value)} placeholder="Цена от ₸" min="0" />
                <input style={{ ...s.input, maxWidth: 130 }} type="number" value={priceTo}   onChange={e => setPriceTo(e.target.value)}   placeholder="Цена до ₸" min="0" />
              </div>
              <div style={s.checkRow}>
                <label style={s.check}><input type="checkbox" checked={featured}    onChange={e => setFeatured(e.target.checked)}    /> Рекомендуемые</label>
                <label style={s.check}><input type="checkbox" checked={hasInsta}    onChange={e => setHasInsta(e.target.checked)}    /> Instagram</label>
                <label style={s.check}><input type="checkbox" checked={hasWhatsapp} onChange={e => setHasWhatsapp(e.target.checked)} /> WhatsApp</label>
                <label style={s.check}><input type="checkbox" checked={hasTwoGis}   onChange={e => setHasTwoGis(e.target.checked)}   /> 2GIS</label>
              </div>
            </div>
          )}
        </form>

        {/* Sort + count bar */}
        {searched && (
          <div style={s.sortBar}>
            <span style={s.count}>
              {loading ? 'Поиск...' : `${total} исполнител${total === 1 ? 'ь' : total >= 2 && total <= 4 ? 'я' : 'ей'}`}
            </span>
            <select style={s.sortSelect} value={sort} onChange={e => { setSort(e.target.value as Sort); void doSearch(1); }}>
              {(Object.entries(SORT_LABELS) as [Sort, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}

        {/* Results grid */}
        {searched && providers.length === 0 && !loading ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🔍</div>
            <h3 style={s.emptyTitle}>Никого не нашли</h3>
            <p style={s.emptyDesc}>Попробуйте изменить фильтры или выбрать другой город.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {providers.map((p, i) => (
              <ProviderCard key={p.id} provider={p} animDelay={i % 18} />
            ))}
            {loading && !searched && Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={s.skeleton} />
            ))}
          </div>
        )}

        {/* Load more */}
        {page < pages && !loading && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button style={s.loadMore} onClick={() => void doSearch(page + 1)}>
              Показать ещё
            </button>
          </div>
        )}
        {loading && searched && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>Загрузка...</div>
        )}
      </div>
    </div>
  );
}

function ProviderCard({ provider: p, animDelay }: { provider: Provider; animDelay: number }) {
  const cats = p.categories?.slice(0, 2).join(' · ') ?? '';
  const price = p.min_price ? `от ${Number(p.min_price).toLocaleString('ru-RU')} ${p.min_currency ?? '₸'}` : '';
  const location = [p.city, p.region].filter(Boolean).join(', ');

  return (
    <a
      href={`/p/${p.slug}`}
      style={{
        ...s.card,
        animationDelay: `${animDelay * 40}ms`,
      }}
    >
      {/* Cover photo */}
      <div style={{
        ...s.cover,
        backgroundImage: p.cover_url ? `url(${p.cover_url})` : undefined,
        background: p.cover_url ? undefined : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
      }}>
        {p.is_featured && <span style={s.featuredBadge}>★ Топ</span>}
        {p.is_verified && <span style={s.verifiedBadge}>✓</span>}
      </div>

      {/* Info */}
      <div style={s.cardBody}>
        <div style={s.cardName}>{p.display_name}</div>
        {location && <div style={s.cardLocation}>📍 {location}</div>}
        {cats && <div style={s.cardCats}>{cats}</div>}
        <div style={s.cardFooter}>
          <span style={s.cardPrice}>{price || 'Договорная'}</span>
          <span style={s.cardArrow}>→</span>
        </div>
      </div>
    </a>
  );
}

const fadeIn = `
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// Inject animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = fadeIn;
  document.head.appendChild(style);
}

const s: Record<string, React.CSSProperties> = {
  root:        { fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#f8fafc' },
  header:      { background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 },
  logo:        { textDecoration: 'none', fontSize: 20, fontWeight: 700, color: '#111' },
  title:       { margin: 0, fontSize: 18, fontWeight: 600, color: '#374151' },
  wrap:        { maxWidth: 1100, margin: '0 auto', padding: '20px 16px' },

  filterForm:  { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: '16px', marginBottom: 16 },
  filterRow:   { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' },
  select:      { flex: 1, minWidth: 140, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' },
  input:       { flex: 1, minWidth: 120, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14 },
  searchBtn:   { padding: '9px 24px', background: '#111', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  moreBtn:     { marginTop: 10, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', padding: '4px 0' },
  moreFilters: { marginTop: 12, borderTop: '1px solid #f3f4f6', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  checkRow:    { display: 'flex', gap: 16, flexWrap: 'wrap' },
  check:       { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },

  sortBar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 },
  count:       { fontSize: 14, color: '#6b7280', fontWeight: 500 },
  sortSelect:  { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' },

  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 },
  skeleton:    { height: 300, borderRadius: 14, background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)', backgroundSize: '200% 100%' },

  card:        {
    display: 'block', textDecoration: 'none', color: '#111',
    background: '#fff', borderRadius: 14, overflow: 'hidden',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,.06)',
    transition: 'box-shadow .2s, transform .2s',
    animation: 'fadeUp .35s ease both',
  },
  cover:       { height: 180, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
  featuredBadge: { position: 'absolute', top: 10, left: 10, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 },
  verifiedBadge: { position: 'absolute', top: 10, right: 10, background: '#3b82f6', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 },
  cardBody:    { padding: '14px 16px' },
  cardName:    { fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#111' },
  cardLocation:{ fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardCats:    { fontSize: 12, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' },
  cardFooter:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice:   { fontSize: 14, fontWeight: 600, color: '#111' },
  cardArrow:   { fontSize: 16, color: '#9ca3af' },

  empty:       { textAlign: 'center', padding: '60px 20px' },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#374151' },
  emptyDesc:   { fontSize: 14, color: '#9ca3af', margin: 0 },

  loadMore:    { padding: '10px 32px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 500 },
};
