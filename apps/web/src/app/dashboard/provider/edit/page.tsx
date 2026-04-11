'use client';
import { useEffect, useState, useRef } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = { id: string; display_name: string; slug: string; bio: string | null; city: string | null; region: string | null; timezone: string; publication_status: string; };
type Service = { id: string; category: string; title: string; price_from: string | null; currency: string; };
type Photo = { id: string; url: string; is_cover: boolean; };
type Link = { id: string; link_type: string; url: string; label: string | null; };

type RefRegion     = { id: string; name_ru: string; region_type: string; };
type RefCity       = { id: string; name_ru: string; region_id: string; };
type RefCategory   = { id: string; name_ru: string; code: string; icon: string | null; };
type RefSubcategory = { id: string; name_ru: string; category_id: string; };
type RefCurrency   = { id: string; code: string; symbol: string; };
type RefLinkType   = { id: string; code: string; name_ru: string; };

function getToken() { return localStorage.getItem('session_token') ?? ''; }
function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

// ── Hardcoded fallbacks (used when reference API is unavailable) ───────────
const FALLBACK_CATEGORIES: RefCategory[] = [
  { id: 'tamada',       code: 'tamada',       name_ru: 'Тамада',    icon: '🎤' },
  { id: 'photographer', code: 'photographer', name_ru: 'Фотограф',  icon: '📸' },
  { id: 'videographer', code: 'videographer', name_ru: 'Видеограф', icon: '🎬' },
  { id: 'dj',           code: 'dj',           name_ru: 'Диджей',    icon: '🎧' },
  { id: 'musician',     code: 'musician',     name_ru: 'Музыкант',  icon: '🎵' },
  { id: 'dancer',       code: 'dancer',       name_ru: 'Танцор',    icon: '💃' },
  { id: 'makeup_artist',code: 'makeup_artist',name_ru: 'Визажист',  icon: '💄' },
  { id: 'florist',      code: 'florist',      name_ru: 'Флорист',   icon: '🌸' },
  { id: 'animator',     code: 'animator',     name_ru: 'Аниматор',  icon: '🎪' },
  { id: 'show',         code: 'show',         name_ru: 'Шоу',       icon: '✨' },
  { id: 'host',         code: 'host',         name_ru: 'Ведущий',   icon: '🎙️' },
  { id: 'decorator',    code: 'decorator',    name_ru: 'Декоратор', icon: '🎨' },
  { id: 'baker',        code: 'baker',        name_ru: 'Кондитер',  icon: '🎂' },
  { id: 'stylist',      code: 'stylist',      name_ru: 'Стилист',   icon: '💅' },
  { id: 'catering',     code: 'catering',     name_ru: 'Кейтеринг',icon: '🍽️' },
  { id: 'other',        code: 'other',        name_ru: 'Другое',    icon: null },
];

const FALLBACK_CURRENCIES: RefCurrency[] = [
  { id: 'kzt', code: 'KZT', symbol: '₸' },
  { id: 'usd', code: 'USD', symbol: '$' },
  { id: 'eur', code: 'EUR', symbol: '€' },
  { id: 'rub', code: 'RUB', symbol: '₽' },
];

const FALLBACK_LINK_TYPES: RefLinkType[] = [
  { id: 'instagram', code: 'instagram', name_ru: 'Instagram' },
  { id: 'whatsapp',  code: 'whatsapp',  name_ru: 'WhatsApp'  },
  { id: 'telegram',  code: 'telegram',  name_ru: 'Telegram'  },
  { id: 'tiktok',    code: 'tiktok',    name_ru: 'TikTok'    },
  { id: 'youtube',   code: 'youtube',   name_ru: 'YouTube'   },
  { id: 'website',   code: 'website',   name_ru: 'Сайт'      },
  { id: 'two_gis',   code: 'two_gis',   name_ru: '2GIS'      },
  { id: 'map',       code: 'map',       name_ru: 'Карта'     },
  { id: 'other',     code: 'other',     name_ru: 'Другое'    },
];

async function fetchRef<T>(path: string): Promise<T[]> {
  try {
    const res = await fetch(`${API}${path}`);
    const data = await res.json() as Record<string, unknown>;
    const key = Object.keys(data).find(k => k !== 'ok') ?? '';
    const value = data[key];
    return Array.isArray(value) ? (value as T[]) : [];
  } catch { return []; }
}

