'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Account = { id: string; username: string; phone: string; status: string };

export default function DashboardPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('session_token');
    if (!token) { window.location.href = '/login'; return; }

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: { ok: boolean; account?: Account }) => {
        if (!data.ok) { window.location.href = '/login'; return; }
        setAccount(data.account ?? null);
      })
      .catch(() => { window.location.href = '/login'; })
      .finally(() => setLoading(false));
  }, []);

  async function logout() {
    const token = localStorage.getItem('session_token');
    if (token) {
      await fetch(`${API}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => null);
    }
    localStorage.removeItem('session_token');
    window.location.href = '/login';
  }

  if (loading) {
    return <main style={{ padding: '80px 16px' }}><p>Загрузка...</p></main>;
  }

  return (
    <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 16px' }}>
      <h1>Личный кабинет</h1>
      {account && (
        <div>
          <p><strong>Логин:</strong> {account.username}</p>
          <p><strong>Телефон:</strong> {account.phone}</p>
          <p><strong>Статус:</strong> {account.status}</p>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 24 }}>
        <a href="/dashboard/provider" style={navStyle}>Мои профили</a>
        <a href="/dashboard/calendar" style={navStyle}>Календарь</a>
        <a href="/dashboard/integrations" style={navStyle}>Интеграции (Telegram)</a>
      </div>
      <button onClick={logout} style={{ marginTop: 24, background: 'none', border: '1px solid #ccc', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14 }}>Выйти</button>
    </main>
  );
}

const navStyle: React.CSSProperties = {
  display: 'block', padding: '10px 16px', background: '#f9fafb',
  border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none',
  color: '#111', fontSize: 14, fontWeight: 500,
};
