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
type Meta    = { cities: string[]; categories: string[] };
type Sort    = 'featured_first' | 'newest' | 'price_asc' | 'price_desc' | 'name_asc';
type Filters = {
  city: string; category: string; date: string;
  timeFrom: string; timeTo: string; priceFrom: string; priceTo: string;
  featured: boolean; hasInsta: boolean; hasWhatsapp: boolean; hasTwoGis: boolean;
};

const SORT_LABELS: Record<Sort, string> = {
  featured_first: 'Сначала рекомендуемые', newest: 'Сначала новые',
  price_asc: 'Цена ↑', price_desc: 'Цена ↓', name_asc: 'По алфавиту',
};

const EMPTY_FILTERS: Filters = {
  city: '', category: '', date: '', timeFrom: '', timeTo: '',
  priceFrom: '', priceTo: '', featured: false, hasInsta: false, hasWhatsapp: false, hasTwoGis: false,
};

export default function SearchPage() {
  const [f, setF]     = useState<Filters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<Sort>('featured_first');
  const [showMore, setShowMore] = useState(false);

  const [providers, setProviders] = useState<Provider[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [pages, setPages]   = useState(1);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const [meta, setMeta] = useState<Meta>({ cities: [], categories: [] });

  // AI Search state
  const [aiQuery,   setAiQuery]   = useState('');
  const [aiChips,   setAiChips]   = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMode,    setAiMode]    = useState('');

  useEffect(() => {
    fetch(`${API}/search/filters/meta`)
      .then(r => r.json())
      .then((d: { ok: boolean; cities?: string[]; categories?: string[] }) => {
        if (d.ok) setMeta({ cities: d.cities ?? [], categories: d.categories ?? [] });
      })
      .catch(() => null);
    void doSearch(EMPTY_FILTERS, 'featured_first', 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(filters: Filters, sortVal: Sort, p: number) {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.city)      params.set('city', filters.city);
    if (filters.category)  params.set('category', filters.category);
    if (filters.date)      params.set('date', filters.date);
    if (filters.timeFrom)  params.set('time_from', filters.timeFrom);
    if (filters.timeTo)    params.set('time_to', filters.timeTo);
    if (filters.priceFrom) params.set('price_from', filters.priceFrom);
    if (filters.priceTo)   params.set('price_to', filters.priceTo);
    if (filters.featured)  params.set('featured', 'true');
    if (filters.hasInsta)  params.set('has_instagram', 'true');
    if (filters.hasWhatsapp) params.set('has_whatsapp', 'true');
    if (filters.hasTwoGis)   params.set('has_two_gis', 'true');
    params.set('sort', sortVal);
    params.set('page', String(p));
    params.set('limit', '18');

    const res  = await fetch(`${API}/search/providers?${params}`);
    const data = await res.json() as { ok: boolean; providers?: Provider[]; total?: number; page?: number; pages?: number };
    if (data.ok) {
      if (p === 1) setProviders(data.providers ?? []);
      else setProviders(prev => [...prev, ...(data.providers ?? [])]);
      setTotal(data.total ?? 0); setPage(data.page ?? 1); setPages(data.pages ?? 1);
    }
    setLoading(false); setSearched(true);
  }

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setAiChips([]);
    void doSearch(f, sort, 1);
  }, [f, sort]);

  const handleSortChange = useCallback((newSort: Sort) => {
    setSort(newSort);
    void doSearch(f, newSort, 1);
  }, [f]);

  async function doAiSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiChips([]);

    const res  = await fetch(`${API}/search/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: aiQuery }),
    });
    const data = await res.json() as {
      ok: boolean;
      filters?: { city?: string; category?: string; date?: string; time_from?: string; time_to?: string; price_from?: number; price_to?: number };
      understood?: string[];
      mode?: string;
      providers?: Provider[];
      total?: number;
      pages?: number;
    };

    if (data.ok) {
      // Populate form fields from AI
      const pf = data.filters ?? {};
      setF(prev => ({
        ...prev,
        city:      pf.city      ?? prev.city,
        category:  pf.category  ?? prev.category,
        date:      pf.date      ?? prev.date,
        timeFrom:  pf.time_from ?? prev.timeFrom,
        timeTo:    pf.time_to   ?? prev.timeTo,
        priceFrom: pf.price_from != null ? String(pf.price_from) : prev.priceFrom,
        priceTo:   pf.price_to  != null ? String(pf.price_to)  : prev.priceTo,
      }));
      setAiChips(data.understood ?? []);
      setAiMode(data.mode ?? '');
      if (data.providers) {
        setProviders(data.providers ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
        setPage(1);
        setSearched(true);
      }
    }
    setAiLoading(false);
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <div style={s.headerInner}>
          <a href="/" style={s.logo}>🎭 тамада</a>
          <h1 style={s.title}>Найти исполнителя</h1>
        </div>
      </div>

      <div style={s.wrap}>
        {/* AI Search Bar */}
        <form onSubmit={doAiSearch} style={s.aiBar}>
          <div style={s.aiRow}>
            <span style={s.aiIcon}>✨</span>
            <input
              style={s.aiInput}
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder='Опишите кого ищете, например: "тамада в Алматы на субботу вечером"'
            />
            <button type="submit" style={s.aiBtn} disabled={aiLoading}>
              {aiLoading ? '...' : 'Умный поиск'}
            </button>
          </div>
          {aiChips.length > 0 && (
            <div style={s.chips}>
              {aiMode && (
                <span style={s.modeTag}>{aiMode === 'llm' ? '🤖 AI' : '📐 Правила'}</span>
              )}
              {aiChips.map((chip, i) => (
                <span key={i} style={s.chip}>✓ {chip}</span>
              ))}
            </div>
          )}
        </form>

        {/* Regular Filter Form */}
        <form onSubmit={handleSearch} style={s.filterForm}>
          <div style={s.filterRow}>
            <select style={s.select} value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))}>
              <option value="">Все города</option>
              {meta.cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select style={s.select} value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
              <option value="">Все категории</option>
              {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input style={s.input} type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} />
            <button type="submit" style={s.searchBtn} disabled={loading}>{loading ? '...' : 'Найти'}</button>
          </div>

          <button type="button" style={s.moreBtn} onClick={() => setShowMore(v => !v)}>
            {showMore ? '▲ Скрыть фильтры' : '▼ Ещё фильтры'}
          </button>

          {showMore && (
            <div style={s.moreFilters}>
              <div style={s.filterRow}>
                <input style={s.input} type="time" value={f.timeFrom} onChange={e => setF(p => ({ ...p, timeFrom: e.target.value }))} title="Время с (Алматы)" />
                <input style={s.input} type="time" value={f.timeTo}   onChange={e => setF(p => ({ ...p, timeTo: e.target.value }))}   title="Время до (Алматы)" />
                <input style={{ ...s.input, maxWidth: 130 }} type="number" value={f.priceFrom} onChange={e => setF(p => ({ ...p, priceFrom: e.target.value }))} placeholder="Цена от ₸" min="0" />
                <input style={{ ...s.input, maxWidth: 130 }} type="number" value={f.priceTo}   onChange={e => setF(p => ({ ...p, priceTo: e.target.value }))}   placeholder="Цена до ₸" min="0" />
              </div>
              <div style={s.checkRow}>
                <label style={s.check}><input type="checkbox" checked={f.featured}    onChange={e => setF(p => ({ ...p, featured: e.target.checked }))}    /> Рекомендуемые</label>
                <label style={s.check}><input type="checkbox" checked={f.hasInsta}    onChange={e => setF(p => ({ ...p, hasInsta: e.target.checked }))}    /> Instagram</label>
                <label style={s.check}><input type="checkbox" checked={f.hasWhatsapp} onChange={e => setF(p => ({ ...p, hasWhatsapp: e.target.checked }))} /> WhatsApp</label>
                <label style={s.check}><input type="checkbox" checked={f.hasTwoGis}   onChange={e => setF(p => ({ ...p, hasTwoGis: e.target.checked }))}   /> 2GIS</label>
              </div>
            </div>
          )}
        </form>

        {/* Sort + count */}
        {searched && (
          <div style={s.sortBar}>
            <span style={s.count}>
              {loading ? 'Поиск...' : `${total} исполнител${total === 1 ? 'ь' : total >= 2 && total <= 4 ? 'я' : 'ей'}`}
            </span>
            <select style={s.sortSelect} value={sort} onChange={e => handleSortChange(e.target.value as Sort)}>
              {(Object.entries(SORT_LABELS) as [Sort, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}

        {/* Results */}
        {searched && providers.length === 0 && !loading ? (
          <div style={s.empty}>
            <div style={s.emptyIcon}>🔍</div>
            <h3 style={s.emptyTitle}>Никого не нашли</h3>
            <p style={s.emptyDesc}>Попробуйте изменить фильтры или другой город.</p>
          </div>
        ) : (
          <div style={s.grid}>
            {providers.map((p, i) => <ProviderCard key={p.id} provider={p} animDelay={i % 18} />)}
            {loading && !searched && Array.from({ length: 6 }).map((_, i) => <div key={i} style={s.skeleton} />)}
          </div>
        )}

        {page < pages && !loading && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button style={s.loadMore} onClick={() => void doSearch(f, sort, page + 1)}>Показать ещё</button>
          </div>
        )}
        {loading && searched && <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af' }}>Загрузка...</div>}
      </div>
    </div>
  );
}

function ProviderCard({ provider: p, animDelay }: { provider: Provider; animDelay: number }) {
  const cats     = p.categories?.slice(0, 2).join(' · ') ?? '';
  const price    = p.min_price ? `от ${Number(p.min_price).toLocaleString('ru-RU')} ${p.min_currency ?? '₸'}` : '';
  const location = [p.city, p.region].filter(Boolean).join(', ');
  return (
    <a href={`/p/${p.slug}`} style={{ ...s.card, animationDelay: `${animDelay * 40}ms` }}>
      <div style={{ ...s.cover, backgroundImage: p.cover_url ? `url(${p.cover_url})` : undefined, background: p.cover_url ? undefined : 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
        {p.is_featured && <span style={s.featuredBadge}>★ Топ</span>}
        {p.is_verified && <span style={s.verifiedBadge}>✓</span>}
      </div>
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

if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = `@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`;
  document.head.appendChild(st);
}

const s: Record<string, React.CSSProperties> = {
  root:        { fontFamily: 'system-ui,sans-serif', minHeight: '100vh', background: '#f8fafc' },
  header:      { background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 16px' },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 16 },
  logo:        { textDecoration: 'none', fontSize: 20, fontWeight: 700, color: '#111' },
  title:       { margin: 0, fontSize: 18, fontWeight: 600, color: '#374151' },
  wrap:        { maxWidth: 1100, margin: '0 auto', padding: '20px 16px' },

  aiBar:       { background: 'linear-gradient(135deg,#667eea15,#764ba215)', border: '1px solid #c4b5fd', borderRadius: 14, padding: 16, marginBottom: 12 },
  aiRow:       { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  aiIcon:      { fontSize: 20, flexShrink: 0 },
  aiInput:     { flex: 1, minWidth: 220, padding: '10px 14px', border: '1px solid #c4b5fd', borderRadius: 10, fontSize: 14, background: '#fff', outline: 'none' },
  aiBtn:       { padding: '10px 20px', background: 'linear-gradient(135deg,#667eea,#764ba2)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  chips:       { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' },
  chip:        { background: '#ede9fe', color: '#5b21b6', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 },
  modeTag:     { background: '#f3f4f6', color: '#6b7280', padding: '2px 8px', borderRadius: 20, fontSize: 11 },

  filterForm:  { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, padding: 16, marginBottom: 16 },
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

  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 16 },
  skeleton:    { height: 300, borderRadius: 14, background: 'linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)' },
  card:        { display: 'block', textDecoration: 'none', color: '#111', background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,.06)', transition: 'box-shadow .2s,transform .2s', animation: 'fadeUp .35s ease both' },
  cover:       { height: 180, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' },
  featuredBadge: { position: 'absolute', top: 10, left: 10, background: '#f59e0b', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20 },
  verifiedBadge: { position: 'absolute', top: 10, right: 10, background: '#3b82f6', color: '#fff', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 },
  cardBody:    { padding: '14px 16px' },
  cardName:    { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  cardLocation:{ fontSize: 13, color: '#6b7280', marginBottom: 4 },
  cardCats:    { fontSize: 12, color: '#9ca3af', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' },
  cardFooter:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardPrice:   { fontSize: 14, fontWeight: 600 },
  cardArrow:   { fontSize: 16, color: '#9ca3af' },
  empty:       { textAlign: 'center', padding: '60px 20px' },
  emptyIcon:   { fontSize: 48, marginBottom: 16 },
  emptyTitle:  { fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#374151' },
  emptyDesc:   { fontSize: 14, color: '#9ca3af', margin: 0 },
  loadMore:    { padding: '10px 32px', background: '#fff', border: '1px solid #d1d5db', borderRadius: 10, fontSize: 14, cursor: 'pointer', fontWeight: 500 },
};
