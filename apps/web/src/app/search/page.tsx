'use client';
import { useEffect, useState, useCallback } from 'react';
import { OctiMark } from '@/components/OctiLogo';

import { API_URL as API } from '@/lib/env';

type Provider = {
  id: string; display_name: string; slug: string;
  city: string | null; region: string | null;
  is_featured: boolean; is_verified: boolean;
  cover_url: string | null; min_price: string | null; min_currency: string | null;
  categories: string[] | null;
  has_instagram: boolean; has_whatsapp: boolean; has_two_gis: boolean;
};
type Meta    = { cities: string[]; categories: string[] };

const CARD_GRADIENTS = [
  'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)',
  'linear-gradient(135deg,#db2777 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#059669 0%,#0284c7 100%)',
  'linear-gradient(135deg,#d97706 0%,#b45309 100%)',
  'linear-gradient(135deg,#dc2626 0%,#9d174d 100%)',
  'linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)',
  'linear-gradient(135deg,#0f172a 0%,#1e40af 100%)',
];
function nameGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CARD_GRADIENTS[Math.abs(h) % CARD_GRADIENTS.length]!;
}
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

  useEffect(() => {
    fetch(`${API}/search/filters/meta`)
      .then(r => r.json())
      .then((d: { ok: boolean; cities?: string[]; categories?: string[] }) => {
        if (d.ok) setMeta({ cities: d.cities ?? [], categories: d.categories ?? [] });
      })
      .catch(() => null);

    // Read URL params (e.g. ?category=диджей from homepage category cards)
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters: Filters = {
      ...EMPTY_FILTERS,
      city:     urlParams.get('city')     ?? '',
      category: urlParams.get('category') ?? '',
      date:     urlParams.get('date')     ?? '',
    };
    setF(initialFilters);
    void doSearch(initialFilters, 'featured_first', 1);
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
    void doSearch(f, sort, 1);
  }, [f, sort]);

  const handleSortChange = useCallback((newSort: Sort) => {
    setSort(newSort);
    void doSearch(f, newSort, 1);
  }, [f]);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <OctiMark size={28} />
          <span className="hide-mobile">Octiqa</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="/for-specialists" className="btn btn-ghost btn-sm hide-mobile" style={{ color: 'var(--ink-3)' }}>Специалистам</a>
          <a href="/login"  className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-3)' }}>Войти</a>
          <a href="/signup" className="btn btn-brand btn-sm">Регистрация</a>
        </div>
      </nav>

      <div className="container" style={{ padding: '20px 16px' }}>
        {/* Filter Form */}
        <form onSubmit={handleSearch} className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="select" style={{ flex: 1, minWidth: 140 }} value={f.city} onChange={e => setF(p => ({ ...p, city: e.target.value }))}>
              <option value="">Все города</option>
              {meta.cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="select" style={{ flex: 1, minWidth: 140 }} value={f.category} onChange={e => setF(p => ({ ...p, category: e.target.value }))}>
              <option value="">Все категории</option>
              {meta.categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="input" style={{ flex: 1, minWidth: 140 }} type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} />
            <button type="submit" className="btn btn-primary search-submit-btn" disabled={loading}>{loading ? '...' : 'Найти'}</button>
          </div>
          <style>{`@media(max-width:560px){.search-submit-btn{width:100%;margin-top:0;}}`}</style>

          <button type="button" style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }} onClick={() => setShowMore(v => !v)}>
            {showMore ? '▲ Скрыть фильтры' : '▼ Ещё фильтры'}
          </button>

          {showMore && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <label style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Время с</span>
                  <input className="input" type="time" value={f.timeFrom} onChange={e => setF(p => ({ ...p, timeFrom: e.target.value }))} />
                </label>
                <label style={{ flex: 1, minWidth: 120, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 11, color: 'var(--ink-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>Время до</span>
                  <input className="input" type="time" value={f.timeTo} onChange={e => setF(p => ({ ...p, timeTo: e.target.value }))} />
                </label>
                <input className="input" style={{ flex: 1, minWidth: 120, maxWidth: 130 }} type="number" value={f.priceFrom} onChange={e => setF(p => ({ ...p, priceFrom: e.target.value }))} placeholder="Цена от ₸" min="0" />
                <input className="input" style={{ flex: 1, minWidth: 120, maxWidth: 130 }} type="number" value={f.priceTo}   onChange={e => setF(p => ({ ...p, priceTo: e.target.value }))}   placeholder="Цена до ₸" min="0" />
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}><input type="checkbox" checked={f.featured}    onChange={e => setF(p => ({ ...p, featured: e.target.checked }))}    /> Рекомендуемые</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}><input type="checkbox" checked={f.hasInsta}    onChange={e => setF(p => ({ ...p, hasInsta: e.target.checked }))}    /> Instagram</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}><input type="checkbox" checked={f.hasWhatsapp} onChange={e => setF(p => ({ ...p, hasWhatsapp: e.target.checked }))} /> WhatsApp</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer' }}><input type="checkbox" checked={f.hasTwoGis}   onChange={e => setF(p => ({ ...p, hasTwoGis: e.target.checked }))}   /> 2GIS</label>
              </div>
            </div>
          )}
        </form>

        {/* Sort + count */}
        {searched && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 14, color: 'var(--ink-3)', fontWeight: 500 }}>
              {loading ? 'Поиск...' : `${total} исполнител${total === 1 ? 'ь' : total >= 2 && total <= 4 ? 'я' : 'ей'}`}
            </span>
            <select className="select" style={{ width: 'auto' }} value={sort} onChange={e => handleSortChange(e.target.value as Sort)}>
              {(Object.entries(SORT_LABELS) as [Sort, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        )}

        {/* Results */}
        {searched && providers.length === 0 && !loading ? (
          <div className="empty">
            <div className="empty-icon">🔍</div>
            <h3 className="empty-title">Никого не нашли</h3>
            <p style={{ fontSize: 14, color: 'var(--ink-4)', margin: 0 }}>Попробуйте изменить фильтры или другой город.</p>
          </div>
        ) : (
          <div className="cards-grid">
            {providers.map((p, i) => <ProviderCard key={p.id} provider={p} animDelay={i % 18} />)}
            {loading && !searched && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 300 }} />)}
          </div>
        )}

        {page < pages && !loading && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn-outline" onClick={() => void doSearch(f, sort, page + 1)}>Показать ещё</button>
          </div>
        )}
        {loading && searched && <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-4)' }}>Загрузка...</div>}
      </div>
    </div>
  );
}

