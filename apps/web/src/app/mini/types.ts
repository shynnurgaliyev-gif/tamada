/* ── Mini App — shared types ─────────────────────────────────────────────────
   Domain types live in @octiqa/types (packages/types/src/domain.ts).
   This file only holds mini-app-specific UI/permission/navigation types.
────────────────────────────────────────────────────────────────────────────── */

export type { TelegramWebApp, TgUser } from '@/lib/telegram';

export type {
  Provider, ProviderStatus, PublicationStatus, ProviderUpdate,
  ProviderPhoto, ProviderLink, ProviderService, LinkType,
  CalendarEntry, CalendarEntryClient, CalendarEntryWithClient,
  CalendarEntryStatus, DayInfo, EntryInput,
  AnalyticsSummary,
} from '@octiqa/types';

/* ── Mini-app UI ─────────────────────────────────────────────────────────── */

export type MiniPermissions = {
  can_view_profile: boolean;
  can_edit_profile: boolean;
  can_manage_calendar: boolean;
  can_view_analytics: boolean;
  can_manage_team: boolean;
  can_manage_subscription: boolean;
  can_manage_integrations: boolean;
  can_archive_profile: boolean;
  can_create_profile: boolean;
};

export const OWNER_MINI_PERMISSIONS: MiniPermissions = {
  can_view_profile: true,
  can_edit_profile: true,
  can_manage_calendar: true,
  can_view_analytics: true,
  can_manage_team: true,
  can_manage_subscription: true,
  can_manage_integrations: true,
  can_archive_profile: true,
  can_create_profile: true,
};

export const ASSISTANT_MINI_PERMISSIONS: MiniPermissions = {
  can_view_profile: true,
  can_edit_profile: false,
  can_manage_calendar: true,
  can_view_analytics: false,
  can_manage_team: false,
  can_manage_subscription: false,
  can_manage_integrations: false,
  can_archive_profile: false,
  can_create_profile: false,
};

/* ── Navigation & shell state ─────────────────────────────────────────────── */

export type Tab   = 'profiles' | 'calendar' | 'analytics' | 'more';
export type Phase = 'loading' | 'guest' | 'onboarding' | 'shell';

/* ── Entry flow routing ───────────────────────────────────────────────────── */

export const VALID_FLOWS = ['dashboard', 'onboarding', 'profiles'] as const;
export type TgFlow = (typeof VALID_FLOWS)[number];

export function isValidFlow(v: string | null): v is TgFlow {
  return VALID_FLOWS.includes(v as TgFlow);
}

/* ── Bottom nav item shape ────────────────────────────────────────────────── */

export type NavItem =
  | { id: Tab;   icon: string; label: string; special?: false }
  | { id: 'add'; icon: string; label: string; special: true   };
