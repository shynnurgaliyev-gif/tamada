/* ── Domain types — single source of truth ─────────────────────────────────
   These types describe the shapes of records in the database / API responses.
   Both apps/api and apps/web should import from here instead of redefining
   locally. UI-specific types (permissions, navigation, telegram) stay in the
   relevant app.
────────────────────────────────────────────────────────────────────────────── */

/* ── Provider ─────────────────────────────────────────────────────────────── */

export type ProviderStatus    = 'active' | 'inactive' | 'sick' | 'vacation' | 'blocked';
export type PublicationStatus = 'draft'  | 'visible'  | 'hidden' | 'suspended';

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
  archived_at?:       string | null;
  archived_by_account_id?: string | null;
  archive_reason?:    string | null;
  pending_delete_at?: string | null;
  show_owner_name?:   boolean;
  primary_category?:  string | null;
  primary_subcategory?: string | null;
  is_featured:        boolean;
  is_verified:        boolean;
  owner_name?:        string | null;
};

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

export type CalendarEntryStatus = 'busy' | 'free' | 'tentative' | 'blocked' | 'vacation';

export type CalendarEntry = {
  id:          string;
  provider_id: string;
  starts_at:   string;
  ends_at:     string;
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

export type DayInfo = {
  date:   string;   // 'YYYY-MM-DD'
  status: string;   // 'free' | 'busy' | 'partial' | 'tentative' | 'past'
  count:  number;
};

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
  top_days: { date: string; contact_reveals: number; profile_views: number }[];
};

/* ── Account / subscription / payments (wire shapes) ────────────────────── */

export type Account = {
  id: string;
  username: string;
  phone: string;
  full_name: string | null;
  show_related_profiles: boolean;
  status?: string;
};

export type Subscription = {
  id: string;
  status: string;
  plan_code: string;
  starts_at: string;
  expires_at: string;
  trial_ends_at: string | null;
};

export type PlanLimits = {
  included_profile_count: number;
  extra_profile_slots: number;
  max_active_profiles: number;
};

export type Payment = {
  id: string;
  amount: string;
  currency: string;
  status: string;
  payment_provider: string;
  created_at: string;
  paid_at: string | null;
};

/* ── Telegram / team / transfers / activity (wire shapes) ────────────────── */

export type TelegramAccount = {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_role: string;
  is_primary: boolean;
  status: string;
  linked_at: string | null;
  access_granted_at?: string | null;
};

export type ActivityLog = {
  id: string;
  action_type: string;
  actor_type: string;
  actor_name: string | null;
  actor_role: string | null;
  actor_telegram_username: string | null;
  target_type: string | null;
  target_id: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: string;
};

/* ── Reference data (Kazakhstan, ISO 3166-2:KZ) ──────────────────────────── */

export type RefRegion      = { id: string; name_ru: string; region_type?: string };
export type RefCity        = { id: string; name_ru: string; region_id: string };
export type RefCategory    = { id: string; name_ru: string; code: string; icon: string | null };
export type RefSubcategory = { id: string; name_ru: string; category_code: string };
export type RefCurrency    = { id: string; code: string; symbol: string };
export type RefLinkType    = { id: string; code: string; name_ru: string };