function ProviderCard({ provider: p, animDelay }: { provider: Provider; animDelay: number }) {
  const cats     = p.categories?.slice(0, 3).join(' · ') ?? '';
  const price    = p.min_price ? `от ${Number(p.min_price).toLocaleString('ru-RU')} ${p.min_currency ?? '₸'}` : '';
  const location = [p.city, p.region].filter(Boolean).join(', ');
  const initial  = p.display_name[0]?.toUpperCase() ?? '?';
  const gradient = nameGradient(p.display_name);
  return (
    <a href={`/p/${p.slug}`} className="pcard" style={{ animationDelay: `${animDelay * 40}ms` }}>
      <div className="pcard-cover" style={{ position: 'relative', overflow: 'hidden', background: gradient }}>
        {/* Blurred photo background */}
        {p.cover_url && (
          <div style={{ position: 'absolute', inset: '-10px', backgroundImage: `url(${p.cover_url})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(16px)', transform: 'scale(1.15)' }} />
        )}
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.5) 0%, rgba(0,0,0,.1) 100%)' }} />
        {/* Sharp avatar */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {p.cover_url ? (
            <img src={p.cover_url} alt={p.display_name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '2.5px solid rgba(255,255,255,.4)', boxShadow: '0 4px 16px rgba(0,0,0,.35)' }} />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,.18)', border: '2.5px solid rgba(255,255,255,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800, color: '#fff' }}>
              {initial}
            </div>
          )}
        </div>
        {p.is_featured && <span className="badge badge-featured" style={{ position: 'absolute', top: 10, left: 10 }}>★ Топ</span>}
        {p.is_verified && <span className="badge badge-verified" style={{ position: 'absolute', top: 10, right: 10, borderRadius: '50%', width: 22, height: 22, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✓</span>}
      </div>
      <div className="pcard-body">
        <div className="pcard-name">{p.display_name}</div>
        {location && <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 4 }}>📍 {location}</div>}
        {cats && <div style={{ fontSize: 12, color: 'var(--ink-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>{cats}</div>}
        <div className="pcard-footer">
          <span style={{ fontSize: 14, fontWeight: 600 }}>{price || 'Договорная'}</span>
          <span style={{ fontSize: 16, color: 'var(--ink-4)' }}>→</span>
        </div>
      </div>
    </a>
  );
}
