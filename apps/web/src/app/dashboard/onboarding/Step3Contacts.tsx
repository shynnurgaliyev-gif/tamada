'use client';
import { useEffect, useState } from 'react';
import { API_URL as API } from '@/lib/env';
import { normalizeLinkUrl, cleanPastedUrl } from '@/lib/linkUrl';
import type { Provider, ProviderLink as Link } from '@octiqa/types';
import { CONTACT_OPTS, getToken, StepHeader, NavButtons } from './_shared';

export function Step3Contacts({ provider, onNext, onBack }: { provider: Provider; onNext: () => void; onBack: () => void }) {
  const [links, setLinks]         = useState<Link[]>([]);
  const [type, setType]           = useState('whatsapp');
  const [url, setUrl]             = useState('');
  const [adding, setAdding]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    fetch(`${API}/providers/${provider.id}/data`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    }).then(r => r.json())
      .then((d: { ok: boolean; links?: Link[] }) => { if (d.ok) setLinks(d.links ?? []); })
      .catch(() => null);
  }, [provider.id]);

  async function addLink() {
    const check = normalizeLinkUrl(url);
    if (!check.ok) { setError(check.error); return; }
    setAdding(true); setError('');
    try {
      const res = await fetch(`${API}/providers/${provider.id}/links`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_type: type, url: check.url }),
      });
      const d = await res.json() as { ok: boolean; link?: Link; error?: string };
      if (d.ok && d.link) { setLinks(prev => [...prev, d.link!]); setUrl(''); }
      else setError(d.error ?? 'Ошибка');
    } catch { setError('Ошибка сети'); }
    setAdding(false);
  }

  async function removeLink(id: string) {
    await fetch(`${API}/providers/${provider.id}/links/${id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${getToken()}` },
    });
    setLinks(prev => prev.filter(l => l.id !== id));
  }

  const selectedOpt = CONTACT_OPTS.find(o => o.value === type) ?? CONTACT_OPTS[0]!;

  return (
    <div>
      <StepHeader icon="📲" title="Контакты" sub="Как клиенты будут связываться с вами после просмотра профиля" />

      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {CONTACT_OPTS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setType(opt.value); setUrl(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                borderRadius: 20, border: '1.5px solid', fontSize: 13, cursor: 'pointer', fontWeight: 600,
                borderColor: type === opt.value ? 'var(--brand)' : 'var(--border)',
                background: type === opt.value ? 'var(--brand-xlight)' : 'transparent',
                color: type === opt.value ? 'var(--brand)' : 'var(--ink-3)',
              }}
            >
              <opt.Icon size={13} /> {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            style={{ flex: 1 }}
            value={url}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            onChange={e => { setUrl(e.target.value); if (error) setError(''); }}
            onPaste={e => {
              const pasted = e.clipboardData.getData('text');
              if (!pasted) return;
              const cleaned = cleanPastedUrl(pasted);
              if (cleaned !== pasted) {
                e.preventDefault();
                setUrl(cleaned);
                if (error) setError('');
              }
            }}
            placeholder={selectedOpt.placeholder}
            onKeyDown={e => { if (e.key === 'Enter') void addLink(); }}
          />
          <button onClick={() => void addLink()} disabled={adding} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
            {adding ? '...' : '+ Добавить'}
          </button>
        </div>
        {error && <p style={{ color: 'var(--red)', fontSize: 12, margin: '8px 0 0' }}>{error}</p>}
      </div>

      {links.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {links.map(lk => {
            const opt = CONTACT_OPTS.find(o => o.value === lk.link_type);
            return (
              <div key={lk.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)' }}>
                {opt ? <opt.Icon size={18} style={{ flexShrink: 0, color: 'var(--ink-3)' }} /> : <span>🔗</span>}
                <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink-2)' }}>{lk.url}</span>
                <button onClick={() => void removeLink(lk.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            );
          })}
        </div>
      )}

      {links.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--ink-4)', textAlign: 'center', marginBottom: 16 }}>Добавьте хотя бы один способ связи</p>
      )}

      <NavButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={links.length === 0 ? 'Пропустить →' : 'Далее →'}
        nextVariant={links.length === 0 ? 'ghost' : 'brand'}
      />
    </div>
  );
}
