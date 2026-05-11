'use client';
import { useEffect, useState } from 'react';
import { API_URL as API } from '@/lib/env';
import type {
  Provider, RefRegion, RefCity, RefCategory, RefSubcategory as RefSubcat,
} from '@octiqa/types';
import { FALLBACK_CATEGORIES, toSlug, getToken, StepHeader, Field } from './_shared';

export function Step1Basics({ provider, onDone }: { provider: Provider | null; onDone: (p: Provider) => void }) {
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

  const filteredCities = regionId ? allCities.filter(c => c.region_id === regionId) : allCities;
  const filteredSubcats = catCode ? subcats.filter(s => s.category_code === catCode) : [];

  function handleNameChange(v: string) {
    setName(v);
    if (slugAuto) setSlug(toSlug(v));
  }

  function handleRegionChange(id: string) {
    setRegionId(id);
    setCityName('');
  }

  async function submit() {
    if (!name.trim())     { setError('Введите имя'); return; }
    if (!slug.trim())     { setError('Укажите ссылку профиля'); return; }
    if (!cityName.trim()) { setError('Выберите город'); return; }
    if (!catCode)         { setError('Выберите направление'); return; }
    if (catCode === '__custom__' && !customCat.trim()) {
      setError('Введите ваше направление'); return;
    }

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

      // Progressive publish — профиль становится виден клиентам сразу после Step1
      // (не ждём фото/контакты/Telegram). Не трогаем, если юзер сам выставил 'hidden'.
      if (p.publication_status === 'draft') {
        const res2 = await fetch(`${API}/providers/${p.id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ publication_status: 'visible' }),
        }).catch(() => null);
        if (res2) {
          const d2 = await res2.json().catch(() => null) as { ok?: boolean; provider?: Provider } | null;
          if (d2?.ok && d2.provider) p = d2.provider;
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
          {saving ? 'Сохранение...' : 'Опубликовать профиль →'}
        </button>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', margin: '6px 2px 0', lineHeight: 1.4, textAlign: 'center' }}>
          Сразу после сохранения профиль становится виден клиентам.<br />
          Фото, контакты и календарь можно дополнить позже.
        </p>
      </div>
    </div>
  );
}
