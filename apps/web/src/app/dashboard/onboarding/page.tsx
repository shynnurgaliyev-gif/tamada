'use client';
import { useEffect, useRef, useState } from 'react';
import { OctiMark } from '@/components/OctiLogo';
import { API_URL as API } from '@/lib/env';
import type { Provider } from '@octiqa/types';
import { STEPS, TOTAL_STEPS as TOTAL, getToken } from './_shared';
import { Step1Basics } from './Step1Basics';
import { Step2Photos } from './Step2Photos';
import { Step3Contacts } from './Step3Contacts';
import { Step4Telegram } from './Step4Telegram';
import { Step5Calendar } from './Step5Calendar';

// ── Main Component ────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const [step, setStep]           = useState(1);
  const [saving, setSaving]       = useState(false);
  const [provider, setProvider]   = useState<Provider | null>(null);
  const [initLoading, setInitLoading] = useState(true);
  const topRef = useRef<HTMLDivElement>(null);

  // Load existing provider + resume step
  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    Promise.all([
      fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/dashboard/onboarding`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([me, ob]: [
      { ok: boolean; providers?: Provider[] },
      { ok: boolean; onboarding?: { current_step: number; status: string } }
    ]) => {
      const p = me.providers?.[0] ?? null;
      if (p) setProvider(p);
      if (ob.ok && ob.onboarding) {
        if (ob.onboarding.status === 'completed') {
          window.location.href = '/dashboard';
          return;
        }
        setStep(ob.onboarding.current_step ?? 1);
      }
    }).catch(() => null).finally(() => setInitLoading(false));
  }, []);

  async function saveStep(n: number) {
    if (!provider) return;
    await fetch(`${API}/dashboard/onboarding`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id, step: n }),
    }).catch(() => null);
  }

  async function goNext(nextStep?: number) {
    const target = nextStep ?? step + 1;
    if (provider) await saveStep(target);
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    setStep(target);
  }

  async function finish() {
    if (!provider) { window.location.href = '/dashboard'; return; }
    setSaving(true);
    await fetch(`${API}/dashboard/onboarding/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: provider.id }),
    }).catch(() => null);
    setSaving(false);
    window.location.href = '/dashboard';
  }

  if (initLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
    </div>
  );

  const pct = Math.round(((step - 1) / TOTAL) * 100);

  return (
    <div ref={topRef} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top bar */}
      <nav className="nav-frosted">
        <a href="/" className="logo-mark" style={{ fontSize: 17 }}>
          <OctiMark size={28} />
          Octiqa
        </a>
        <a href="/dashboard" className="btn btn-ghost btn-sm">
          {provider ? 'Закрыть' : 'Пропустить'}
        </a>
      </nav>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px 64px' }}>

        {/* Progress */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink-3)' }}>Шаг {step} из {TOTAL}</span>
            <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--grad-brand)', borderRadius: 3, transition: 'width .4s ease' }} />
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 12 }}>
            {STEPS.map(s => (
              <div key={s.n} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: s.n < step ? 13 : 12,
                  background: s.n < step ? 'var(--brand)' : s.n === step ? 'var(--brand)' : 'var(--border)',
                  color: s.n <= step ? '#fff' : 'var(--ink-4)',
                  fontWeight: 700,
                  transition: 'all .3s',
                }}>
                  {s.n < step ? '✓' : s.n}
                </div>
                <div style={{ fontSize: 10, color: s.n === step ? 'var(--brand)' : 'var(--ink-4)', fontWeight: s.n === step ? 700 : 400 }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="anim-fadeUp" key={step}>
          {step === 1 && (
            <Step1Basics
              provider={provider}
              onDone={(p) => { setProvider(p); void goNext(); }}
            />
          )}
          {step === 2 && provider && (
            <Step2Photos
              provider={provider}
              onNext={() => void goNext()}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && provider && (
            <Step3Contacts
              provider={provider}
              onNext={() => void goNext()}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && provider && (
            <Step4Telegram
              provider={provider}
              onNext={() => void goNext()}
              onSkip={() => void goNext()}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && provider && (
            <Step5Calendar
              provider={provider}
              onDone={() => void finish()}
              onSkip={() => void finish()}
              onBack={() => setStep(4)}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}




// ── Shared UI ─────────────────────────────────────────────────────────────────
