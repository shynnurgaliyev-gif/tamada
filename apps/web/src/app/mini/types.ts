/* ── Mini App — shared types ─────────────────────────────────────────────────
   All types specific to the /mini feature. Root layer — no internal imports.
────────────────────────────────────────────────────────────────────────────── */

// Re-export Telegram types used across the mini feature
export type { TelegramWebApp, TgUser } from '@/lib/telegram';

/* ── Domain types ────────────────────────────────────────────────────────────── */

export type Provider = {
  id: string;
  display_name: string;
  slug: string;
  provider_status: string;
};

export type AnalyticsSummary = {
  profile_views: number;
  contact_reveals: number;
  calendar_views: number;
  conversion_pct: number;
};

/* ── Navigation & shell state ─────────────────────────────────────────────── */

/** The 4 persistent tabs of the bottom navigation. */
export type Tab = 'profiles' | 'calendar' | 'analytics' | 'more';

/** Lifecycle phase of the Mini App shell. */
export type Phase = 'loading' | 'onboarding' | 'shell';

/* ── Entry flow routing ───────────────────────────────────────────────────── */

export const VALID_FLOWS = ['dashboard', 'onboarding', 'profiles'] as const;
export type TgFlow = (typeof VALID_FLOWS)[number];

export function isValidFlow(v: string | null): v is TgFlow {
  return VALID_FLOWS.includes(v as TgFlow);
}

/* ── Bottom nav item shape ────────────────────────────────────────────────── */

export type NavItem =
  | { id: Tab;    icon: string; label: string; special?: false }
  | { id: 'add';  icon: string; label: string; special: true   };
