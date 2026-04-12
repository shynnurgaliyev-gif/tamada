'use client';
import { useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

function passwordScore(p: string) {
  let s = 0;
  if (p.length >= 8)           s++;
  if (p.length >= 12)          s++;
  if (/[a-z]/.test(p))        s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^a-zA-Z0-9]/.test(p)) s++;
  return s;
}
function strengthMeta(score: number) {
  if (score <= 1) return { label: 'Слабый',       color: '#ef4444', pct: 20 };
  if (score <= 2) return { label: 'Слабый',        color: '#f97316', pct: 35 };
  if (score <= 3) return { label: 'Средний',       color: '#eab308', pct: 58 };
  if (score <= 4) return { label: 'Сильный',       color: '#22c55e', pct: 78 };
  return            { label: 'Очень сильный',      color: '#16a34a', pct: 100 };
}
const REQS = [
  { test: (p: string) => p.length >= 8,    label: 'Не менее 8 символов' },
  { test: (p: string) => /[A-Z]/.test(p),  label: 'Заглавная буква (A-Z)' },
  { test: (p: string) => /[a-z]/.test(p),  label: 'Строчная буква (a-z)' },
  { test: (p: string) => /[0-9]/.test(p),  label: 'Цифра (0-9)' },
];

export default function ForgotPasswordPage() {
  const [step, setStep]               = useState<'phone' | 'confirm'>('phone');
  const [phone, setPhone]             = useState('');
  const [code, setCode]               = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showReqs, setShowReqs]       = useState(false);
  const [error, setError]             = useState('');
  const [done, setDone]               = useState(false);
  const [loading, setLoading]         = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/password/reset/request-code`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json() as { ok: boolean; error?: { message?: string } | string };
      if (!data.ok) {
        const msg = typeof data.error === 'object' ? (data.error?.message ?? 'Ошибка') : (data.error ?? 'Ошибка');
        setError(msg); return;
      }
      setStep('confirm');
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    const missing = REQS.filter(r => !r.test(newPassword));
    if (missing.length > 0) { setError(missing[0]!.label + ' — обязательное требование'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API}/auth/password/reset/confirm`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, new_password: newPassword }),
      });
      const data = await res.json() as { ok: boolean; error?: { message?: string } | string };
      if (!data.ok) {
        const msg = typeof data.error === 'object' ? (data.error?.message ?? 'Ошибка') : (data.error ?? 'Ошибка');
        setError(msg); return;
      }
      setDone(true);
    } catch { setError('Ошибка сети'); }
    finally { setLoading(false); }
  }

  const score = passwordScore(newPassword);
  const meta  = strengthMeta(score);
  const allReqsMet = REQS.every(r => r.test(newPassword));

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h1 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 700 }}>Пароль изменён</h1>
        <p style={{ color: 'var(--ink-3)', marginBottom: 24 }}>Войдите с новым паролем</p>
        <a href="/login" className="btn btn-primary btn-full">Войти</a>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: 32 }}>
        <a href="/" className="logo-mark" style={{ fontSize: 18, justifyContent: 'center', marginBottom: 24 }}>
          <OctiMark size={32} />
          Octiqa
        </a>
        <h1 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, textAlign: 'center' }}>Сброс пароля</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--ink-3)', textAlign: 'center' }}>
          {step === 'phone' ? 'Введите номер, привязанный к аккаунту' : 'Введите код из WhatsApp'}
        </p>

        {step === 'phone' && (
          <form onSubmit={requestCode} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
              Телефон
              <input className="input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7..." required type="tel" />
            </label>
            {error && <ErrBox msg={error} />}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>{loading ? '...' : 'Получить код'}</button>
            <a href="/login" style={{ textAlign: 'center', fontSize: 14, color: 'var(--ink-4)', textDecoration: 'none' }}>← Назад</a>
          </form>
        )}

        {step === 'confirm' && (
          <form onSubmit={confirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, fontWeight: 500 }}>
              Код из WhatsApp
              <input className="input" value={code} onChange={e => setCode(e.target.value)} placeholder="123456" required />
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 14, fontWeight: 500 }}>Новый пароль</label>
              <input
                className="input" type="password" value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                onFocus={() => setShowReqs(true)}
                required autoComplete="new-password"
              />
              {newPassword.length > 0 && (
                <>
                  <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                    <div style={{ height: '100%', width: `${meta.pct}%`, background: meta.color, borderRadius: 3, transition: 'width .3s, background .3s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</div>
                </>
              )}
              {(showReqs || newPassword.length > 0) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
                  {REQS.map(r => {
                    const ok = r.test(newPassword);
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
              {loading ? '...' : 'Сменить пароль'}
            </button>
            <button type="button" className="btn btn-ghost btn-full" onClick={() => setStep('phone')}>← Изменить телефон</button>
          </form>
        )}
      </div>
    </div>
  );
}

function ErrBox({ msg }: { msg: string }) {
  return <p style={{ margin: 0, color: 'var(--red)', fontSize: 14, background: '#fef2f2', padding: '8px 12px', borderRadius: 8 }}>{msg}</p>;
}
