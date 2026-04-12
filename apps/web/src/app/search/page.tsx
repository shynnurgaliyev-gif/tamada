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
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {/* Header */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark">
          <span className="logo-mark-icon">✦</span>
          <span className="hide-mobile">Linkora</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <a href="/login" className="btn btn-ghost btn-sm" style={{ color: 'var(--ink-3)' }}>Войти</a>
          <a href="/signup" className="btn btn-brand btn-sm">Регистрация</a>
        </div>
      </nav>

      <div className="container" style={{ padding: '20px 16px' }}>
        {/* AI Search Bar */}
        <form onSubmit={doAiSearch} className="ai-bar">
          <div className="ai-row">
            <span style={{ fontSize: 20, flexShrink: 0 }}>✨</span>
            <input
              className="ai-input"
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder='Опишите кого ищете, например: "тамада в Алматы на субботу вечером"'
            />
            <button type="submit" className="ai-btn" disabled={aiLoading}>
              {aiLoading ? '...' : 'Умный поиск'}
            </button>
          </div>
          {aiChips.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
              {aiMode && (
                <span className="badge">{aiMode === 'llm' ? '🤖 AI' : '📐 Правила'}</span>
              )}
              {aiChips.map((chip, i) => (
                <span key={i} className="badge badge-featured">✓ {chip}</span>
              ))}
            </div>
          )}
        </form>

        {/* Regular Filter Form */}
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
            <input className="input" style={{ flex: 1, minWidth: 120 }} type="date" value={f.date} onChange={e => setF(p => ({ ...p, date: e.target.value }))} />
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? '...' : 'Найти'}</button>
          </div>

          <button type="button" style={{ marginTop: 10, background: 'none', border: 'none', color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer', padding: '4px 0' }} onClick={() => setShowMore(v => !v)}>
            {showMore ? '▲ Скрыть фильтры' : '▼ Ещё фильтры'}
          </button>

          {showMore && (
            <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="input" style={{ flex: 1, minWidth: 120 }} type="time" value={f.timeFrom} onChange={e => setF(p => ({ ...p, timeFrom: e.target.value }))} title="Время с (Алматы)" />
                <input className="input" style={{ flex: 1, minWidth: 120 }} type="time" value={f.timeTo}   onChange={e => setF(p => ({ ...p, timeTo: e.target.value }))}   title="Время до (Алматы)" />
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
  const cats     = p.categories?.slice(0, 2).join(' · ') ?? '';
  const price    = p.min_price ? `от ${Number(p.min_price).toLocaleString('ru-RU')} ${p.min_currency ?? '₸'}` : '';
  const location = [p.city, p.region].filter(Boolean).join(', ');
  return (
    <a href={`/p/${p.slug}`} className="pcard" style={{ animationDelay: `${animDelay * 40}ms` }}>
      <div className="pcard-cover" style={{ backgroundImage: p.cover_url ? `url(${p.cover_url})` : undefined, background: p.cover_url ? undefined : 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' }}>
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
