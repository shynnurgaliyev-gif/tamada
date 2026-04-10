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
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1>Вход</h1>
      <form onSubmit={submit}>
        <p>
          <label>
            Логин<br />
            <input value={username} onChange={e => setUsername(e.target.value)} required />
          </label>
        </p>
        <p>
          <label>
            Пароль<br />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </label>
        </p>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>{loading ? '...' : 'Войти'}</button>
      </form>
      <p><a href="/signup">Нет аккаунта? Регистрация</a></p>
      <p><a href="/forgot-password">Забыли пароль?</a></p>
    </main>
  );
}
