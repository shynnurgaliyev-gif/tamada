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
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 900, fontSize: 20, textDecoration: 'none', color: 'var(--ink)', marginBottom: 24, letterSpacing: '-.04em' }}>
          <span style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #4f46e5, #7c3aed, #a855f7)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 4px 20px rgba(124,58,237,.28)' }}>✦</span>
          BRAND_NAME
        </a>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Регистрация</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-3)', textAlign: 'center' }}>
          {step === 'phone' ? 'Введите номер телефона для входа' : 'Введите код из WhatsApp'}
        </p>

        {step === 'phone' && (
          <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
              Телефон
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." required type="tel" />
            </label>
            {error && <p style={{ margin: 0, color: 'var(--red)', fontSize: 14, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? '...' : 'Получить код'}</button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={confirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
              Код из WhatsApp
              <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
              Имя пользователя
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, color: 'var(--ink-2)', fontWeight: 500 }}>
              Пароль
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="new-password" />
            </label>
            {error && <p style={{ margin: 0, color: 'var(--red)', fontSize: 14, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? '...' : 'Создать аккаунт'}</button>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setStep('phone')}>← Изменить телефон</button>
          </form>
        )}

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 14, color: 'var(--ink-3)' }}>
          Уже есть аккаунт? <a href="/login" style={{ color: 'var(--brand)', fontWeight: 600, textDecoration: 'none' }}>Войти</a>
        </p>
      </div>
    </div>
  );
}
