'use client';
import { useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json() as { ok: boolean; token?: string; error?: { message?: string } | string };
      if (!data.ok) {
        const msg = typeof data.error === 'object' ? data.error?.message : data.error;
        setError(msg ?? 'Ошибка');
        return;
      }
      if (data.token) localStorage.setItem('session_token', data.token);
      window.location.href = '/dashboard';
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900, fontSize: 20, textDecoration: 'none', color: 'var(--ink)', marginBottom: 24, letterSpacing: '-.04em' }}>
          <span style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 20px rgba(124,58,237,.28)' }}>✦</span>
          Linkora
        </a>
        <h1 style={{ margin: '0 0 24px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Вход</h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
            Логин
            <input className="input" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
            Пароль
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </label>
          {error && <p style={{ margin: 0, color: 'var(--red)', fontSize: 14, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? '...' : 'Войти'}</button>
        </form>
        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>
          Нет аккаунта? <a href="/signup" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Регистрация</a>
        </p>
        <p style={{ marginTop: 8, textAlign: 'center', fontSize: 14 }}>
          <a href="/forgot-password" style={{ color: 'var(--ink-4)', textDecoration: 'none' }}>Забыли пароль?</a>
        </p>
      </div>
    </div>
  );
}
