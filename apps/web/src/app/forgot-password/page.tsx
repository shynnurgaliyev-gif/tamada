'use client';
import { useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'phone' | 'confirm'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/password/reset/request-code`, {
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
      const res = await fetch(`${API}/auth/password/reset/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, new_password: newPassword }),
      });
      const data = await res.json() as { ok: boolean; error?: { message?: string } | string };
      if (!data.ok) {
        const msg = typeof data.error === 'object' ? data.error?.message : data.error;
        setError(msg ?? 'Ошибка');
        return;
      }
      setDone(true);
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
        <h1>Готово</h1>
        <p>Пароль изменён. <a href="/login">Войти</a></p>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 400, margin: '80px auto', padding: '0 16px' }}>
      <h1>Сброс пароля</h1>

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
              Новый пароль<br />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            </label>
          </p>
          {error && <p style={{ color: 'red' }}>{error}</p>}
          <button type="submit" disabled={loading}>{loading ? '...' : 'Сменить пароль'}</button>
        </form>
      )}

      <p><a href="/login">← Назад</a></p>
    </main>
  );
}
