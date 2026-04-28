'use client';
import { useEffect, useRef, useState } from 'react';
import { FaWhatsapp, FaTelegram, FaInstagram, FaGlobe, FaPhone } from 'react-icons/fa';
import { OctiMark } from '@/components/OctiLogo';
import { normalizeLinkUrl, cleanPastedUrl } from '@/lib/linkUrl';

import { API_URL as API } from '@/lib/env';

// ── Types ────────────────────────────────────────────────────────────────────
import type {
  Provider, ProviderPhoto as Photo, ProviderLink as Link,
  RefRegion, RefCity, RefCategory, RefSubcategory as RefSubcat,
} from '@tamada/types';
type TgAccount = { id: string; telegram_username: string | null; telegram_first_name: string | null; status: string };

const FALLBACK_CATEGORIES: RefCategory[] = [
  { id: 'tamada',       code: 'tamada',       name_ru: 'Тамада',    icon: '🎤' },
  { id: 'photographer', code: 'photographer', name_ru: 'Фотограф',  icon: '📸' },
  { id: 'videographer', code: 'videographer', name_ru: 'Видеограф', icon: '🎬' },
  { id: 'dj',           code: 'dj',           name_ru: 'Диджей',    icon: '🎧' },
  { id: 'musician',     code: 'musician',     name_ru: 'Музыкант',  icon: '🎵' },
  { id: 'dancer',       code: 'dancer',       name_ru: 'Танцор',    icon: '💃' },
  { id: 'makeup_artist',code: 'makeup_artist',name_ru: 'Визажист',  icon: '💄' },
  { id: 'animator',     code: 'animator',     name_ru: 'Аниматор',  icon: '🎪' },
  { id: 'host',         code: 'host',         name_ru: 'Ведущий',   icon: '🎙️' },
  { id: 'decorator',    code: 'decorator',    name_ru: 'Декоратор', icon: '🎨' },
  { id: 'baker',        code: 'baker',        name_ru: 'Кондитер',  icon: '🎂' },
  { id: 'other',        code: 'other',        name_ru: 'Другое',    icon: null },
];

const STEPS = [
  { n: 1, label: 'Основное',   icon: '👤' },
  { n: 2, label: 'Фото',       icon: '📷' },
  { n: 3, label: 'Контакты',   icon: '📲' },
  { n: 4, label: 'Telegram',   icon: '✈️' },
  { n: 5, label: 'Календарь',  icon: '📅' },
];
const TOTAL = STEPS.length;

// Slug from Cyrillic name
function toSlug(s: string) {
  const m: Record<string, string> = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
    'щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'ә':'a','ғ':'g','қ':'k','ң':'n','ө':'o','ұ':'u','ү':'u','і':'i',
  };
  return s.toLowerCase().split('').map(c => m[c] ?? (/[a-z0-9]/.test(c) ? c : '-')).join('')
    .replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
}

