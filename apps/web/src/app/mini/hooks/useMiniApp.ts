/* ── useMiniApp ───────────────────────────────────────────────────────────────
   Central state + initialization hook for the Mini App shell.
   `tgFlow` is resolved by the caller (MiniShell) via useSearchParams so that
   this hook stays independent of the Suspense-boundary constraint.
────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';
import { getTelegramWebApp }                from '@/lib/telegram';
import type { TgUser }                      from '@/lib/telegram';
import {
  isValidFlow,
  type Phase,
  type Tab,
  type TgFlow,
  type Provider,
  type AnalyticsSummary,
} from '../types';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

/* ── Return shape ─────────────────────────────────────────────────────────── */

export interface MiniAppState {
  /* Lifecycle */
  phase: Phase;
  setPhase: (p: Phase) => void;
  /* Navigation */
  tab: Tab;
  handleTab: (next: Tab) => void;
  /* User */
  tgUser: TgUser | null;
  /* Providers */
  providers: Provider[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  activeProvider: Provider | null;
  updateActiveProvider: (updated: Provider) => void;
  /* Analytics */
  summary: AnalyticsSummary | null;
  sumLoading: boolean;
  loadAnalytics: () => void;
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export function useMiniApp(urlTgFlow: string | null): MiniAppState {
  const [phase,      setPhase]      = useState<Phase>('loading');
  const [tab,        setTab]        = useState<Tab>('profiles');
  const [tgUser,     setTgUser]     = useState<TgUser | null>(null);
  const [providers,  setProviders]  = useState<Provider[]>([]);
  const [activeIdx,  setActiveIdx]  = useState(0);
  const [summary,    setSummary]    = useState<AnalyticsSummary | null>(null);
  const [sumLoading, setSumLoading] = useState(false);

  /* ── Initialise Telegram + data ───────────────────────────────────────── */
  useEffect(() => {
    const tg = getTelegramWebApp();
    tg?.ready();
    tg?.expand();

    // Resolve entry flow: URL param > Telegram start_param > fallback
    const startFlow = tg?.initDataUnsafe?.start_param ?? null;
    const flow: TgFlow = isValidFlow(urlTgFlow) ? urlTgFlow
                        : isValidFlow(startFlow) ? startFlow
                        : 'dashboard';

    if (tg?.initDataUnsafe?.user) setTgUser(tg.initDataUnsafe.user);
    if (flow === 'profiles') setTab('profiles');

    const token = localStorage.getItem('session_token');

    // No token → onboarding
    if (!token) { setPhase('onboarding'); return; }

    // onboarding flow → show gate, but silently load providers
    if (flow === 'onboarding') {
      setPhase('onboarding');
      fetchProviders(token);
      return;
    }

    // Default → fetch providers then enter shell
    fetchProviders(token).finally(() => setPhase('shell'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);                          // run once on mount

  /* ── Provider fetcher ─────────────────────────────────────────────────── */
  function fetchProviders(token: string): Promise<void> {
    return fetch(`${API}/providers/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (d.ok && d.providers) setProviders(d.providers);
      })
      .catch(() => { /* non-fatal */ });
  }

  /* ── Analytics — lazy-loaded when the analytics tab is opened ─────────── */
  const loadAnalytics = useCallback(() => {
    if (summary || sumLoading) return;
    const token = localStorage.getItem('session_token');
    if (!token) return;
    setSumLoading(true);
    fetch(`${API}/dashboard/analytics/summary?days=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; summary?: AnalyticsSummary | null }) => {
        if (d.ok) setSummary(d.summary ?? null);
      })
      .catch(() => null)
      .finally(() => setSumLoading(false));
  }, [summary, sumLoading]);

  /* ── Tab change ───────────────────────────────────────────────────────── */
  const handleTab = useCallback((next: Tab) => {
    setTab(next);
    if (next === 'analytics') loadAnalytics();
  }, [loadAnalytics]);

  const updateActiveProvider = useCallback((updated: Provider) => {
    setProviders(prev => prev.map((p, i) => i === activeIdx ? updated : p));
  }, [activeIdx]);

  return {
    phase, setPhase,
    tab, handleTab,
    tgUser,
    providers, activeIdx, setActiveIdx,
    activeProvider: providers[activeIdx] ?? null,
    updateActiveProvider,
    summary, sumLoading, loadAnalytics,
  };
}
