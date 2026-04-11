'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = {
  id: string; display_name: string; slug: string; bio: string | null;
  city: string | null; region: string | null; is_verified: boolean;
  provider_status: string;
};
type Service = { id: string; category: string; title: string; description: string | null; price_from: string | null; price_to: string | null; currency: string; };
type Photo = { id: string; url: string; is_cover: boolean; };
type Link = { id: string; link_type: string; url: string; label: string | null; };

const linkIcons: Record<string, string> = {
  instagram: '📸', whatsapp: '💬', telegram: '✈️', tiktok: '🎵',
  youtube: '▶️', website: '🌐', two_gis: '📍', map: '🗺️', other: '🔗',
};

export default function PublicProfilePage() {
  const params = useParams();
  const slug = params['slug'] as string;

  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`${API}/public/providers/${slug}`)
      .then(r => r.json())
      .then((d: { ok: boolean; provider?: Provider; services?: Service[]; photos?: Photo[]; links?: Link[] }) => {
        if (!d.ok) { setNotFound(true); return; }
        setProvider(d.provider ?? null);
        setServices(d.services ?? []);
        setPhotos(d.photos ?? []);
        setLinks(d.links ?? []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

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
      {/* Hero */}
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
        {/* Bio */}
        {provider.bio && (
          <section style={s.section}>
            <p style={s.bio}>{provider.bio}</p>
          </section>
        )}

        {/* Services */}
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

        {/* Photos */}
        {photos.length > 0 && (
          <section style={s.section}>
            <h2 style={s.sectionTitle}>Фото</h2>
            <div style={s.photoGrid}>
              {photos.map(ph => (
                <img key={ph.id} src={ph.url} alt="" style={s.photo} />
              ))}
            </div>
          </section>
        )}

        {/* Links */}
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
  serviceCard: { border: '1px solid #e5e7eb', borderRadius: 10, padding: 14, transition: 'box-shadow .2s' },
  serviceCategory: { fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' },
  serviceTitle: { margin: '4px 0 6px', fontSize: 15, fontWeight: 600 },
  serviceDesc: { margin: '0 0 8px', fontSize: 13, color: '#6b7280', lineHeight: 1.4 },
  servicePrice: { margin: 0, fontSize: 14, fontWeight: 600, color: '#111' },
  photoGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 },
  photo: { width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8 },
  linksRow: { display: 'flex', flexWrap: 'wrap', gap: 10 },
  linkItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#f3f4f6', borderRadius: 10, textDecoration: 'none', color: '#111', transition: 'background .2s', fontSize: 14 },
  linkIcon: { fontSize: 18 },
  linkLabel: { fontWeight: 500 },
  page: { maxWidth: 700, margin: '40px auto', padding: '0 16px' },
};