function getToken() { return localStorage.getItem('session_token') ?? ''; }

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep]           = useState(1);
  const [saving, setSaving]       = useState(false);
  const [provider, setProvider]   = useState<Provider | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  // Load existing provider + resume step
  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    Promise.all([
      fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/dashboard/onboarding`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([me, ob]: [
      { ok: boolean; providers?: Provider[] },
      { ok: boolean; onboarding?: { current_step: number; status: string } }
    ]) => {
      const p = me.providers?.[0] ?? null;
      if (p) setProvider(p);
      if (ob.ok && ob.onboarding) {
        if (ob.onboarding.status === 'completed') {
          window.location.href = '/dashboard';
          return;
        }
        setStep(ob.onboarding.current_step ?? 1);
      }
    }).catch(() => null).finally(() => setInitLoading(false));
  }, []);

  async function saveStep(n: number) {
    if (!provider) return;
    await fetch(`${API}/dashboard/onboarding`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id, step: n }),
    }).catch(() => null);
  }

  async function goNext(nextStep?: number) {
    const target = nextStep ?? step + 1;
    if (provider) await saveStep(target);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStep(target);
  }

  async function finish() {
    if (!provider) { window.location.href = '/dashboard'; return; }
    setSaving(true);
    await fetch(`${API}/dashboard/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id }),
    }).catch(() => null);
    setSaving(false);
    window.location.href = '/dashboard';
  }

  if (initLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
    </div>
  );

  const pct = Math.round(((step - 1) / TOTAL) * 100);

  return (
    <div ref={topRef} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark" style={{ fontSize: 17 }}>
          <OctiMark size={28} />
          Octiqa
        </a>
        <a href="/dashboard" className="btn btn-ghost btn-sm">Пропустить</a>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 64px' }}>

        {/* Progress */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>Шаг {step} из {TOTAL}</span>
            <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--grad-brand)', borderRadius: 3, transition: 'width .4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 12 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: s.n < step ? 13 : 12,
                  background: s.n < step ? 'var(--brand)' : s.n === step ? 'var(--brand)' : 'var(--border)',
                  color: s.n <= step ? '#fff' : 'var(--ink-4)',
                  fontWeight: 700,
                  transition: 'all .3s',
                }}>
                  {s.n < step ? '✓' : s.n}
                </div>
                <div style={{ fontSize: 10, color: s.n === step ? 'var(--brand)' : 'var(--ink-4)', fontWeight: s.n === step ? 700 : 400 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="anim-fadeUp" key={step}>
          {step === 1 && (
            <Step1Basics
              provider={provider}
              onDone={(p) => { setProvider(p); void goNext(); }}
            />
          )}
          {step === 2 && provider && (
            <Step2Photos
              provider={provider}
              onNext={() => void goNext()}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && provider && (
            <Step3Contacts
              provider={provider}
              onNext={() => void goNext()}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && provider && (
            <Step4Telegram
              provider={provider}
              onNext={() => void goNext()}
              onSkip={() => void goNext()}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && provider && (
            <Step5Calendar
              provider={provider}
              onDone={() => void finish()}
              onSkip={() => void finish()}
              onBack={() => setStep(4)}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Basics ────────────────────────────────────────────────────────────
function Step1Basics({ provider, onDone }: { provider: Provider | null; onDone: (p: Provider) => void }) {
  const [name, setName]         = useState(provider?.display_name ?? '');
  const [slug, setSlug]         = useState(provider?.slug ?? '');
  const [slugAuto, setSlugAuto] = useState(!provider);

  // Reference data
  const [regions, setRegions]         = useState<RefRegion[]>([]);
  const [allCities, setAllCities]     = useState<RefCity[]>([]);
  const [categories, setCategories]   = useState<RefCategory[]>([]);
  const [subcats, setSubcats]         = useState<RefSubcat[]>([]);

  // Selections
  const [regionId, setRegionId]   = useState('');
  const [cityName, setCityName]   = useState(provider?.city ?? '');
  const [catCode, setCatCode]     = useState('');
  const [subcatName, setSubcatName] = useState('');
  const [customCat, setCustomCat] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  // Load reference data once
  useEffect(() => {
    Promise.all([
      fetch(`${API}/reference/regions`).then(r => r.json()),
      fetch(`${API}/reference/cities`).then(r => r.json()),
      fetch(`${API}/reference/categories`).then(r => r.json()),
      fetch(`${API}/reference/subcategories`).then(r => r.json()),
    ]).then(([rr, rc, rcat, rsub]: [
      { ok: boolean; regions?: RefRegion[] },
      { ok: boolean; cities?: RefCity[] },
      { ok: boolean; categories?: RefCategory[] },
      { ok: boolean; subcategories?: RefSubcat[] },
    ]) => {
      setRegions(rr.regions ?? []);
      setAllCities(rc.cities ?? []);
      setCategories(rcat.categories?.length ? rcat.categories : FALLBACK_CATEGORIES);
      setSubcats(rsub.subcategories ?? []);

      // Pre-select region if provider has city/region
      if (provider?.region) {
        const reg = (rr.regions ?? []).find(r => r.name_ru === provider.region);
        if (reg) setRegionId(reg.id);
      }
    }).catch(() => {
      setCategories(FALLBACK_CATEGORIES);
    });
  }, []);

  // Cities filtered by selected region
  const filteredCities = regionId ? allCities.filter(c => c.region_id === regionId) : allCities;

  // Subcategories filtered by selected category
  const filteredSubcats = catCode ? subcats.filter(s => s.category_code === catCode) : [];

  function handleNameChange(v: string) {
    setName(v);
    if (slugAuto) setSlug(toSlug(v));
  }

  function handleRegionChange(id: string) {
    setRegionId(id);
    setCityName(''); // reset city when region changes
  }

  async function submit() {
    if (!name.trim())     { setError('Введите имя'); return; }
    if (!slug.trim())     { setError('Укажите ссылку профиля'); return; }
    if (!cityName.trim()) { setError('Выберите город'); return; }

    setSaving(true); setError('');
    const token = getToken();
    const regionName = regions.find(r => r.id === regionId)?.name_ru ?? '';

    try {
      let p: Provider;
      if (provider) {
        const res = await fetch(`${API}/providers/${provider.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: name, city: cityName, region: regionName }),
        });
        const d = await res.json() as { ok: boolean; provider?: Provider; error?: string };
        if (!d.ok) { setError(d.error ?? 'Ошибка'); setSaving(false); return; }
        p = d.provider!;
      } else {
        const res = await fetch(`${API}/providers`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ display_name: name, slug, city: cityName, region: regionName }),
        });
        const d = await res.json() as { ok: boolean; provider?: Provider; error?: string };
        if (!d.ok) { setError(d.error ?? 'Ошибка'); setSaving(false); return; }
        p = d.provider!;
      }

      // Add service with selected category
      if (catCode) {
        const cat = categories.find(c => c.code === catCode);
        const categoryName = catCode === '__custom__' ? customCat.trim() : (cat?.name_ru ?? catCode);
        if (categoryName) {
          await fetch(`${API}/providers/${p.id}/services`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              category: categoryName,
              subcategory: catCode !== '__custom__' ? (subcatName || undefined) : undefined,
              title: (catCode !== '__custom__' ? subcatName : '') || categoryName || name,
            }),
          }).catch(() => null);
        }
      }

      onDone(p);
    } catch { setError('Ошибка сети'); }
    setSaving(false);
  }

  return (
    <div>
      <StepHeader icon="👤" title="Расскажите о себе" sub="Имя, город и направление — основа вашего профиля" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        <Field label="Ваше имя / название">
          <input className="input" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="Например: Дмитрий Козлов" />
        </Field>

        {!provider && (
          <Field label="Ссылка на профиль" hint={`octiqa.kz/p/${slug || '...'}`}>
            <input className="input" value={slug}
              onChange={e => { setSlugAuto(false); setSlug(toSlug(e.target.value)); }}
              placeholder="dmitry-kozlov" />
          </Field>
        )}

        <Field label="Регион">
          <select className="input" value={regionId} onChange={e => handleRegionChange(e.target.value)}>
            <option value="">— выберите регион —</option>
            {regions.map(r => <option key={r.id} value={r.id}>{r.name_ru}</option>)}
          </select>
        </Field>

        <Field label="Город">
          <select className="input" value={cityName} onChange={e => setCityName(e.target.value)}>
            <option value="">— выберите город —</option>
            {filteredCities.map(c => <option key={c.id} value={c.name_ru}>{c.name_ru}</option>)}
          </select>
        </Field>

        <Field label="Направление (категория)">
          <select className="input" value={catCode} onChange={e => { setCatCode(e.target.value); setSubcatName(''); setCustomCat(''); }}>
            <option value="">— выберите категорию —</option>
            {categories.map(c => <option key={c.id} value={c.code}>{c.icon ? `${c.icon} ` : ''}{c.name_ru}</option>)}
            <option value="__custom__">✏️ Написать своё...</option>
          </select>
        </Field>

        {catCode === '__custom__' && (
          <Field label="Ваше направление" hint="Например: Шоу-программа, Живая музыка, Свадебный организатор...">
            <input
              className="input"
              value={customCat}
              onChange={e => setCustomCat(e.target.value)}
              placeholder="Введите свою категорию"
              autoFocus
            />
          </Field>
        )}

        {catCode !== '__custom__' && filteredSubcats.length > 0 && (
          <Field label="Подкатегория">
            <select className="input" value={subcatName} onChange={e => setSubcatName(e.target.value)}>
              <option value="">— любая —</option>
              {filteredSubcats.map(s => <option key={s.id} value={s.name_ru}>{s.name_ru}</option>)}
            </select>
          </Field>
        )}

        {error && <p style={{ color: 'var(--red)', fontSize: 13, margin: 0 }}>{error}</p>}
        <button onClick={() => void submit()} disabled={saving} className="btn btn-brand btn-lg btn-full" style={{ marginTop: 4 }}>
          {saving ? 'Сохранение...' : 'Далее →'}
        </button>
      </div>
    </div>
  );
}

// ── Step 2: Photos ────────────────────────────────────────────────────────────
function Step2Photos({ provider, onNext, onBack }: { provider: Provider; onNext: () => void; onBack: () => void }) {
  const [photos, setPhotos]   = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/providers/${provider.id}/data`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json())
      .then((d: { ok: boolean; photos?: Photo[] }) => { if (d.ok) setPhotos(d.photos ?? []); })
      .catch(() => null);
  }, [provider.id]);

  async function upload(file: File) {
    if (photos.length >= 5) { setError('Максимум 5 фото'); return; }
    setUploading(true); setError('');
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch(`${API}/providers/${provider.id}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const d = await res.json() as { ok: boolean; photo?: Photo; error?: string };
      if (d.ok && d.photo) setPhotos(prev => [...prev, d.photo!]);
      else setError(d.error ?? 'Ошибка загрузки');
    } catch { setError('Ошибка сети'); }
    setUploading(false);
  }

  async function deletePhoto(id: string) {
    await fetch(`${API}/providers/${provider.id}/photos/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    setPhotos(prev => prev.filter(p => p.id !== id));
  }

  return (
    <div>
      <StepHeader icon="📷" title="Добавьте фото" sub="Хотя бы одно фото сделает профиль в 3× привлекательнее" />

      {/* Upload zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: '2px dashed var(--border)', borderRadius: 'var(--r-xl)', padding: '28px 20px',
          textAlign: 'center', cursor: 'pointer', marginBottom: 16, background: 'var(--surface)',
          transition: 'border-color .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--brand)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📸</div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
          {uploading ? 'Загружаю...' : 'Нажмите чтобы выбрать фото'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>JPEG, PNG, WebP · до 10 МБ · максимум 5 фото</div>
        <input
          ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }}
        />
      </div>

      {/* Photo grid */}
      {photos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8, marginBottom: 16 }}>
          {photos.map(ph => (
            <div key={ph.id} style={{ position: 'relative', aspectRatio: '1' }}>
              <img src={ph.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }} />
              {ph.is_cover && (
                <span style={{ position: 'absolute', top: 4, left: 4, fontSize: 9, background: 'var(--brand)', color: '#fff', padding: '2px 6px', borderRadius: 8, fontWeight: 700 }}>ОБЛОЖКА</span>
              )}
              <button
                onClick={() => void deletePhoto(ph.id)}
                style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,.6)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={photos.length === 0 ? 'Пропустить →' : 'Далее →'}
        nextVariant={photos.length === 0 ? 'ghost' : 'brand'}
      />
    </div>
  );
}

// ── Step 3: Contacts ─────────────────────────────────────────────────────────
const CONTACT_OPTS = [
  { value: 'whatsapp',  label: 'WhatsApp',  Icon: FaWhatsapp,  placeholder: 'https://wa.me/77001234567' },
  { value: 'telegram',  label: 'Telegram',  Icon: FaTelegram,  placeholder: 'https://t.me/username' },
  { value: 'instagram', label: 'Instagram', Icon: FaInstagram, placeholder: 'https://instagram.com/username' },
  { value: 'phone',     label: 'Телефон',   Icon: FaPhone,     placeholder: 'tel:+77001234567' },
  { value: 'website',   label: 'Сайт',      Icon: FaGlobe,     placeholder: 'https://example.com' },
];

function Step3Contacts({ provider, onNext, onBack }: { provider: Provider; onNext: () => void; onBack: () => void }) {
  const [links, setLinks]         = useState<Link[]>([]);
  const [type, setType]           = useState('whatsapp');
  const [url, setUrl]             = useState('');
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    fetch(`${API}/providers/${provider.id}/data`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json())
      .then((d: { ok: boolean; links?: Link[] }) => { if (d.ok) setLinks(d.links ?? []); })
      .catch(() => null);
  }, [provider.id]);

  async function addLink() {
    const check = normalizeLinkUrl(url);
    if (!check.ok) { setError(check.error); return; }
    setAdding(true); setError('');
    try {
      const res = await fetch(`${API}/providers/${provider.id}/links`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_type: type, url: check.url }),
      });
      const d = await res.json() as { ok: boolean; link?: Link; error?: string };
      if (d.ok && d.link) { setLinks(prev => [...prev, d.link!]); setUrl(''); }
      else setError(d.error ?? 'Ошибка');
    } catch { setError('Ошибка сети'); }
    setAdding(false);
  }

  async function removeLink(id: string) {
    await fetch(`${API}/providers/${provider.id}/links/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    setLinks(prev => prev.filter(l => l.id !== id));
  }

  const selectedOpt = CONTACT_OPTS.find(o => o.value === type) ?? CONTACT_OPTS[0]!;

  return (
    <div>
      <StepHeader icon="📲" title="Контакты" sub="Как клиенты будут связываться с вами после просмотра профиля" />

      {/* Add form */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {CONTACT_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setType(opt.value); setUrl(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 20, border: '1.5px solid', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                borderColor: type === opt.value ? 'var(--brand)' : 'var(--border)',
                background: type === opt.value ? 'var(--brand-xlight)' : 'transparent',
                color: type === opt.value ? 'var(--brand)' : 'var(--ink-3)',
              }}
            >
              <opt.Icon size={13} /> {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={url}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={e => { setUrl(e.target.value); if (error) setError(''); }}
            onPaste={e => {
              const pasted = e.clipboardData.getData('text');
              if (!pasted) return;
              const cleaned = cleanPastedUrl(pasted);
              if (cleaned !== pasted) {
                e.preventDefault();
                setUrl(cleaned);
                if (error) setError('');
              }
            }}
            placeholder={selectedOpt.placeholder}
            onKeyDown={e => { if (e.key === 'Enter') void addLink(); }}
          />
          <button onClick={() => void addLink()} disabled={adding} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            {adding ? '...' : '+ Добавить'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      </div>

      {/* Added links */}
      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {links.map(lk => {
            const opt = CONTACT_OPTS.find(o => o.value === lk.link_type);
            return (
              <div key={lk.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                {opt ? <opt.Icon size={18} style={{ flexShrink: 0, color: 'var(--ink-3)' }} /> : <span>🔗</span>}
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{lk.url}</span>
                <button onClick={() => void removeLink(lk.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {links.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', marginBottom: 16 }}>Добавьте хотя бы один способ связи</p>
      )}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={links.length === 0 ? 'Пропустить →' : 'Далее →'}
        nextVariant={links.length === 0 ? 'ghost' : 'brand'}
      />
    </div>
  );
}

// ── Step 4: Telegram ──────────────────────────────────────────────────────────
function Step4Telegram({ provider, onNext, onSkip, onBack }: {
  provider: Provider; onNext: () => void; onSkip: () => void; onBack: () => void;
}) {
  const [accounts, setAccounts]   = useState<TgAccount[]>([]);
  const [deepLink, setDeepLink]   = useState('');
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    fetch(`${API}/providers/${provider.id}/telegram-accounts`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json())
      .then((d: { ok: boolean; accounts?: TgAccount[] }) => { if (d.ok) setAccounts(d.accounts ?? []); })
      .catch(() => null);
  }, [provider.id]);

  async function generateLink() {
    setLoading(true); setDeepLink('');
    try {
      const res = await fetch(`${API}/telegram/link-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: provider.id }),
      });
      const d = await res.json() as { ok: boolean; deep_link?: string };
      if (d.ok && d.deep_link) setDeepLink(d.deep_link);
    } catch { /* ignore */ }
    setLoading(false);
  }

  const linked = accounts.filter(a => a.status === 'linked');

  return (
    <div>
      <StepHeader icon="✈️" title="Telegram-бот" sub="Быстро отмечайте занятость и получайте напоминания — прямо в Telegram" />

      {/* Benefits */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        {[
          '📅 Отмечайте занятые дни командой «занято 12.04 13:00 18:00»',
          '🔔 Бот напомнит о событиях за день',
          '👥 Можно подключить помощника или супруга/у',
          '📊 Команда «календарь» — ближайшие 7 дней',
        ].map(t => (
          <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.4 }}>
            <span>{t}</span>
          </div>
        ))}
      </div>

      {/* Connected accounts */}
      {linked.length > 0 && (
        <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green-text)' }}>Telegram подключён</div>
            <div style={{ fontSize: 12, color: 'var(--green-text)' }}>
              {linked.map(a => a.telegram_first_name ?? (a.telegram_username ? `@${a.telegram_username}` : 'аккаунт')).join(', ')}
            </div>
          </div>
        </div>
      )}

      {linked.length === 0 && (
        deepLink ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 16, marginBottom: 16, textAlign: 'center' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--ink-3)' }}>Ссылка действует 15 минут. Откройте в Telegram:</p>
            <a href={deepLink} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-full">
              <FaTelegram size={16} style={{ marginRight: 8 }} />Открыть Telegram
            </a>
            <p style={{ margin: '10px 0 0', fontSize: 11, color: 'var(--ink-4)', wordBreak: 'break-all' }}>{deepLink}</p>
          </div>
        ) : (
          <button onClick={() => void generateLink()} disabled={loading} className="btn btn-primary btn-full" style={{ marginBottom: 16 }}>
            {loading ? '...' : <><FaTelegram size={16} style={{ marginRight: 8 }} />Подключить Telegram</>}
          </button>
        )
      )}

      <NavButtons
        onBack={onBack}
        onNext={linked.length > 0 ? onNext : onSkip}
        nextLabel={linked.length > 0 ? 'Далее →' : 'Пропустить →'}
        nextVariant={linked.length > 0 ? 'brand' : 'ghost'}
      />
    </div>
  );
}

