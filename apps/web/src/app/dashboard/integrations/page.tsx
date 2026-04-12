'use client';
import { useEffect, useState } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = { id: string; display_name: string; };
type TelegramAccount = {
  id: string; telegram_user_id: number; telegram_username: string | null;
  telegram_first_name: string | null; telegram_role: string; status: string;
  linked_at: string | null;
};

const roleLabel: Record<string, string> = {
  owner: 'Владелец', assistant: 'Помощник', spouse: 'Супруг/а',
  child: 'Ребёнок', partner: 'Партнёр', other: 'Другое',
};
const statusColor: Record<string, string> = {
  linked: '#22c55e', pending: '#f59e0b', unlinked: '#6b7280', blocked: '#ef4444',
};

function getToken() { return localStorage.getItem('session_token') ?? ''; }

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [deepLink, setDeepLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = getToken();
    if (!token) { window.location.href = '/login'; return; }
    fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (!d.ok) { window.location.href = '/login'; return; }
        const list = d.providers ?? [];
        setProviders(list);
        if (list[0]) setSelectedId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setDeepLink('');
    setMsg('');
    loadAccounts();
  }, [selectedId]);

  function loadAccounts() {
    fetch(`${API}/providers/${selectedId}/telegram-accounts`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; accounts?: TelegramAccount[] }) => {
        if (d.ok) setAccounts(d.accounts ?? []);
      })
      .catch(() => null);
  }

  async function generateLink() {
    setLinkLoading(true);
    setDeepLink('');
    setMsg('');
    try {
      const res = await fetch(`${API}/telegram/link-token`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_id: selectedId }),
      });
      const data = await res.json() as { ok: boolean; deep_link?: string; error?: string };
      if (data.ok && data.deep_link) {
        setDeepLink(data.deep_link);
      } else {
        setMsg(String(data.error ?? 'Ошибка'));
      }
    } finally {
      setLinkLoading(false);
    }
  }

  async function unlink(telegramAccountId: string) {
    if (!confirm('Отвязать этот Telegram?')) return;
    await fetch(`${API}/telegram/unlink`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_account_id: telegramAccountId }),
    });
    loadAccounts();
  }

  if (loading) return <div style={s.page}><p>Загрузка...</p></div>;

  const linked = accounts.filter(a => a.status === 'linked');

  return (
    <div style={s.page}>
      <a href="/dashboard" style={s.back}>← Кабинет</a>
      <h1 style={s.title}>Интеграции</h1>

      {providers.length > 1 && (
        <select style={s.select} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
      )}

      {/* Telegram block */}
      <section style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.sectionTitleRow}>
            <span style={s.tgIcon}>✈️</span>
            <h2 style={s.sectionTitle}>Telegram</h2>
          </div>
          <span style={s.count}>{linked.length}/3</span>
        </div>

        <p style={s.desc}>
          Привяжите Telegram чтобы управлять календарём через бота — вы и ваши помощники.
        </p>

        {accounts.length > 0 && (
          <div style={s.accountList}>
            {accounts.map(a => (
              <div key={a.id} style={s.accountRow}>
                <div style={s.accountInfo}>
                  <span style={{ ...s.statusDot, background: statusColor[a.status] ?? '#888' }} />
                  <div>
                    <div style={s.accountName}>
                      {a.telegram_first_name ?? (a.telegram_username ? `@${a.telegram_username}` : `id:${a.telegram_user_id}`)}
                      {a.telegram_username && <span style={s.username}> @{a.telegram_username}</span>}
                    </div>
                    <div style={s.accountMeta}>{roleLabel[a.telegram_role] ?? a.telegram_role} · {a.status}</div>
                  </div>
                </div>
                {a.status === 'linked' && (
                  <button onClick={() => void unlink(a.id)} style={s.unlinkBtn}>Отвязать</button>
                )}
              </div>
            ))}
          </div>
        )}

        {linked.length < 3 && (
          <div style={s.linkBlock}>
            {deepLink ? (
              <div style={s.deepLinkBox}>
                <p style={s.deepLinkLabel}>Ссылка действует 15 минут. Откройте в Telegram:</p>
                <a href={deepLink} target="_blank" style={s.deepLinkBtn}>Открыть в Telegram</a>
                <p style={s.deepLinkUrl}>{deepLink}</p>
              </div>
            ) : (
              <button onClick={() => void generateLink()} style={s.connectBtn} disabled={linkLoading}>
                {linkLoading ? '...' : '+ Подключить Telegram'}
              </button>
            )}
            {msg && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{msg}</p>}
          </div>
        )}

        {linked.length >= 3 && (
          <p style={s.maxNote}>Достигнут максимум (3 аккаунта). Отвяжите один чтобы добавить другой.</p>
        )}
      </section>

      <div style={{ marginTop: 16, fontSize: 13, color: '#9ca3af' }}>
        <p>Команды бота: <b>помощь</b>, <b>календарь</b>, <b>занято 12.04 13:00 18:00</b>, <b>свободно 12.04</b>, <b>клиент 12.04</b>, <b>отвязать</b></p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { maxWidth: 600, margin: '0 auto', padding: '24px 16px' },
  back: { color: 'var(--ink-4)', textDecoration: 'none', fontSize: 14 },
  title: { margin: '16px 0 24px', fontSize: 22, fontWeight: 700 },
  select: { width: '100%', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, marginBottom: 20 },
  section: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitleRow: { display: 'flex', alignItems: 'center', gap: 8 },
  tgIcon: { fontSize: 20 },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600 },
  count: { fontSize: 13, color: 'var(--ink-4)', background: 'var(--border-soft)', padding: '2px 8px', borderRadius: 12 },
  desc: { fontSize: 13, color: 'var(--ink-3)', margin: '0 0 16px' },
  accountList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 },
  accountRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 },
  accountInfo: { display: 'flex', alignItems: 'center', gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  accountName: { fontSize: 14, fontWeight: 500, color: 'var(--ink)' },
  username: { color: 'var(--ink-4)', fontWeight: 400 },
  accountMeta: { fontSize: 12, color: 'var(--ink-4)', marginTop: 2 },
  unlinkBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--ink-3)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 },
  linkBlock: { marginTop: 4 },
  connectBtn: { background: 'var(--ink)', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 500 },
  deepLinkBox: { background: 'var(--green-bg)', border: '1px solid #bbf7d0', borderRadius: 8, padding: 16 },
  deepLinkLabel: { margin: '0 0 10px', fontSize: 13, color: 'var(--green-text)' },
  deepLinkBtn: { display: 'inline-block', background: '#2563eb', color: '#fff', padding: '8px 18px', borderRadius: 8, textDecoration: 'none', fontSize: 14, fontWeight: 500 },
  deepLinkUrl: { margin: '10px 0 0', fontSize: 11, color: 'var(--ink-4)', wordBreak: 'break-all' },
  maxNote: { fontSize: 13, color: 'var(--ink-4)', margin: '8px 0 0' },
};
