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
  type MiniPermissions,
  OWNER_MINI_PERMISSIONS,
  ASSISTANT_MINI_PERMISSIONS,
} from '../types';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';
const MAX_PROFILES_PER_ACCOUNT = 3;

/* ── Provider cache (localStorage) ───────────────────────────────────────── */

const PCACHE_KEY = 'mc_prov_v2';
const PCACHE_TTL = 10 * 60 * 1000; // 10 min

function readProviderCache(userId?: number): { providers: Provider[]; permissions: MiniPermissions } | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(`${PCACHE_KEY}_${userId}`);
    if (!raw) return null;
    const p = JSON.parse(raw) as { providers: Provider[]; permissions: MiniPermissions; ts: number };
    if (Date.now() - p.ts > PCACHE_TTL) return null;
    return { providers: p.providers, permissions: p.permissions };
  } catch { return null; }
}

function writeProviderCache(userId: number, providers: Provider[], perms: MiniPermissions): void {
  try {
    localStorage.setItem(`${PCACHE_KEY}_${userId}`, JSON.stringify({ providers, permissions: perms, ts: Date.now() }));
  } catch { /* storage full — non-fatal */ }
}

function isMiniTokenValid(): boolean {
  const exp = localStorage.getItem('mini_auth_expires_at');
  if (!exp) return false;
  return new Date(exp).getTime() > Date.now() + 60_000; // 1 min buffer
}

