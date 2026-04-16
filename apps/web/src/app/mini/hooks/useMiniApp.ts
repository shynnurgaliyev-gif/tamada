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
const MAX_PROFILES_PER_ACCOUNT = 3;

export type CreateProfileInput = {
  display_name: string;
  category: string;
  subcategory?: string;
  city?: string;
};

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
  canManageProfiles: boolean;
  maxProfiles: number;
  createProfile: (input: CreateProfileInput) => Promise<Provider | null>;
  archiveProfile: (providerId: string) => Promise<boolean>;
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
  const [miniRole,   setMiniRole]   = useState<string | null>('owner');

  const activeProvider = providers[activeIdx] ?? null;
  const activeProfileCount = providers.filter(p => !p.archived_at && !p.pending_delete_at).length;
  const canManageProfiles = miniRole !== 'assistant';
  const switchActiveIdx = useCallback((i: number) => {
    setSummary(null);
    setActiveIdx(i);
  }, []);

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

    if (tg?.initDataUnsafe?.user) {
      setTgUser(tg.initDataUnsafe.user);
      localStorage.setItem('mini_tg_user_id', String(tg.initDataUnsafe.user.id));
    }
    if (flow === 'profiles') setTab('profiles');

    const token = localStorage.getItem('session_token');

    // No token → onboarding
    if (!token) {
      const tgUserId = tg?.initDataUnsafe?.user?.id;
      if (tgUserId) {
        fetch(`${API}/telegram/mini/providers?telegram_user_id=${tgUserId}`)
          .then(r => r.json())
          .then((d: { ok: boolean; providers?: Provider[]; role?: string | null }) => {
            if (d.ok && d.providers?.length) {
              setMiniRole(d.role ?? 'assistant');
              setProviders(d.providers);
              setPhase('shell');
            } else {
              setPhase('onboarding');
            }
          })
          .catch(() => setPhase('onboarding'));
        return;
      }
      setPhase('onboarding');
      return;
    }

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
    return fetch(`${API}/providers/me?include_archived=1`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; providers?: Provider[] }) => {
        if (d.ok && d.providers) {
          setProviders(d.providers);
          setActiveIdx(current => {
            const currentProvider = d.providers?.[current];
            if (currentProvider && !currentProvider.archived_at && !currentProvider.pending_delete_at) return current;
            const firstActive = d.providers?.findIndex(p => !p.archived_at && !p.pending_delete_at) ?? -1;
            return firstActive >= 0 ? firstActive : 0;
          });
        }
      })
      .catch(() => { /* non-fatal */ });
  }

  /* ── Analytics — lazy-loaded when the analytics tab is opened ─────────── */
  const loadAnalytics = useCallback(() => {
    if (summary || sumLoading) return;
    const token = localStorage.getItem('session_token');
    if (!token || !activeProvider) return;
    setSumLoading(true);
    fetch(`${API}/dashboard/analytics/summary?provider_id=${activeProvider.id}&days=30`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((d: { ok: boolean; summary?: AnalyticsSummary | null }) => {
        if (d.ok) setSummary(d.summary ?? null);
      })
      .catch(() => null)
      .finally(() => setSumLoading(false));
  }, [summary, sumLoading, activeProvider]);

  useEffect(() => {
    setSummary(null);
  }, [activeProvider?.id]);

  /* ── Tab change ───────────────────────────────────────────────────────── */
  const handleTab = useCallback((next: Tab) => {
    setTab(next);
    if (next === 'analytics') loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (tab === 'analytics' && activeProvider && !summary && !sumLoading) loadAnalytics();
  }, [tab, activeProvider, summary, sumLoading, loadAnalytics]);

  const updateActiveProvider = useCallback((updated: Provider) => {
    setProviders(prev => prev.map((p, i) => i === activeIdx ? updated : p));
  }, [activeIdx]);

  const createProfile = useCallback(async (input: CreateProfileInput): Promise<Provider | null> => {
    const token = localStorage.getItem('session_token');
    if (!token || activeProfileCount >= MAX_PROFILES_PER_ACCOUNT) return null;

    const slugBase = input.display_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || `profile-${Date.now()}`;
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

    const res = await fetch(`${API}/providers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: input.display_name.trim(),
        slug,
        city: input.city?.trim() || undefined,
      }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; provider?: Provider } : null;
    if (!data?.ok || !data.provider) return null;

    if (input.category.trim()) {
      await fetch(`${API}/providers/${data.provider.id}/services`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: input.category.trim(),
          subcategory: input.subcategory?.trim() || undefined,
          title: input.subcategory?.trim() || input.category.trim(),
        }),
      }).catch(() => null);
    }

    const createdProvider: Provider = {
      ...data.provider,
      primary_category: input.category.trim() || null,
      primary_subcategory: input.subcategory?.trim() || null,
    };

    setProviders(prev => {
      const next = [...prev, createdProvider];
      setActiveIdx(next.length - 1);
      return next;
    });
    setTab('profiles');
    return createdProvider;
  }, [activeProfileCount]);

  const archiveProfile = useCallback(async (providerId: string): Promise<boolean> => {
    const token = localStorage.getItem('session_token');
    if (!token) return false;
    const res = await fetch(`${API}/providers/${providerId}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'mini_app_archive' }),
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; provider?: Provider } : null;
    if (!data?.ok || !data.provider) return false;

    setProviders(prev => {
      const next = prev.map(p => p.id === providerId ? data.provider! : p);
      const current = next[activeIdx];
      if (!current || current.id === providerId || current.archived_at || current.pending_delete_at) {
        const firstActive = next.findIndex(p => !p.archived_at && !p.pending_delete_at);
        setActiveIdx(firstActive >= 0 ? firstActive : 0);
      }
      return next;
    });
    return true;
  }, [activeIdx]);

  return {
    phase, setPhase,
    tab, handleTab,
    tgUser,
    providers, activeIdx, setActiveIdx: switchActiveIdx,
    activeProvider,
    updateActiveProvider,
    canManageProfiles,
    maxProfiles: MAX_PROFILES_PER_ACCOUNT,
    createProfile,
    archiveProfile,
    summary, sumLoading, loadAnalytics,
  };
}
