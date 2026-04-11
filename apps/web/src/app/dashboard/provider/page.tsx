'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = {
  id: string; display_name: string; slug: string;
  city: string | null; publication_status: string; provider_status: string;
};

const statusColor: Record<string, string> = {
  visible: '#22c55e', draft: '#f59e0b', hidden: '#6b7280', suspended: '#ef4444',
};

export default function MyProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (!d.ok) { window.location.href = '/login'; return; }
        setProviders(d.providers ?? []);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={styles.page}><p>Загрузка...</p></div>;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Мои профили</h1>
        <a href="/dashboard/provider/edit" style={styles.btn}>+ Создать профиль</a>
      </div>

      {providers.length === 0 ? (
        <div style={styles.empty}>
          <p>Профилей пока нет.</p>
          <a href="/dashboard/provider/edit" style={styles.btn}>Создать первый</a>
        </div>
      ) : (
        <div style={styles.grid}>
          {providers.map(p => (
            <div key={p.id} style={styles.card}>
              <div style={styles.cardTop}>
                <span style={{ ...styles.badge, background: statusColor[p.publication_status] ?? '#6b7280' }}>
                  {p.publication_status}
                </span>
              </div>
              <h2 style={styles.cardName}>{p.display_name}</h2>
              {p.city && <p style={styles.cardCity}>{p.city}</p>}
              <p style={styles.cardSlug}>/{p.slug}</p>
              <div style={styles.cardActions}>
                <a href={`/dashboard/provider/edit?id=${p.id}`} style={styles.btnSm}>Редактировать</a>
                <a href={`/p/${p.slug}`} target="_blank" style={styles.btnSmOut}>Открыть</a>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 32 }}>
        <a href="/dashboard" style={styles.back}>← Кабинет</a>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 800, margin: '0 auto', padding: '40px 16px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  title: { margin: 0, fontSize: 24, fontWeight: 700 },
  btn: { background: '#111', color: '#fff', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, transition: 'opacity .2s' },
  btnSm: { background: '#111', color: '#fff', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 },
  btnSmOut: { border: '1px solid #ccc', color: '#333', padding: '6px 14px', borderRadius: 6, textDecoration: 'none', fontSize: 13 },
  empty: { textAlign: 'center', padding: '60px 0', color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 },
  card: { border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, transition: 'box-shadow .2s' },
  cardTop: { marginBottom: 12 },
  badge: { color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 600 },
  cardName: { margin: '0 0 4px', fontSize: 18, fontWeight: 600 },
  cardCity: { margin: '0 0 2px', color: '#666', fontSize: 14 },
  cardSlug: { margin: '0 0 16px', color: '#9ca3af', fontSize: 13 },
  cardActions: { display: 'flex', gap: 8 },
  back: { color: '#666', textDecoration: 'none', fontSize: 14 },
};
