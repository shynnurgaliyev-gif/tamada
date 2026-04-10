'use client';
import { useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export default function SignupPage() {
  const [step, setStep] = useState<'phone' | 'confirm'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/signup/request-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { ok: boolean; error?: { message?: string } | string };
      if (!data.ok) {
        const msg = typeof data.error === 'object' ? data.error?.message : data.error;
        setError(msg ?? 'Ошибка');
        return;
      }
      setStep('confirm');
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/signup/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, username, password }),
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
      <h1>Регистрация</h1>

      {step === 'phone' && (
        <form onSubmit={requestCode}>
          <p>
            <label>
              Телефон<br />
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." required />
            </label>
          </p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={loading}>{loading ? '...' : 'Получить код'}</button>
        </form>
      )}

      {step === 'confirm' && (
        <form onSubmit={confirm}>
          <p>
            <label>
              Код из WhatsApp<br />
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="123456" required />
            </label>
          </p>
          <p>
            <label>
              Имя пользователя<br />
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
          <button type="submit" disabled={loading}>{loading ? '...' : 'Создать аккаунт'}</button>
        </form>
      )}

      <p><a href="/login">Уже есть аккаунт? Войти</a></p>
    </main>
  );
}