// ── Step 5: Calendar ──────────────────────────────────────────────────────────
function Step5Calendar({ provider, onDone, onSkip, onBack, saving }: {
  provider: Provider; onDone: () => void; onSkip: () => void; onBack: () => void; saving: boolean;
}) {
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());
  const [creating, setCreating]   = useState(false);

  // Next 14 days
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + i * 86400000);
    return d.toISOString().slice(0, 10);
  });

  function toggle(date: string) {
    setBusyDates(prev => {
      const next = new Set(prev);
      next.has(date) ? next.delete(date) : next.add(date);
      return next;
    });
  }

  async function createEntries() {
    if (busyDates.size === 0) { onDone(); return; }
    setCreating(true);
    const token = getToken();
    for (const date of busyDates) {
      const startsAt = `${date}T00:00:00.000Z`;
      const endsAt   = `${date}T23:59:00.000Z`;
      await fetch(`${API}/providers/${provider.id}/calendar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ starts_at: startsAt, ends_at: endsAt, status: 'busy' }),
      }).catch(() => null);
    }
    setCreating(false);
    onDone();
  }

  return (
    <div>
      <StepHeader icon="📅" title="Отметьте занятые дни" sub="Клиенты сразу увидят ваше расписание. Можно изменить позже" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 20 }}>
        {days.map(date => {
          const d = new Date(date + 'T12:00:00Z');
          const isBusy = busyDates.has(date);
          const dow = d.toLocaleDateString('ru-RU', { weekday: 'short' });
          const day = d.getDate();
          const mon = d.toLocaleDateString('ru-RU', { month: 'short' });
          return (
            <button
              key={date}
              onClick={() => toggle(date)}
              style={{
                padding: '10px 6px', borderRadius: 'var(--r-lg)', border: '1.5px solid',
                borderColor: isBusy ? 'var(--red)' : 'var(--border)',
                background: isBusy ? '#fee2e2' : 'var(--surface)',
                color: isBusy ? '#991b1b' : 'var(--ink-2)',
                cursor: 'pointer', textAlign: 'center', fontWeight: isBusy ? 700 : 400,
                transition: 'all .15s',
              }}
            >
              <div style={{ fontSize: 10, color: 'inherit', opacity: .7, marginBottom: 2, textTransform: 'uppercase' }}>{dow}</div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1 }}>{day}</div>
              <div style={{ fontSize: 10, color: 'inherit', opacity: .7, marginTop: 2 }}>{mon}</div>
            </button>
          );
        })}
      </div>

      {busyDates.size > 0 && (
        <p style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600, marginBottom: 12, textAlign: 'center' }}>
          🔴 Отмечено занятых дней: {busyDates.size}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
        <button
          onClick={() => void createEntries()}
          disabled={creating || saving}
          className="btn btn-brand btn-lg btn-full"
        >
          {creating || saving ? 'Сохраняю...' : busyDates.size > 0 ? '✅ Сохранить и завершить' : 'Завершить настройку'}
        </button>
        <button onClick={onBack} className="btn btn-ghost btn-full">← Назад</button>
        {busyDates.size === 0 && (
          <button onClick={onSkip} className="btn btn-ghost btn-full" style={{ color: 'var(--ink-4)', fontSize: 13 }}>
            Пропустить, добавлю позже
          </button>
        )}
      </div>
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────
function StepHeader({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div style={{ marginBottom: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 40, marginBottom: 10 }}>{icon}</div>
      <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800 }}>{title}</h1>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.5 }}>{sub}</p>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: 'var(--ink-4)', marginLeft: 6 }}>{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function NavButtons({ onBack, onNext, nextLabel, nextVariant }: {
  onBack: () => void; onNext: () => void; nextLabel: string; nextVariant: 'brand' | 'ghost';
}) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      <button onClick={onBack} className="btn btn-outline btn-full">← Назад</button>
      <button onClick={onNext} className={`btn ${nextVariant === 'brand' ? 'btn-brand' : 'btn-ghost'} btn-full`}>{nextLabel}</button>
    </div>
  );
}
