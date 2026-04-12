import type { Db } from '../db';

export type ContactReveal = {
  id: string;
  provider_id: string;
  source_page: string;
  selected_date: string | null;
  selected_time_from: string | null;
  selected_time_to: string | null;
  viewer_session_id: string | null;
  created_at: Date;
};

export type AnalyticsDaily = {
  id: string;
  provider_id: string;
  date: string;
  profile_views: number;
  contact_reveals: number;
  calendar_views: number;
  search_impressions: number;
  created_at: Date;
  updated_at: Date;
};

// ── Upsert helpers ─────────────────────────────────────────────────────

async function incrementDaily(
  db: Db,
  providerId: string,
  field: 'profile_views' | 'contact_reveals' | 'calendar_views' | 'search_impressions',
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  // Build field-specific upsert to avoid dynamic SQL injection risk
  if (field === 'profile_views') {
    await db`
      INSERT INTO provider_analytics_daily (provider_id, date, profile_views)
      VALUES (${providerId}, ${today}, 1)
      ON CONFLICT (provider_id, date)
      DO UPDATE SET profile_views = provider_analytics_daily.profile_views + 1, updated_at = NOW()
    `;
  } else if (field === 'contact_reveals') {
    await db`
      INSERT INTO provider_analytics_daily (provider_id, date, contact_reveals)
      VALUES (${providerId}, ${today}, 1)
      ON CONFLICT (provider_id, date)
      DO UPDATE SET contact_reveals = provider_analytics_daily.contact_reveals + 1, updated_at = NOW()
    `;
  } else if (field === 'calendar_views') {
    await db`
      INSERT INTO provider_analytics_daily (provider_id, date, calendar_views)
      VALUES (${providerId}, ${today}, 1)
      ON CONFLICT (provider_id, date)
      DO UPDATE SET calendar_views = provider_analytics_daily.calendar_views + 1, updated_at = NOW()
    `;
  } else {
    await db`
      INSERT INTO provider_analytics_daily (provider_id, date, search_impressions)
      VALUES (${providerId}, ${today}, 1)
      ON CONFLICT (provider_id, date)
      DO UPDATE SET search_impressions = provider_analytics_daily.search_impressions + 1, updated_at = NOW()
    `;
  }
}

// ── Public: track profile view (fire-and-forget safe) ─────────────────

export async function trackProfileView(db: Db, providerId: string): Promise<void> {
  await incrementDaily(db, providerId, 'profile_views');
}

// ── Public: log contact reveal ────────────────────────────────────────

export async function logContactReveal(db: Db, data: {
  providerId: string;
  sourcePage: string;
  selectedDate?: string;
  selectedTimeFrom?: string;
  selectedTimeTo?: string;
  viewerSessionId?: string;
}): Promise<void> {
  await db`
    INSERT INTO contact_reveals
      (provider_id, source_page, selected_date, selected_time_from, selected_time_to, viewer_session_id)
    VALUES (
      ${data.providerId},
      ${data.sourcePage},
      ${data.selectedDate ?? null},
      ${data.selectedTimeFrom ?? null},
      ${data.selectedTimeTo ?? null},
      ${data.viewerSessionId ?? null}
    )
  `;
  await incrementDaily(db, data.providerId, 'contact_reveals');
}

// ── Dashboard: summary (last N days) ─────────────────────────────────

export type AnalyticsSummary = {
  profile_views: number;
  contact_reveals: number;
  calendar_views: number;
  conversion_pct: number; // contact_reveals / profile_views * 100
  top_days: { date: string; contact_reveals: number; profile_views: number }[];
};

export async function getAnalyticsSummary(
  db: Db,
  providerId: string,
  days = 30,
): Promise<AnalyticsSummary> {
  const rows = await db<AnalyticsDaily[]>`
    SELECT *
    FROM provider_analytics_daily
    WHERE provider_id = ${providerId}
      AND date >= CURRENT_DATE - ${days}::int
    ORDER BY date DESC
  `;

  const profile_views  = rows.reduce((s, r) => s + r.profile_views, 0);
  const contact_reveals = rows.reduce((s, r) => s + r.contact_reveals, 0);
  const calendar_views  = rows.reduce((s, r) => s + r.calendar_views, 0);
  const conversion_pct  = profile_views > 0
    ? Math.round((contact_reveals / profile_views) * 100)
    : 0;

  const top_days = [...rows]
    .sort((a, b) => b.contact_reveals - a.contact_reveals)
    .slice(0, 5)
    .map(r => ({
      date: typeof r.date === 'string' ? r.date : (r.date as Date).toISOString().slice(0, 10),
      contact_reveals: r.contact_reveals,
      profile_views: r.profile_views,
    }));

  return { profile_views, contact_reveals, calendar_views, conversion_pct, top_days };
}

// ── Dashboard: daily range ────────────────────────────────────────────

export async function getAnalyticsDaily(
  db: Db,
  providerId: string,
  from: Date,
  to: Date,
): Promise<AnalyticsDaily[]> {
  return db<AnalyticsDaily[]>`
    SELECT *
    FROM provider_analytics_daily
    WHERE provider_id = ${providerId}
      AND date >= ${from.toISOString().slice(0, 10)}
      AND date <= ${to.toISOString().slice(0, 10)}
    ORDER BY date ASC
  `;
}
