'use client';
import { useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';

import { API_URL as API } from '@/lib/env';
import { setSessionToken } from '@/lib/auth';

// ── Password strength ─────────────────────────────────────────────────────────
function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 8)           s++;
  if (p.length >= 12)          s++;
  if (/[a-z]/.test(p))        s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s; // 0-6
}
function strengthMeta(score: number) {
  if (score <= 1) return { label: 'Слабый',        color: '#ef4444', pct: 20 };
  if (score <= 2) return { label: 'Слабый',         color: '#f97316', pct: 35 };
  if (score <= 3) return { label: 'Средний',        color: '#eab308', pct: 58 };
  if (score <= 4) return { label: 'Сильный',        color: '#22c55e', pct: 78 };
  return            { label: 'Очень сильный',       color: '#16a34a', pct: 100 };
}

const REQS = [
  { test: (p: string) => p.length >= 8,    label: 'Не менее 8 символов' },
  { test: (p: string) => /[A-Z]/.test(p),  label: 'Заглавная буква (A-Z)' },
  { test: (p: string) => /[a-z]/.test(p),  label: 'Строчная буква (a-z)' },
  { test: (p: string) => /[0-9]/.test(p),  label: 'Цифра (0-9)' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function SignupPage() {
  const [step, setStep]         = useState<'phone' | 'confirm'>('phone');
  const [phone, setPhone]       = useState('');
  const [code, setCode]         = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPwReqs, setShowPwReqs] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/signup/request-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { ok: boolean; error?: { message?: string } | string };
      if (!data.ok) { setError(typeof data.error === 'object' ? (data.error?.message ?? 'Ошибка') : (data.error ?? 'Ошибка')); return; }
      setStep('confirm');
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    // client-side password check first
    const missing = REQS.filter(r => !r.test(password));
    if (missing.length > 0) { setError(missing[0]!.label + ' — обязательное требование'); return; }

    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/signup/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, username, password }),
      });
      const data = await res.json() as { ok: boolean; token?: string; expires_at?: string; error?: { message?: string } | string };
      if (!data.ok) { setError(typeof data.error === 'object' ? (data.error?.message ?? 'Ошибка') : (data.error ?? 'Ошибка')); return; }
      if (data.token) {
        setSessionToken(data.token, data.expires_at ?? null);
      }
      window.location.href = '/dashboard/onboarding';
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }

  const score  = passwordScore(password);
  const meta   = strengthMeta(score);
  const allReqsMet = REQS.every(r => r.test(password));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <a href="/" className="logo-mark" style={{ fontSize: 18, justifyContent: 'center', marginBottom: 24 }}>
          <OctiMark size={32} />
          Octiqa
        </a>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Регистрация</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-3)', textAlign: 'center' }}>
          {step === 'phone' ? 'Введите номер телефона' : 'Введите код из WhatsApp'}
        </p>

        {step === 'phone' && (
          <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
              Телефон
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." required type="tel" />
            </label>
            {error && <ErrBox msg={error} />}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? '...' : 'Получить код'}</button>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={confirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
              Код из WhatsApp
              <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" required />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
              Имя пользователя
              <input className="input" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 14, fontWeight: 500 }}>Пароль</label>
              <input
                className="input" type="password" value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setShowPwReqs(true)}
                required autoComplete="new-password"
              />

              {/* Strength bar */}
              {password.length > 0 && (
                <>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ height: '100%', width: `${meta.pct}%`, background: meta.color, borderRadius: 3, transition: 'width .3s, background .3s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                </>
              )}

              {/* Requirements */}
              {(showPwReqs || password.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10, marginTop: 2 }}>
                  {REQS.map(r => {
                    const ok = r.test(password);
                    return (
                      <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: ok ? 'var(--green-text)' : 'var(--ink-3)' }}>
                        <span style={{ fontSize: 13, flexShrink: 0 }}>{ok ? '✓' : '○'}</span>
                        {r.label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {error && <ErrBox msg={error} />}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading || !allReqsMet}>
              {loading ? '...' : 'Создать аккаунт'}
            </button>
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

function ErrBox({ msg }: { msg: string }) {
  return <p style={{ margin: 0, color: 'var(--red)', fontSize: 14, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{msg}</p>;
}
