'use client';
import { useEffect, useState, useRef } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = { id: string; display_name: string; slug: string; bio: string | null; city: string | null; region: string | null; timezone: string; publication_status: string; };
type Service = { id: string; category: string; title: string; price_from: string | null; currency: string; };
type Photo = { id: string; url: string; is_cover: boolean; };
type Link = { id: string; link_type: string; url: string; label: string | null; };

function getToken() { return localStorage.getItem('session_token') ?? ''; }
function authHeaders() { return { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' }; }

export default function EditProviderPage() {
  const [providerId, setProviderId] = useState<string | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Create form
  const [form, setForm] = useState({ display_name: '', slug: '', bio: '', city: '', region: '', timezone: 'Asia/Almaty', publication_status: 'draft' });
  // Service form
  const [svcForm, setSvcForm] = useState({ category: '', title: '', price_from: '', currency: 'KZT' });
  // Link form
  const [linkForm, setLinkForm] = useState({ link_type: 'instagram', url: '', label: '' });

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    setProviderId(id);

    if (id) {
      Promise.all([
        fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]).then(([data]: [{ ok: boolean; providers?: Provider[] }]) => {
        const p = data.providers?.find(x => x.id === id);
        if (p) {
          setProvider(p);
          setForm({ display_name: p.display_name, slug: p.slug, bio: p.bio ?? '', city: p.city ?? '', region: p.region ?? '', timezone: p.timezone, publication_status: p.publication_status });
        }
      }).catch(() => null);

      fetch(`${API}/public/providers/${id}`, {}).then(async r => {
        // try slug lookup later — for now load services/photos/links via separate calls if needed
      }).catch(() => null);

      // Load services, photos, links via public endpoint after slug is known
    }
    setLoading(false);
  }, []);

  async function loadProviderData(slug: string) {
    const res = await fetch(`${API}/public/providers/${slug}`);
    const data = await res.json() as { ok: boolean; services?: Service[]; photos?: Photo[]; links?: Link[] };
    if (data.ok) {
      setServices(data.services ?? []);
      setPhotos(data.photos ?? []);
      setLinks(data.links ?? []);
    }
  }

  useEffect(() => {
    if (provider?.slug) void loadProviderData(provider.slug);
  }, [provider?.slug]);

  async function saveProvider(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      if (providerId) {
        await fetch(`${API}/providers/${providerId}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(form) });
        setMsg('Сохранено');
      } else {
        const res = await fetch(`${API}/providers`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(form) });
        const data = await res.json() as { ok: boolean; provider?: Provider };
        if (data.ok && data.provider) {
          window.location.href = `/dashboard/provider/edit?id=${data.provider.id}`;
        }
      }
    } finally { setSaving(false); }
  }

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId) return;
    await fetch(`${API}/providers/${providerId}/services`, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ ...svcForm, price_from: svcForm.price_from ? Number(svcForm.price_from) : undefined }) });
    setSvcForm({ category: '', title: '', price_from: '', currency: 'KZT' });
    if (provider?.slug) void loadProviderData(provider.slug);
  }

  async function deleteService(id: string) {
    if (!providerId) return;
    await fetch(`${API}/providers/${providerId}/services/${id}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify({ is_active: false }) });
    if (provider?.slug) void loadProviderData(provider.slug);
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    if (!providerId || !e.target.files?.[0]) return;
    const formData = new FormData();
    formData.append('file', e.target.files[0]);
    await fetch(`${API}/providers/${providerId}/photos`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` }, body: formData });
    if (provider?.slug) void loadProviderData(provider.slug);
    if (fileRef.current) fileRef.current.value = '';
  }

  async function deletePhoto(id: string) {
    if (!providerId) return;
    await fetch(`${API}/providers/${providerId}/photos/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (provider?.slug) void loadProviderData(provider.slug);
  }

  async function addLink(e: React.FormEvent) {
    e.preventDefault();
    if (!providerId) return;
    await fetch(`${API}/providers/${providerId}/links`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(linkForm) });
    setLinkForm({ link_type: 'instagram', url: '', label: '' });
    if (provider?.slug) void loadProviderData(provider.slug);
  }

  async function deleteLink(id: string) {
    if (!providerId) return;
    await fetch(`${API}/providers/${providerId}/links/${id}`, { method: 'DELETE', headers: authHeaders() });
    if (provider?.slug) void loadProviderData(provider.slug);
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
            <label style={s.label}>Имя<input style={s.input} value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} required /></label>
            <label style={s.label}>Slug (URL)<input style={s.input} value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="my-profile" required /></label>
            <label style={s.label}>Город<input style={s.input} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></label>
            <label style={s.label}>Регион<input style={s.input} value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} /></label>
          </div>
          <label style={s.label}>О себе<textarea style={{ ...s.input, height: 80 }} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} /></label>
          <label style={s.label}>Статус публикации
            <select style={s.input} value={form.publication_status} onChange={e => setForm(f => ({ ...f, publication_status: e.target.value }))}>
              <option value="draft">Черновик</option>
              <option value="visible">Виден</option>
              <option value="hidden">Скрыт</option>
            </select>
          </label>
          {msg && <p style={{ color: '#22c55e' }}>{msg}</p>}
          <button type="submit" style={s.btn} disabled={saving}>{saving ? '...' : 'Сохранить'}</button>
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
            <form onSubmit={addService} style={s.inlineForm}>
              <input style={s.inputSm} placeholder="Категория" value={svcForm.category} onChange={e => setSvcForm(f => ({ ...f, category: e.target.value }))} required />
              <input style={s.inputSm} placeholder="Название" value={svcForm.title} onChange={e => setSvcForm(f => ({ ...f, title: e.target.value }))} required />
              <input style={{ ...s.inputSm, width: 80 }} placeholder="Цена" value={svcForm.price_from} onChange={e => setSvcForm(f => ({ ...f, price_from: e.target.value }))} />
              <button type="submit" style={s.btnSm}>+ Добавить</button>
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
                {['instagram','whatsapp','telegram','tiktok','youtube','website','two_gis','map','other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
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
