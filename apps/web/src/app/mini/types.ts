/* ── Mini App — shared types ─────────────────────────────────────────────────
   Root layer — no internal imports.
────────────────────────────────────────────────────────────────────────────── */

export type { TelegramWebApp, TgUser } from '@/lib/telegram';

/* ── Provider status enums ───────────────────────────────────────────────── */

export type ProviderStatus    = 'active' | 'inactive' | 'sick' | 'vacation' | 'blocked';
export type PublicationStatus = 'draft'  | 'visible'  | 'hidden' | 'suspended';

/* ── Core provider (all fields returned from /providers/me) ──────────────── */

export type Provider = {
  id:                 string;
  display_name:       string;
  slug:               string;
  bio:                string | null;
  country_code:       string | null;
  region:             string | null;
  city:               string | null;
  district:           string | null;
  address_text:       string | null;
  timezone:           string;
  provider_status:    ProviderStatus;
  publication_status: PublicationStatus;
  is_featured:        boolean;
  is_verified:        boolean;
};

/** Subset of provider fields that can be updated via PATCH /providers/:id */
export type ProviderUpdate = Partial<
  Pick<Provider,
    | 'display_name' | 'bio' | 'country_code' | 'region' | 'city'
    | 'district' | 'address_text' | 'timezone'
    | 'provider_status' | 'publication_status'
  >
>;

/* ── Provider sub-resources ──────────────────────────────────────────────── */

export type ProviderPhoto = {
  id:           string;
  provider_id:  string;
  storage_path: string;
  sort_order:   number;
  is_cover:     boolean;
  created_at:   string;
  url:          string;
};

export type LinkType =
  | 'instagram' | 'whatsapp' | 'telegram' | 'tiktok'
  | 'youtube'   | 'website'  | 'two_gis'  | 'map' | 'other';

export type ProviderLink = {
  id:          string;
  provider_id: string;
  link_type:   LinkType;
  url:         string;
  label:       string | null;
};

export type ProviderService = {
  id:          string;
  provider_id: string;
  category:    string;
  subcategory: string | null;
  title:       string;
  description: string | null;
  price_from:  number | null;
  price_to:    number | null;
  currency:    string;
  is_active:   boolean;
};

/* ── Calendar ────────────────────────────────────────────────────────────── */

export type CalendarEntryStatus = 'busy' | 'free' | 'tentative' | 'blocked';

export type CalendarEntry = {
  id:          string;
  provider_id: string;
  starts_at:   string;   // ISO string (UTC)
  ends_at:     string;   // ISO string (UTC)
  status:      CalendarEntryStatus;
  title:       string | null;
  notes:       string | null;
};

export type CalendarEntryClient = {
  id:                string;
  calendar_entry_id: string;
  client_name:       string | null;
  client_phone:      string | null;
  event_type:        string | null;
  location_text:     string | null;
  price_amount:      string | null;
  currency:          string;
  notes:             string | null;
};

export type CalendarEntryWithClient = CalendarEntry & { client: CalendarEntryClient | null };

/** Day summary from GET /providers/:id/calendar/month */
export type DayInfo = {
  date:   string;   // 'YYYY-MM-DD'
  status: string;   // 'free' | 'busy' | 'partial' | 'tentative' | 'past'
  count:  number;
};

/** Shape sent to POST / PATCH calendar endpoints */
export type EntryInput = {
  starts_at: string;
  ends_at:   string;
  status:    CalendarEntryStatus;
  title?:    string | null;
  notes?:    string | null;
  client?: {
    client_name?:    string | null;
    client_phone?:   string | null;
    event_type?:     string | null;
    location_text?:  string | null;
    price_amount?:   string | null;
    currency?:       string;
    notes?:          string | null;
  };
};

/* ── Analytics ───────────────────────────────────────────────────────────── */

export type AnalyticsSummary = {
  profile_views:   number;
  contact_reveals: number;
  calendar_views:  number;
  conversion_pct:  number;
};

/* ── Navigation & shell state ─────────────────────────────────────────────── */

export type Tab   = 'profiles' | 'calendar' | 'analytics' | 'more';
export type Phase = 'loading'  | 'onboarding' | 'shell';

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