function miniHeaders(): Record<string, string> {
  const token = localStorage.getItem('session_token') ?? '';
  const miniToken = localStorage.getItem('mini_auth_token') ?? '';
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(miniToken ? { 'X-Mini-Auth': miniToken } : {}),
  };
}

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
  miniAuthError: string | null;
  permissions: MiniPermissions;
  createGuestAccount: (input: { full_name: string }) => Promise<boolean>;
  /* Providers */
  providers: Provider[];
  activeIdx: number;
  setActiveIdx: (i: number) => void;
  activeProvider: Provider | null;
  updateActiveProvider: (updated: Provider) => void;
  refreshProviders: () => Promise<void>;
  canManageProfiles: boolean;
  maxProfiles: number;
  createProfile: (input: CreateProfileInput) => Promise<Provider | null>;
  archiveProfile: (providerId: string) => Promise<boolean>;
  unarchiveProfile: (providerId: string) => Promise<boolean>;
  /* Analytics */
  summary:              AnalyticsSummary | null;
  sumLoading:           boolean;
  analyticsDays:        number;
  loadAnalytics:        () => void;
  switchAnalyticsPeriod: (days: number) => void;
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export function useMiniApp(urlTgFlow: string | null): MiniAppState {
  const [phase,      setPhase]      = useState<Phase>('loading');
  const [tab,        setTab]        = useState<Tab>('profiles');
  const [tgUser,     setTgUser]     = useState<TgUser | null>(null);
  const [providers,  setProviders]  = useState<Provider[]>([]);
  const [activeIdx,  setActiveIdx]  = useState(0);
  const [summary,      setSummary]      = useState<AnalyticsSummary | null>(null);
  const [sumLoading,   setSumLoading]   = useState(false);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [miniAuthError, setMiniAuthError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<MiniPermissions>(OWNER_MINI_PERMISSIONS);
  const [verifiedInitData, setVerifiedInitData] = useState('');

  const activeProvider = providers[activeIdx] ?? null;
  const activeProfileCount = providers.filter(p => !p.archived_at && !p.pending_delete_at).length;
  const canManageProfiles = permissions.can_create_profile || permissions.can_archive_profile || permissions.can_edit_profile;
  const syncActiveProvider = useCallback((providerId: string) => {
    const miniToken = localStorage.getItem('mini_auth_token');
    if (!miniToken) return;
    fetch(`${API}/telegram/mini/active-provider`, {
      method: 'POST',
      headers: { ...miniHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider_id: providerId }),
    }).catch(() => null);
  }, []);
  const switchActiveIdx = useCallback((i: number) => {
    setSummary(null);
    setActiveIdx(i);
    const provider = providers[i];
    if (!provider || provider.archived_at || provider.pending_delete_at) return;
    syncActiveProvider(provider.id);
  }, [providers, syncActiveProvider]);

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
    }
    localStorage.removeItem('mini_tg_user_id');
    if (flow === 'profiles') setTab('profiles');

    const initData = tg?.initData ?? '';
    setVerifiedInitData(initData);

    if (initData) {
      const userId = tg?.initDataUnsafe?.user?.id;

      // ── Fast path: show shell immediately from cache ──────────────────
      const cached  = readProviderCache(userId);
      const tokenOk = isMiniTokenValid();
      if (cached && cached.providers.length > 0 && tokenOk) {
        setPermissions(cached.permissions);
        setProviders(cached.providers);
        setActiveIdx(0);
        setPhase('shell');
        // Don't clear the still-valid token — auth will refresh it in background
      } else {
        // No valid cache → clear stale tokens, keep showing loader
        localStorage.removeItem('session_token');
        localStorage.removeItem('mini_auth_token');
        localStorage.removeItem('mini_auth_expires_at');
        setProviders([]);
        setActiveIdx(0);
      }

      // ── Always re-auth in background to refresh token + sync providers ─
      fetch(`${API}/telegram/mini/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ init_data: initData }),
      })
        .then(r => r.json())
        .then((d: { ok: boolean; state?: 'guest' | 'authenticated'; providers?: Provider[]; role?: string | null; permissions?: MiniPermissions; mini_token?: string | null; expires_at?: string | null; error?: string }) => {
          if (d.ok && d.state === 'authenticated' && d.mini_token) {
            localStorage.removeItem('session_token');
            localStorage.setItem('mini_auth_token', d.mini_token);
            if (d.expires_at) localStorage.setItem('mini_auth_expires_at', d.expires_at);
            const nextProviders = d.providers ?? [];
            const nextPerms = d.permissions ?? ASSISTANT_MINI_PERMISSIONS;
            setPermissions(nextPerms);
            setProviders(nextProviders);
            setActiveIdx(current => {
              const cur = nextProviders[current];
              if (cur && !cur.archived_at && !cur.pending_delete_at) return current;
              const first = nextProviders.findIndex(p => !p.archived_at && !p.pending_delete_at);
              return first >= 0 ? first : 0;
            });
            if (userId) writeProviderCache(userId, nextProviders, nextPerms);
            setPhase(nextProviders.length > 0 ? 'shell' : 'onboarding');
          } else if (d.ok && d.state === 'guest') {
            localStorage.removeItem('mini_auth_token');
            localStorage.removeItem('mini_auth_expires_at');
            setPermissions(ASSISTANT_MINI_PERMISSIONS);
            setProviders([]);
            setActiveIdx(0);
            setPhase('guest');
          } else {
            localStorage.removeItem('mini_auth_token');
            localStorage.removeItem('mini_auth_expires_at');
            if (d.error) setMiniAuthError(d.error);
            setPhase('guest');
          }
        })
        .catch(() => {
          localStorage.removeItem('mini_auth_token');
          localStorage.removeItem('mini_auth_expires_at');
          setMiniAuthError('Не удалось проверить вход через Telegram. Откройте Mini App заново из Telegram.');
          setPhase('guest');
        });
      return;
    }

    const token = localStorage.getItem('session_token');

    // No verified Telegram data and no web token → onboarding fallback
    if (!token) {
      if (tg?.initDataUnsafe?.user) {
        setMiniAuthError('Telegram не передал данные для безопасного входа. Откройте Mini App заново из Telegram.');
      }
      setPhase('guest');
      return;
    }

    // onboarding flow → show gate, but silently load providers
    if (flow === 'onboarding') {
      setPermissions(OWNER_MINI_PERMISSIONS);
      setPhase('onboarding');
      fetchProviders();
      return;
    }

    // Default → fetch providers then enter shell
    setPermissions(OWNER_MINI_PERMISSIONS);
    fetchProviders().finally(() => setPhase('shell'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);                          // run once on mount

  const createGuestAccount = useCallback(async (input: { full_name: string }): Promise<boolean> => {
    if (!verifiedInitData) {
      setMiniAuthError('Откройте Mini App заново из Telegram, чтобы создать аккаунт.');
      return false;
    }
    const res = await fetch(`${API}/telegram/mini/account`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ init_data: verifiedInitData, full_name: input.full_name }),
    }).catch(() => null);
    const data = res ? await res.json() as {
      ok: boolean;
      providers?: Provider[];
      permissions?: MiniPermissions;
      mini_token?: string | null;
      expires_at?: string | null;
      error?: string;
    } : null;
    if (!data?.ok || !data.mini_token) {
      setMiniAuthError(data?.error ?? 'Не удалось создать аккаунт. Попробуйте еще раз.');
      return false;
    }
    localStorage.removeItem('session_token');
    localStorage.setItem('mini_auth_token', data.mini_token);
    if (data.expires_at) localStorage.setItem('mini_auth_expires_at', data.expires_at);
    const nextProviders = data.providers ?? [];
    setPermissions(data.permissions ?? OWNER_MINI_PERMISSIONS);
    setProviders(nextProviders);
    setActiveIdx(0);
    setMiniAuthError(null);
    setPhase('onboarding');
    return true;
  }, [verifiedInitData]);

  /* ── Provider fetcher ─────────────────────────────────────────────────── */
  function fetchProviders(): Promise<void> {
    return fetch(`${API}/providers/me?include_archived=1`, {
      headers: miniHeaders(),
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

  /* ── Analytics ─────────────────────────────────────────────────────────── */

  // Raw fetch — always re-fetches with given days
  const fetchAnalytics = useCallback((days: number) => {
    if (!permissions.can_view_analytics || !activeProvider) return;
    const headers = miniHeaders();
    if (!headers['Authorization'] && !headers['X-Mini-Auth']) return;
    setSumLoading(true);
    fetch(`${API}/dashboard/analytics/summary?provider_id=${activeProvider.id}&days=${days}`, { headers })
      .then(r => r.json())
      .then((d: { ok: boolean; summary?: AnalyticsSummary | null }) => {
        if (d.ok) setSummary(d.summary ?? null);
      })
      .catch(() => null)
      .finally(() => setSumLoading(false));
  }, [activeProvider, permissions.can_view_analytics]);

  // Lazy load — skips if already loaded
  const loadAnalytics = useCallback(() => {
    if (summary || sumLoading) return;
    fetchAnalytics(analyticsDays);
  }, [summary, sumLoading, analyticsDays, fetchAnalytics]);

  // Period switch — clears summary and re-fetches
  const switchAnalyticsPeriod = useCallback((days: number) => {
    setAnalyticsDays(days);
    setSummary(null);
    fetchAnalytics(days);
  }, [fetchAnalytics]);

  useEffect(() => {
    setSummary(null);
  }, [activeProvider?.id]);

  // Background prefetch: start loading analytics ~1.2s after shell renders
  // so it's ready when the user opens the analytics tab
  useEffect(() => {
    if (phase !== 'shell' || !activeProvider || !permissions.can_view_analytics) return;
    const t = setTimeout(() => {
      setSummary(prev => {
        if (prev) return prev; // already loaded, skip
        fetchAnalytics(analyticsDays);
        return prev;
      });
    }, 1200);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeProvider?.id]);

  /* ── Tab change ───────────────────────────────────────────────────────── */
  const handleTab = useCallback((next: Tab) => {
    if (next === 'analytics' && !permissions.can_view_analytics) return;
    if (next === 'calendar' && !permissions.can_manage_calendar) return;
    setTab(next);
    if (next === 'analytics') loadAnalytics();
  }, [loadAnalytics, permissions.can_view_analytics, permissions.can_manage_calendar]);

  useEffect(() => {
    if (tab === 'analytics' && activeProvider && !summary && !sumLoading) loadAnalytics();
  }, [tab, activeProvider, summary, sumLoading, loadAnalytics]);

  const updateActiveProvider = useCallback((updated: Provider) => {
    setProviders(prev => prev.map((p, i) => i === activeIdx ? updated : p));
  }, [activeIdx]);

  const createProfile = useCallback(async (input: CreateProfileInput): Promise<Provider | null> => {
    const token = localStorage.getItem('session_token');
    const miniToken = localStorage.getItem('mini_auth_token');
    if (!permissions.can_create_profile || (!token && !miniToken) || activeProfileCount >= MAX_PROFILES_PER_ACCOUNT) return null;

    const slugBase = input.display_name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32) || `profile-${Date.now()}`;
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;

    const res = await fetch(`${API}/providers`, {
      method: 'POST',
      headers: { ...miniHeaders(), 'Content-Type': 'application/json' },
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
        headers: { ...miniHeaders(), 'Content-Type': 'application/json' },
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
    syncActiveProvider(createdProvider.id);
    setTab('profiles');
    return createdProvider;
  }, [activeProfileCount, permissions.can_create_profile, syncActiveProvider]);

  const archiveProfile = useCallback(async (providerId: string): Promise<boolean> => {
    const token = localStorage.getItem('session_token');
    const miniToken = localStorage.getItem('mini_auth_token');
    if (!permissions.can_archive_profile || (!token && !miniToken)) return false;
    const res = await fetch(`${API}/providers/${providerId}/archive`, {
      method: 'POST',
      headers: { ...miniHeaders(), 'Content-Type': 'application/json' },
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
        if (firstActive >= 0) syncActiveProvider(next[firstActive]!.id);
      }
      return next;
    });
    return true;
  }, [activeIdx, permissions.can_archive_profile, syncActiveProvider]);

  const unarchiveProfile = useCallback(async (providerId: string): Promise<boolean> => {
    const token = localStorage.getItem('session_token');
    const miniToken = localStorage.getItem('mini_auth_token');
    if (!permissions.can_archive_profile || (!token && !miniToken)) return false;
    const res = await fetch(`${API}/providers/${providerId}/unarchive`, {
      method: 'POST',
      headers: { ...miniHeaders(), 'Content-Type': 'application/json' },
    }).catch(() => null);
    const data = res ? await res.json() as { ok: boolean; provider?: Provider } : null;
    if (!data?.ok || !data.provider) return false;

    setProviders(prev => prev.map(p => p.id === providerId ? data.provider! : p));
    return true;
  }, [permissions.can_archive_profile]);

  return {
    phase, setPhase,
    tab, handleTab,
    tgUser,
    miniAuthError,
    permissions,
    createGuestAccount,
    providers, activeIdx, setActiveIdx: switchActiveIdx,
    activeProvider,
    updateActiveProvider,
    refreshProviders: fetchProviders,
    canManageProfiles,
    maxProfiles: MAX_PROFILES_PER_ACCOUNT,
    createProfile,
    archiveProfile,
    unarchiveProfile,
    summary, sumLoading, analyticsDays, loadAnalytics, switchAnalyticsPeriod,
  };
}