// Transliterate Cyrillic → Latin for slug generation
const TRANSLIT: Record<string, string> = {
  'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
  'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
  'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'sch',
  'ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
  // Kazakh extra letters
  'ә':'a','ғ':'g','қ':'k','ң':'n','ө':'o','ұ':'u','ү':'u','һ':'h','і':'i',
};

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map(c => TRANSLIT[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export default function EditProviderPage() {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgColor, setMsgColor] = useState('#22c55e');
  // true while user hasn't manually edited the slug field
  const [slugAuto, setSlugAuto] = useState(true);

  // Reference data
  const [regions, setRegions]       = useState<RefRegion[]>([]);
  const [cities, setCities]         = useState<RefCity[]>([]);
  const [categories, setCategories] = useState<RefCategory[]>([]);
  const [subcategories, setSubcats] = useState<RefSubcategory[]>([]);
  const [currencies, setCurrencies] = useState<RefCurrency[]>([]);
  const [linkTypes, setLinkTypes]   = useState<RefLinkType[]>([]);

  // Forms
  const [form, setForm] = useState({ display_name: '', slug: '', bio: '', city: '', region: '', timezone: 'Asia/Almaty', publication_status: 'draft' });
  const [svcForm, setSvcForm] = useState({ category: '', subcategory: '', title: '', price_from: '', currency: 'KZT' });
  const [linkForm, setLinkForm] = useState({ link_type: 'instagram', url: '', label: '' });

  const fileRef = useRef<HTMLInputElement>(null);

  // Load reference data
  useEffect(() => {
    Promise.all([
      fetchRef<RefRegion>('/reference/regions'),
      fetchRef<RefCity>('/reference/cities'),
      fetchRef<RefCategory>('/reference/categories'),
      fetchRef<RefSubcategory>('/reference/subcategories'),
      fetchRef<RefCurrency>('/reference/currencies'),
      fetchRef<RefLinkType>('/reference/link-types'),
    ]).then(([r, c, cat, sub, cur, lt]) => {
      setRegions(r);
      setCities(c);
      setCategories(cat.length > 0 ? cat : FALLBACK_CATEGORIES);
      setSubcats(sub);
      setCurrencies(cur.length > 0 ? cur : FALLBACK_CURRENCIES);
      setLinkTypes(lt.length > 0 ? lt : FALLBACK_LINK_TYPES);
    }).catch(() => {
      // Reference API unavailable — use hardcoded fallbacks
      setCategories(FALLBACK_CATEGORIES);
      setCurrencies(FALLBACK_CURRENCIES);
      setLinkTypes(FALLBACK_LINK_TYPES);
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setProviderId(id);

    if (id) {
      fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then((data: { ok: boolean; providers?: Provider[] }) => {
          const p = data.providers?.find(x => x.id === id);
          if (p) {
            setProvider(p);
            setSlugAuto(false); // editing existing — keep slug as-is
            setForm({ display_name: p.display_name, slug: p.slug, bio: p.bio ?? '', city: p.city ?? '', region: p.region ?? '', timezone: p.timezone, publication_status: p.publication_status });
          }
        }).catch(() => null);
    }
    setLoading(false);
  }, []);

  async function loadProviderData(slug: string) {
    try {
      const res = await fetch(`${API}/public/providers/${slug}`);
      const data = await res.json() as { ok: boolean; services?: Service[]; photos?: Photo[]; links?: Link[] };
      if (data.ok) {
        setServices(data.services ?? []);
        setPhotos(data.photos ?? []);
        setLinks(data.links ?? []);
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (provider?.slug) void loadProviderData(provider.slug);
  }, [provider?.slug]);

  // Auto-update slug from display_name while user hasn't touched slug field
  function handleNameChange(name: string) {
    setForm(f => ({
      ...f,
      display_name: name,
      slug: slugAuto ? toSlug(name) : f.slug,
    }));
  }

  function handleSlugChange(slug: string) {
    setSlugAuto(false);
    setForm(f => ({ ...f, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 50) }));
  }

  // Cascading filters
  const filteredCities = form.region
    ? cities.filter(c => {
        const reg = regions.find(r => r.name_ru === form.region);
        return reg ? c.region_id === reg.id : true;
      })
    : cities;

  const filteredSubcats = svcForm.category
    ? subcategories.filter(s => {
        const cat = categories.find(c => c.name_ru === svcForm.category || c.code === svcForm.category);
        return cat ? s.category_id === cat.id : true;
      })
    : subcategories;

  async function saveProvider(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      if (providerId) {
        const res = await fetch(`${API}/providers/${providerId}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(form) });
        const data = await res.json() as { ok: boolean; error?: string };
        if (data.ok) {
          setMsgColor('#22c55e');
          setMsg('Сохранено');
        } else {
          setMsgColor('#ef4444');
          setMsg(data.error ?? 'Ошибка при сохранении');
        }
      } else {
        const res = await fetch(`${API}/providers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
        const data = await res.json() as { ok: boolean; provider?: Provider; error?: string };
        if (data.ok && data.provider) {
          window.location.href = `/dashboard/provider/edit?id=${data.provider.id}`;
          return;
        }
        // Show error (e.g. duplicate slug)
        setMsgColor('#ef4444');
        if (data.error?.toLowerCase().includes('slug') || data.error?.toLowerCase().includes('unique') || data.error?.toLowerCase().includes('уже занят')) {
          setMsg('Этот URL уже занят — попробуйте изменить');
        } else {
          setMsg(data.error ?? 'Ошибка при создании профиля');
        }
      }
    } catch (err) {
      setMsgColor('#ef4444');
      setMsg('Ошибка соединения с сервером');
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId) return;
    try {
      await fetch(`${API}/providers/${providerId}/services`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...svcForm, price_from: svcForm.price_from ? Number(svcForm.price_from) : undefined }) });
      setSvcForm({ category: '', subcategory: '', title: '', price_from: '', currency: 'KZT' });
      if (provider?.slug) void loadProviderData(provider.slug);
    } catch { /* ignore */ }
  }

  async function deleteService(id: string) {
    if (!providerId) return;
    try {
      await fetch(`${API}/providers/${providerId}/services/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_active: false }) });
      if (provider?.slug) void loadProviderData(provider.slug);
    } catch { /* ignore */ }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!providerId || !e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    try {
      await fetch(`${API}/providers/${providerId}/photos`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData });
      if (provider?.slug) void loadProviderData(provider.slug);
    } catch { /* ignore */ }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deletePhoto(id: string) {
    if (!providerId) return;
    try {
      await fetch(`${API}/providers/${providerId}/photos/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (provider?.slug) void loadProviderData(provider.slug);
    } catch { /* ignore */ }
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId) return;
    try {
      await fetch(`${API}/providers/${providerId}/links`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(linkForm) });
      setLinkForm({ link_type: linkTypes[0]?.code ?? 'instagram', url: '', label: '' });
      if (provider?.slug) void loadProviderData(provider.slug);
    } catch { /* ignore */ }
  }

  async function deleteLink(id: string) {
    if (!providerId) return;
    try {
      await fetch(`${API}/providers/${providerId}/links/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (provider?.slug) void loadProviderData(provider.slug);
    } catch { /* ignore */ }
  }

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  return (
    <div style={s.page}>
      <div style={s.topBar}>
        <a href="/dashboard/provider" style={s.back}>← Мои профили</a>
        {provider && <a href={`/p/${provider.slug}`} target="_blank" style={s.viewBtn}>Открыть публично</a>}
      </div>

      <h1 style={s.title}>{providerId ? 'Редактировать профиль' : 'Создать профиль'}</h1>

      {/* Basic Info */}
      <section style={s.section}>
        <h2 style={s.sectionTitle}>Основное</h2>
        <form onSubmit={saveProvider}>
          <div style={s.grid2}>
            <label style={s.label}>
              Имя
              <input style={s.input} value={form.display_name} onChange={e => handleNameChange(e.target.value)} required />
            </label>
            <label style={s.label}>
              URL профиля
              <input
                style={{ ...s.input, color: slugAuto ? '#9ca3af' : '#111' }}
                value={form.slug}
                onChange={e => handleSlugChange(e.target.value)}
                placeholder="my-profile"
                required
              />
              <span style={s.hint}>tamada.kz/p/{form.slug || '...'}</span>
            </label>
            <label style={s.label}>Регион
              <select style={s.input} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value, city: '' }))}>
                <option value="">— не выбран —</option>
                {regions.map(r => <option key={r.id} value={r.name_ru}>{r.name_ru}</option>)}
              </select>
            </label>
            <label style={s.label}>Город
              <select style={s.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
                <option value="">— не выбран —</option>
                {filteredCities.map(c => <option key={c.id} value={c.name_ru}>{c.name_ru}</option>)}
              </select>
            </label>
          </div>
          <label style={s.label}>О себе<textarea style={{ ...s.input, height: 80 }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></label>
          <label style={s.label}>Статус публикации
            <select style={s.input} value={form.publication_status} onChange={e => setForm(f => ({ ...f, publication_status: e.target.value }))}>
              <option value="draft">Черновик</option>
              <option value="visible">Виден</option>
              <option value="hidden">Скрыт</option>
            </select>
          </label>
          {msg && <p style={{ color: msgColor, margin: '8px 0' }}>{msg}</p>}
          <button type="submit" style={s.btn} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
        </form>
      </section>

      {providerId && (
        <>
          {/* Services */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Услуги</h2>
            {services.map(sv => (
              <div key={sv.id} style={s.row}>
                <span>{sv.title} <small style={{ color: '#9ca3af' }}>{sv.category}</small></span>
                {sv.price_from && <span style={s.price}>{sv.price_from} {sv.currency}</span>}
                <button onClick={() => deleteService(sv.id)} style={s.del}>✕</button>
              </div>
            ))}
            <form onSubmit={addService} style={{ ...s.inlineForm, flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select style={s.inputSm} value={svcForm.category} onChange={e => setSvcForm(f => ({ ...f, category: e.target.value, subcategory: '' }))} required>
                  <option value="">Категория</option>
                  {categories.map(c => <option key={c.id} value={c.name_ru}>{c.icon ? `${c.icon} ` : ''}{c.name_ru}</option>)}
                </select>
                {filteredSubcats.length > 0 && (
                  <select style={s.inputSm} value={svcForm.subcategory} onChange={e => setSvcForm(f => ({ ...f, subcategory: e.target.value }))}>
                    <option value="">Подкатегория</option>
                    {filteredSubcats.map(sc => <option key={sc.id} value={sc.name_ru}>{sc.name_ru}</option>)}
                  </select>
                )}
                <input style={s.inputSm} placeholder="Название услуги" value={svcForm.title} onChange={e => setSvcForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input style={{ ...s.inputSm, width: 100 }} placeholder="Цена от" value={svcForm.price_from} onChange={e => setSvcForm(f => ({ ...f, price_from: e.target.value }))} />
                <select style={{ ...s.inputSm, width: 90 }} value={svcForm.currency} onChange={e => setSvcForm(f => ({ ...f, currency: e.target.value }))}>
                  {currencies.map(c => <option key={c.id} value={c.code}>{c.code} {c.symbol}</option>)}
                </select>
                <button type="submit" style={s.btnSm}>+ Добавить</button>
              </div>
            </form>
          </section>

          {/* Photos */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Фото <small style={{ color: '#9ca3af', fontWeight: 400 }}>(макс. 5)</small></h2>
            <div style={s.photoGrid}>
              {photos.map(ph => (
                <div key={ph.id} style={s.photoCard}>
                  <img src={ph.url} alt="" style={s.photo} />
                  {ph.is_cover && <span style={s.cover}>Обложка</span>}
                  <button onClick={() => deletePhoto(ph.id)} style={s.delPhoto}>✕</button>
                </div>
              ))}
              {photos.length < 5 && (
                <label style={s.uploadBox}>
                  <span>+</span>
                  <input ref={fileRef} type="file" accept="image/*" onChange={uploadPhoto} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </section>

          {/* Links */}
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Ссылки</h2>
            {links.map(lk => (
              <div key={lk.id} style={s.row}>
                <span style={s.linkType}>{lk.link_type}</span>
                <a href={lk.url} target="_blank" style={s.linkUrl}>{lk.label ?? lk.url}</a>
                <button onClick={() => deleteLink(lk.id)} style={s.del}>✕</button>
              </div>
            ))}
            <form onSubmit={addLink} style={s.inlineForm}>
              <select style={s.inputSm} value={linkForm.link_type} onChange={e => setLinkForm(f => ({ ...f, link_type: e.target.value }))}>
                {linkTypes.map(t => <option key={t.id} value={t.code}>{t.name_ru}</option>)}
              </select>
              <input style={s.inputSm} placeholder="URL" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} required />
              <input style={s.inputSm} placeholder="Подпись" value={linkForm.label} onChange={e => setLinkForm(f => ({ ...f, label: e.target.value }))} />
              <button type="submit" style={s.btnSm}>+ Добавить</button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 760, margin: '0 auto', padding: '32px 16px', fontFamily: 'system-ui, sans-serif' },
  topBar: { display: 'flex', justifyContent: 'space-between', marginBottom: 24 },
  back: { color: '#666', textDecoration: 'none', fontSize: 14 },
  viewBtn: { color: '#3b82f6', textDecoration: 'none', fontSize: 14 },
  title: { margin: '0 0 24px', fontSize: 22, fontWeight: 700 },
  section: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24, marginBottom: 20 },
  sectionTitle: { margin: '0 0 16px', fontSize: 16, fontWeight: 600 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14, color: '#374151', marginBottom: 12 },
  input: { padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, outline: 'none', transition: 'border-color .2s', width: '100%', boxSizing: 'border-box' },
  hint: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  inputSm: { padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, flex: 1 },
  btn: { background: '#111', color: '#fff', padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 },
  btnSm: { background: '#111', color: '#fff', padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' },
  row: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' },
  price: { color: '#6b7280', fontSize: 13 },
  del: { marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '2px 6px' },
  inlineForm: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  photoGrid: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  photoCard: { position: 'relative', width: 120, height: 120 },
  photo: { width: 120, height: 120, objectFit: 'cover', borderRadius: 8 },
  cover: { position: 'absolute', bottom: 4, left: 4, background: '#111', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 },
  delPhoto: { position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,.5)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 },
  uploadBox: { width: 120, height: 120, border: '2px dashed #d1d5db', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 28, color: '#9ca3af' },
  linkType: { background: '#f3f4f6', padding: '2px 8px', borderRadius: 4, fontSize: 12, color: '#374151' },
  linkUrl: { color: '#3b82f6', fontSize: 13, textDecoration: 'none', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
};
