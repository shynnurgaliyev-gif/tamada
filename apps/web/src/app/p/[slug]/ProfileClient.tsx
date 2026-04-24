'use client';
import { useCallback, useEffect, useState, useRef } from 'react';
import { FaWhatsapp, FaTelegram, FaInstagram, FaYoutube, FaTiktok, FaGlobe, FaPhone, FaLink, FaMapMarkerAlt, FaComments } from 'react-icons/fa';
import { OctiMark } from '@/components/OctiLogo';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

type Provider = {
  id: string; display_name: string; slug: string; bio: string | null;
  city: string | null; region: string | null; is_verified: boolean;
  provider_status: string; owner_name?: string | null;
};
type RelatedProfile = {
  id: string;
  display_name: string;
  slug: string;
  city: string | null;
  primary_category: string | null;
  primary_subcategory: string | null;
};
type Service = { id: string; category: string; title: string; description: string | null; price_from: string | null; price_to: string | null; currency: string; };
type Photo = { id: string; url: string; is_cover: boolean; };
type Link = { id: string; link_type: string; url: string; label: string | null; };
type DayInfo = { date: string; status: string; count: number };
type PublicCalendarEntry = {
  id: string;
  starts_at: string;
  ends_at: string;
  status: 'busy' | 'free' | 'tentative' | 'blocked';
};
type CalendarChangeEvent = {
  provider_id: string;
  action: 'create' | 'update' | 'delete';
  entry_id: string;
  ranges: { starts_at: string; ends_at: string }[];
  changed_at: string;
};

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const DAYS_SHORT = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const CAL_ST: Record<string, { bg: string; color: string; border: string; label: string }> = {
  free:     { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Свободно'    },
  busy:     { bg: '#fff1f2', color: '#e11d48', border: '#fecdd3', label: 'Занято'       },
  partial:  { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa', label: 'Частично'     },
  tentative:{ bg: '#fefce8', color: '#ca8a04', border: '#fde68a', label: 'Под вопросом' },
  past:     { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Прошлое'     },
};
const TIMELINE_ST: Record<string, { bg: string; color: string; border: string; label: string }> = {
  free:      { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', label: 'Свободно' },
  busy:      { bg: '#fff1f2', color: '#be123c', border: '#fecdd3', label: 'Занято' },
  tentative: { bg: '#fefce8', color: '#a16207', border: '#fde68a', label: 'Под вопросом' },
  blocked:   { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1', label: 'Недоступно' },
};

import type { IconType } from 'react-icons';

type LinkCfg = { Icon: IconType; label: string; bg: string; text: string };
const LINK_CFG: Record<string, LinkCfg> = {
  phone:     { Icon: FaPhone,         label: 'Позвонить', bg: 'var(--brand)',  text: '#fff' },
  whatsapp:  { Icon: FaWhatsapp,      label: 'WhatsApp',  bg: '#25D366',       text: '#fff' },
  telegram:  { Icon: FaTelegram,      label: 'Telegram',  bg: '#229ED9',       text: '#fff' },
  instagram: { Icon: FaInstagram,     label: 'Instagram', bg: 'linear-gradient(135deg,#f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', text: '#fff' },
  tiktok:    { Icon: FaTiktok,        label: 'TikTok',    bg: '#010101',       text: '#fff' },
  youtube:   { Icon: FaYoutube,       label: 'YouTube',   bg: '#FF0000',       text: '#fff' },
  website:   { Icon: FaGlobe,         label: 'Сайт',      bg: 'var(--surface-2)', text: 'var(--ink)' },
  two_gis:   { Icon: FaMapMarkerAlt,  label: '2GIS',      bg: 'var(--surface-2)', text: 'var(--ink)' },
  map:       { Icon: FaMapMarkerAlt,  label: 'Карта',     bg: 'var(--surface-2)', text: 'var(--ink)' },
  other:     { Icon: FaLink,          label: 'Ссылка',    bg: 'var(--surface-2)', text: 'var(--ink)' },
};

// Deterministic gradient from name — each provider always gets the same colour
const GRADIENTS = [
  'linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%)',
  'linear-gradient(135deg,#db2777 0%,#7c3aed 100%)',
  'linear-gradient(135deg,#059669 0%,#0284c7 100%)',
  'linear-gradient(135deg,#d97706 0%,#b45309 100%)',
  'linear-gradient(135deg,#dc2626 0%,#9d174d 100%)',
  'linear-gradient(135deg,#7c3aed 0%,#ec4899 100%)',
  'linear-gradient(135deg,#0f172a 0%,#1e40af 100%)',
];
function nameToGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length]!;
}

// Stable anonymous session id (not tied to user identity)
function getSessionId(): string {
  const key = 'lk_sid';
  let id = sessionStorage.getItem(key);
  if (!id) { id = Math.random().toString(36).slice(2); sessionStorage.setItem(key, id); }
  return id;
}

function calendarDaysEqual(a: DayInfo[], b: DayInfo[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (left.date !== right.date || left.status !== right.status || left.count !== right.count) {
      return false;
    }
  }
  return true;
}

function rangeTouchesMonth(range: { starts_at: string; ends_at: string }, year: number, month: number): boolean {
  const startsAt = new Date(range.starts_at);
  const endsAt = new Date(range.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return true;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  return startsAt.getTime() < monthEnd.getTime() && endsAt.getTime() > monthStart.getTime();
}

function dayBounds(date: string): { start: Date; end: Date; from: string; to: string } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end, from: start.toISOString(), to: end.toISOString() };
}

function rangeTouchesDate(range: { starts_at: string; ends_at: string }, date: string): boolean {
  const startsAt = new Date(range.starts_at);
  const endsAt = new Date(range.ends_at);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return true;
  const { start, end } = dayBounds(date);
  return startsAt.getTime() < end.getTime() && endsAt.getTime() > start.getTime();
}

function calendarEntriesEqual(a: PublicCalendarEntry[], b: PublicCalendarEntry[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i]!;
    const right = b[i]!;
    if (
      left.id !== right.id ||
      left.starts_at !== right.starts_at ||
      left.ends_at !== right.ends_at ||
      left.status !== right.status
    ) return false;
  }
  return true;
}

function minutesInDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function formatMinutes(total: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, total));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

function isAllDayEntry(entry: PublicCalendarEntry, date: string): boolean {
  const { start, end } = dayBounds(date);
  const startsAt = new Date(entry.starts_at);
  const endsAt = new Date(entry.ends_at);
  return startsAt.getTime() <= start.getTime() && endsAt.getTime() >= end.getTime() - 60000;
}

type TimelineSegment = {
  key: string;
  status: 'free' | 'busy' | 'tentative' | 'blocked';
  fromMin: number;
  toMin: number;
};

function buildTimelineSegments(entries: PublicCalendarEntry[], date: string): TimelineSegment[] {
  const { start, end } = dayBounds(date);
  const timedEntries = entries
    .filter(entry => !isAllDayEntry(entry, date))
    .map(entry => {
      const startsAt = new Date(entry.starts_at);
      const endsAt = new Date(entry.ends_at);
      const clippedStart = new Date(Math.max(startsAt.getTime(), start.getTime()));
      const clippedEnd = new Date(Math.min(endsAt.getTime(), end.getTime()));
      return {
        ...entry,
        fromMin: minutesInDay(clippedStart),
        toMin: clippedEnd.getTime() >= end.getTime() ? 24 * 60 : minutesInDay(clippedEnd),
      };
    })
    .filter(entry => entry.toMin > entry.fromMin)
    .sort((a, b) => a.fromMin - b.fromMin || a.toMin - b.toMin);

  const segments: TimelineSegment[] = [];
  let cursor = 0;

  for (const entry of timedEntries) {
    if (entry.fromMin > cursor) {
      segments.push({ key: `free-${cursor}-${entry.fromMin}`, status: 'free', fromMin: cursor, toMin: entry.fromMin });
    }
    const fromMin = Math.max(cursor, entry.fromMin);
    if (entry.toMin > fromMin) {
      segments.push({ key: entry.id, status: entry.status === 'free' ? 'free' : entry.status, fromMin, toMin: entry.toMin });
      cursor = Math.max(cursor, entry.toMin);
    }
  }

  if (cursor < 24 * 60) {
    segments.push({ key: `free-${cursor}-1440`, status: 'free', fromMin: cursor, toMin: 24 * 60 });
  }

  return segments.filter(segment => segment.toMin - segment.fromMin >= 15);
}

export default function ProfileClient({ slug }: { slug: string }) {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [relatedProfiles, setRelatedProfiles] = useState<RelatedProfile[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calDays, setCalDays] = useState<DayInfo[]>([]);
  const [calTimezone, setCalTimezone] = useState('Asia/Almaty');
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [selectedDayEntries, setSelectedDayEntries] = useState<PublicCalendarEntry[]>([]);
  const [selectedDayLoading, setSelectedDayLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  // Contact reveal state
  const [revealLinks, setRevealLinks] = useState<Link[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const contactRef = useRef<HTMLDivElement>(null);
  const calendarTrackRef = useRef<HTMLDivElement>(null);
  const calendarTracked = useRef(false);
  const calendarRequestId = useRef(0);
  const dayRequestId = useRef(0);
  const visibleCalendarRef = useRef({ year: calYear, month: calMonth });
  const selectedDayRef = useRef<string | null>(selectedCalDate);
  const [calendarRealtimeConnected, setCalendarRealtimeConnected] = useState(false);

  useEffect(() => {
    visibleCalendarRef.current = { year: calYear, month: calMonth };
  }, [calYear, calMonth]);

  useEffect(() => {
    selectedDayRef.current = selectedCalDate;
  }, [selectedCalDate]);

  const refreshCalendarMonth = useCallback(async (year: number, month: number): Promise<boolean> => {
    if (!slug) return false;
    const requestId = ++calendarRequestId.current;
    try {
      const res = await fetch(`${API}/public/providers/${slug}/calendar/month?year=${year}&month=${month}`, {
        cache: 'no-store',
      });
      const c = await res.json() as { ok: boolean; days?: DayInfo[]; timezone?: string };
      if (!c.ok || requestId !== calendarRequestId.current) return false;
      if (visibleCalendarRef.current.year !== year || visibleCalendarRef.current.month !== month) return false;
      let changed = false;
      setCalDays(prev => {
        const next = c.days ?? [];
        if (calendarDaysEqual(prev, next)) return prev;
        changed = true;
        return next;
      });
      if (c.timezone) setCalTimezone(c.timezone);
      return changed;
    } catch {
      return false;
    }
  }, [slug]);

  const refreshSelectedDay = useCallback(async (date: string): Promise<boolean> => {
    if (!slug) return false;
    const { from, to } = dayBounds(date);
    const requestId = ++dayRequestId.current;
    setSelectedDayLoading(true);
    try {
      const res = await fetch(`${API}/public/providers/${slug}/calendar?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
        cache: 'no-store',
      });
      const d = await res.json() as { ok: boolean; entries?: PublicCalendarEntry[]; timezone?: string };
      if (!d.ok || requestId !== dayRequestId.current || selectedDayRef.current !== date) return false;
      let changed = false;
      const nextEntries = (d.entries ?? []).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      setSelectedDayEntries(prev => {
        if (calendarEntriesEqual(prev, nextEntries)) return prev;
        changed = true;
        return nextEntries;
      });
      if (d.timezone) setCalTimezone(d.timezone);
      return changed;
    } catch {
      return false;
    } finally {
      if (requestId === dayRequestId.current) setSelectedDayLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      const res = await fetch(`${API}/public/providers/${slug}`).catch(() => null);
      const d = res ? await res.json() as { ok: boolean; provider?: Provider; services?: Service[]; photos?: Photo[]; related_profiles?: RelatedProfile[] } : null;

      if (d?.ok) {
        setProvider(d.provider ?? null);
        setServices(d.services ?? []);
        setPhotos(d.photos ?? []);
        setRelatedProfiles(d.related_profiles ?? []);
        const yr = new Date().getFullYear();
        const mo = new Date().getMonth() + 1;
        void refreshCalendarMonth(yr, mo);
      } else {
        // Owner preview fallback
        const token = localStorage.getItem('session_token');
        if (token) {
          try {
            const meRes = await fetch(`${API}/providers/me`, { headers: { Authorization: `Bearer ${token}` } });
            const me = await meRes.json() as { ok: boolean; providers?: (Provider & { id: string })[] };
            const own = me.providers?.find(p => p.slug === slug);
            if (own) {
              setIsPreview(true);
              setProvider(own);
              const dataRes = await fetch(`${API}/providers/${own.id}/data`, { headers: { Authorization: `Bearer ${token}` } });
              const data = await dataRes.json() as { ok: boolean; services?: Service[]; photos?: Photo[]; links?: Link[] };
              if (data.ok) {
                setServices(data.services ?? []);
                setPhotos(data.photos ?? []);
                // In preview mode, show links directly (owner sees their own contacts)
                setRevealLinks(data.links ?? []);
                setRevealed(true);
              }
            } else { setNotFound(true); }
          } catch { setNotFound(true); }
        } else { setNotFound(true); }
      }
      setLoading(false);
    }

    void load();
  }, [slug, refreshCalendarMonth]);

  useEffect(() => {
    if (!provider || !slug) return;
    void refreshCalendarMonth(calYear, calMonth);
  }, [calYear, calMonth, slug, provider, refreshCalendarMonth]);

  useEffect(() => {
    if (!provider || !slug || !selectedCalDate) {
      setSelectedDayEntries([]);
      setSelectedDayLoading(false);
      dayRequestId.current += 1;
      return;
    }
    void refreshSelectedDay(selectedCalDate);
  }, [provider, slug, selectedCalDate, refreshSelectedDay]);

  useEffect(() => {
    if (!provider || !slug || isPreview || typeof EventSource === 'undefined') return;

    const stream = new EventSource(`${API}/public/providers/${slug}/calendar/stream`);
    stream.onopen = () => setCalendarRealtimeConnected(true);
    stream.addEventListener('calendar-change', event => {
      try {
        const payload = JSON.parse((event as MessageEvent<string>).data) as CalendarChangeEvent;
        if (payload.ranges.some(range => rangeTouchesMonth(range, calYear, calMonth))) {
          void refreshCalendarMonth(calYear, calMonth);
        }
        const selectedDay = selectedDayRef.current;
        if (selectedDay && payload.ranges.some(range => rangeTouchesDate(range, selectedDay))) {
          void refreshSelectedDay(selectedDay);
        }
      } catch {
        void refreshCalendarMonth(calYear, calMonth);
        if (selectedDayRef.current) void refreshSelectedDay(selectedDayRef.current);
      }
    });
    stream.onerror = () => setCalendarRealtimeConnected(false);

    return () => {
      stream.close();
      setCalendarRealtimeConnected(false);
    };
  }, [provider, slug, isPreview, calYear, calMonth, refreshCalendarMonth, refreshSelectedDay]);

  useEffect(() => {
    if (!provider || !slug || isPreview || calendarRealtimeConnected) return;

    const timer = setInterval(() => {
      void refreshCalendarMonth(calYear, calMonth);
      if (selectedDayRef.current) void refreshSelectedDay(selectedDayRef.current);
    }, 30000);
    return () => clearInterval(timer);
  }, [provider, slug, isPreview, calendarRealtimeConnected, calYear, calMonth, refreshCalendarMonth, refreshSelectedDay]);

  void calTimezone;

  // Track calendar view: only after user dwells on the section for ≥1.5s
  useEffect(() => {
    if (!provider || isPreview) return;
    const el = calendarTrackRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const obs = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry?.isIntersecting && !calendarTracked.current) {
        timer = setTimeout(() => {
          if (calendarTracked.current) return;
          calendarTracked.current = true;
          fetch(`${API}/public/providers/${slug}/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event: 'calendar_view', viewer_session_id: getSessionId() }),
          }).catch(() => null);
        }, 1500);
      } else {
        // Scrolled away before 1.5s — cancel
        if (timer) { clearTimeout(timer); timer = null; }
      }
    }, { threshold: 0.3 });
    obs.observe(el);
    return () => { obs.disconnect(); if (timer) clearTimeout(timer); };
  }, [provider, slug, isPreview]);

  async function revealContacts() {
    if (revealed || revealing || !provider) return;
    setRevealing(true);
    try {
      const res = await fetch(`${API}/public/providers/${slug}/reveal-contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_page: 'profile',
          selected_date: selectedCalDate ?? undefined,
          viewer_session_id: getSessionId(),
        }),
      });
      const data = await res.json() as { ok: boolean; links?: Link[] };
      if (data.ok) {
        setRevealLinks(data.links ?? []);
        setRevealed(true);
        setTimeout(() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
      }
    } catch { /* ignore */ }
    setRevealing(false);
  }

  function calPrev() {
    setSelectedCalDate(null);
    setSelectedDayEntries([]);
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12); }
    else setCalMonth(m => m - 1);
  }
  function calNext() {
    setSelectedCalDate(null);
    setSelectedDayEntries([]);
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1); }
    else setCalMonth(m => m + 1);
  }

  const calFirstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const calPad = (calFirstDow + 6) % 7;
  const calCells: (DayInfo | null)[] = [...Array(calPad).fill(null), ...calDays];
  while (calCells.length % 7 !== 0) calCells.push(null);
  const calTodayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const selectedDayInfo = calDays.find(d => d.date === selectedCalDate);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--ink-3)' }}>Загрузка...</p>
    </div>
  );

  if (notFound || !provider) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <h2 style={{ margin: 0, fontSize: 22 }}>Профиль не найден</h2>
      <p style={{ color: 'var(--ink-3)', margin: 0 }}>Возможно, он скрыт или не существует.</p>
      <a href="/search" className="btn btn-primary" style={{ marginTop: 8 }}>Найти исполнителей</a>
    </div>
  );

  const cover      = photos.find(p => p.is_cover) ?? photos[0];
  const initial    = provider.display_name[0]?.toUpperCase() ?? '?';
  const bgGradient = nameToGradient(provider.display_name);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {isPreview && (
        <div style={{ background: 'var(--amber)', color: '#fff', textAlign: 'center', padding: '10px 16px', fontSize: 14, fontWeight: 500 }}>
          👁 Предпросмотр — профиль скрыт от публики.{' '}
          <a href="/dashboard/provider" style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline' }}>Изменить статус</a>
        </div>
      )}

      <nav className="nav-frosted">
        <button onClick={() => window.history.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, fontWeight: 600, color: 'var(--ink-2)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>← Назад</button>
        <a href="/" className="logo-mark" style={{ fontSize: 16 }}>
          <OctiMark size={26} />
          <span className="hide-mobile">Octiqa</span>
        </a>
      </nav>

      {/* ── Hero cover ─────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 300, overflow: 'hidden' }}>

        {/* Layer 1 — background: blurred photo OR gradient */}
        {cover ? (
          <div style={{
            position: 'absolute', inset: '-30px',
            backgroundImage: `url(${cover.url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(28px)',
            transform: 'scale(1.15)',
          }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: bgGradient }} />
        )}

        {/* Layer 2 — dark gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,.68) 0%, rgba(0,0,0,.18) 55%, transparent 100%)' }} />

        {/* Layer 3 — avatar + name */}
        <style>{`@media(max-width:400px){.hero-info-row{flex-wrap:wrap;}.hero-cta-btn{margin-left:0;margin-top:8px;}}`}</style>
        <div className="hero-info-row" style={{ position: 'absolute', bottom: 24, left: 24, right: 24, display: 'flex', alignItems: 'flex-end', gap: 16 }}>

          {/* Avatar */}
          {cover ? (
            <img
              src={cover.url}
              alt={provider.display_name}
              style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,.35)', flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,.4)' }}
            />
          ) : (
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,.18)', border: '3px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 30, fontWeight: 800, color: '#fff', backdropFilter: 'blur(6px)', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
              {initial}
            </div>
          )}

          {/* Name & location */}
          <div style={{ paddingBottom: 4, flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', textShadow: '0 2px 8px rgba(0,0,0,.4)' }}>{provider.display_name}</h1>
              {provider.is_verified && (
                <span style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700, backdropFilter: 'blur(4px)' }}>✓ Верификация</span>
              )}
            </div>
            {(provider.city ?? provider.region) && (
              <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,.82)', fontSize: 14, textShadow: '0 1px 4px rgba(0,0,0,.4)' }}>
                📍 {[provider.city, provider.region].filter(Boolean).join(', ')}
              </p>
            )}
          </div>

          {/* Hero contact CTA */}
          {!isPreview && (
            <div className="hero-cta-btn" style={{ paddingBottom: 4, flexShrink: 0 }}>
              {!revealed ? (
                <button
                  onClick={() => void revealContacts()}
                  disabled={revealing}
                  style={{ background: 'rgba(255,255,255,.95)', color: '#4f46e5', border: 'none', borderRadius: 24, padding: '10px 14px', minHeight: 44, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(6px)', boxShadow: '0 2px 12px rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}
                >
                  {revealing ? '...' : '📲 Контакты'}
                </button>
              ) : (
                <button
                  onClick={() => contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}
                  style={{ background: 'rgba(255,255,255,.95)', color: '#16a34a', border: 'none', borderRadius: 24, padding: '10px 14px', minHeight: 44, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(6px)', boxShadow: '0 2px 12px rgba(0,0,0,.25)', whiteSpace: 'nowrap' }}
                >
                  ✓ Контакты ↓
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '20px 16px 48px' }}>

        {provider.bio && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <p style={{ margin: 0, color: 'var(--ink-2)', lineHeight: 1.65, fontSize: 15 }}>{provider.bio}</p>
          </div>
        )}

        {services.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 16px', fontSize: 17, fontWeight: 700 }}>Услуги</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {services.map(sv => (
                <div key={sv.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>{sv.category}</span>
                  <h3 style={{ margin: '4px 0 6px', fontSize: 14, fontWeight: 700 }}>{sv.title}</h3>
                  {sv.description && <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>{sv.description}</p>}
                  {sv.price_from && (
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>
                      от {sv.price_from}{sv.price_to ? ` — ${sv.price_to}` : ''} {sv.currency}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {relatedProfiles.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 800 }}>Другие направления</h2>
            <div style={{ display: 'grid', gap: 10 }}>
              {relatedProfiles.map(profile => {
                const category = [profile.primary_category, profile.primary_subcategory].filter(Boolean).join(' · ');
                return (
                  <a
                    key={profile.id}
                    href={`/p/${profile.slug}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: 12,
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      textDecoration: 'none',
                      color: 'var(--ink)',
                    }}
                  >
                    <div style={{
                      width: 42,
                      height: 42,
                      borderRadius: 8,
                      background: nameToGradient(profile.display_name),
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      flexShrink: 0,
                    }}>
                      {profile.display_name[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>{profile.display_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                        {[category, profile.city].filter(Boolean).join(' · ') || 'Профиль'}
                      </div>
                    </div>
                    <span style={{ color: 'var(--ink-4)', fontSize: 18 }}>›</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {photos.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 17, fontWeight: 700 }}>Фото</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
              {photos.map((ph, i) => (
                <button
                  key={ph.id}
                  onClick={() => setLightboxIdx(i)}
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'zoom-in', borderRadius: 8, overflow: 'hidden', display: 'block' }}
                >
                  <img src={ph.url} alt={provider.display_name} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block', transition: 'transform .2s' }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Lightbox ─────────────────────────────────────────── */}
        {lightboxIdx !== null && (
          <LightboxOverlay
            photos={photos}
            idx={lightboxIdx}
            name={provider.display_name}
            onClose={() => setLightboxIdx(null)}
            onPrev={() => setLightboxIdx(i => i !== null ? (i - 1 + photos.length) % photos.length : null)}
            onNext={() => setLightboxIdx(i => i !== null ? (i + 1) % photos.length : null)}
          />
        )}

        {/* Calendar */}
        <div ref={calendarTrackRef} className="card" style={{ padding: 20, marginBottom: 16 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Занятость</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={calPrev} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
              <span style={{ fontSize: 15, fontWeight: 700, minWidth: 130, textAlign: 'center' }}>{MONTHS_RU[calMonth - 1]} {calYear}</span>
              <button onClick={calNext} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
            </div>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {DAYS_SHORT.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', padding: '2px 0', textTransform: 'uppercase', letterSpacing: '.04em' }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calCells.map((cell, i) => {
              if (!cell) return <div key={`ep-${i}`} style={{ minHeight: 48 }} />;
              const st     = CAL_ST[cell.status] ?? CAL_ST.free!;
              const isToday = cell.date === calTodayStr;
              const isSel   = cell.date === selectedCalDate;
              return (
                <button
                  key={cell.date}
                  onClick={() => {
                    setSelectedDayEntries([]);
                    setSelectedCalDate(isSel ? null : cell.date);
                  }}
                  style={{
                    minHeight: 48,
                    border: `1.5px solid ${isSel ? '#6d28d9' : isToday ? '#6d28d9' : st.border}`,
                    borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                    background: isSel ? '#ede9fe' : st.bg,
                    color: isSel ? '#6d28d9' : st.color,
                    fontWeight: isToday ? 800 : 500,
                    fontSize: 14,
                    boxShadow: isSel ? '0 0 0 3px rgba(109,40,217,.18)' : undefined,
                    transition: 'transform .1s',
                  }}
                >
                  {parseInt(cell.date.slice(8), 10)}
                  {cell.count > 0 && <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSel ? '#6d28d9' : st.color, display: 'inline-block', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>

          {/* Selected day info */}
          {selectedCalDate && selectedDayInfo && false && (
            <div style={{ display: 'none' }}>
              {selectedDayInfo ? (
                <>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: CAL_ST[selectedDayInfo!.status]?.color ?? 'var(--ink-3)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                    {new Date(selectedCalDate + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                  </span>
                  <span style={{ color: CAL_ST[selectedDayInfo!.status]?.color ?? 'var(--ink-3)', fontWeight: 700, fontSize: 13 }}>
                    — {CAL_ST[selectedDayInfo!.status]?.label ?? selectedDayInfo!.status}
                  </span>
                </>
              ) : (
                <span style={{ color: 'var(--ink-3)' }}>Нет данных на эту дату</span>
              )}
            </div>
          )}

          {selectedCalDate && selectedDayInfo && (
            <DayTimeline
              date={selectedCalDate}
              dayInfo={selectedDayInfo}
              entries={selectedDayEntries}
              loading={selectedDayLoading}
            />
          )}

          {/* Legend */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            {Object.entries(CAL_ST).filter(([k]) => k !== 'past').map(([key, val]) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--ink-3)', fontWeight: 500 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: val.color, display: 'inline-block', flexShrink: 0 }} />
                {val.label}
              </span>
            ))}
          </div>
        </div>

        {/* ── Contact Reveal ─────────────────────────────────── */}
        <div ref={contactRef}>
          {!revealed ? (
            /* ── Reveal gate ── */
            <div className="card" style={{ padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--brand-xlight)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--brand)' }}>
                <FaComments size={26} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 800 }}>Связаться с исполнителем</h2>
              <p style={{ margin: '0 0 10px', fontSize: 14, color: 'var(--ink-3)', lineHeight: 1.55 }}>
                WhatsApp, Telegram, Instagram — откроются после нажатия
              </p>
              {selectedCalDate ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 4, padding: '5px 12px', background: 'var(--brand-xlight)', borderRadius: 20, fontSize: 13, color: 'var(--brand)', fontWeight: 600 }}>
                  📅 {new Date(selectedCalDate + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                </div>
              ) : (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 4, padding: '4px 12px', background: 'var(--surface-2)', borderRadius: 20, fontSize: 12, color: 'var(--ink-4)' }}>
                  💡 Выберите дату в календаре выше, чтобы указать её в запросе
                </div>
              )}
              <div style={{ height: 20 }} />
              <button
                onClick={() => void revealContacts()}
                disabled={revealing}
                className="btn btn-brand btn-lg btn-full"
                style={{ maxWidth: 340, margin: '0 auto', fontSize: 16 }}
              >
                {revealing
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />Загрузка...</span>
                  : '📲 Показать контакты'
                }
              </button>
            </div>
          ) : (
            /* ── Contact card ── */
            <div className="card anim-fadeUp" style={{ padding: '22px 20px 24px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, flex: 1 }}>Контакты</h2>
                <span style={{ fontSize: 11, background: 'var(--green-bg)', color: 'var(--green-text)', padding: '3px 10px', borderRadius: 20, fontWeight: 700, letterSpacing: '.03em' }}>● Открыто</span>
              </div>

              {revealLinks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0 8px' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🤷</div>
                  <p style={{ margin: 0, color: 'var(--ink-3)', fontSize: 14 }}>Исполнитель пока не добавил контакты</p>
                </div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 210px), 1fr))',
                  gap: 10,
                }}>
                  {revealLinks.map((lk, i) => {
                    const cfg = LINK_CFG[lk.link_type] ?? LINK_CFG['other']!;
                    const isLight = cfg.bg.startsWith('var(--surface');
                    const { Icon } = cfg;
                    return (
                      <a
                        key={lk.id}
                        href={lk.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 14,
                          padding: '15px 18px',
                          minHeight: 62,
                          borderRadius: 'var(--r-lg)',
                          background: cfg.bg,
                          border: isLight ? '1.5px solid var(--border)' : 'none',
                          textDecoration: 'none',
                          color: cfg.text,
                          fontWeight: 700,
                          fontSize: 15,
                          transition: 'opacity .15s, transform .15s',
                          animation: `fadeUp .3s ${i * 60}ms both`,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '.85'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
                      >
                        <Icon size={22} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{lk.label ?? cfg.label}</span>
                        <span style={{ fontSize: 16, opacity: .6, flexShrink: 0 }}>→</span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Owner name (optional, set by specialist in settings) */}
        {provider.owner_name && (
          <div style={{ textAlign: 'center', paddingBottom: 8, paddingTop: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-4)', letterSpacing: '.01em' }}>
              Владелец: {provider.owner_name}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}

function DayTimeline({
  date,
  dayInfo,
  entries,
  loading,
}: {
  date: string;
  dayInfo: DayInfo;
  entries: PublicCalendarEntry[];
  loading: boolean;
}) {
  const allDayEntries = entries.filter(entry => isAllDayEntry(entry, date));
  const segments = buildTimelineSegments(entries, date);
  const dateLabel = new Date(date + 'T12:00:00Z').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  const dayStatus = CAL_ST[dayInfo.status] ?? CAL_ST.free!;

  if (loading && entries.length === 0) {
    return (
      <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: dayStatus.color, flexShrink: 0 }} />
          <span style={{ color: 'var(--ink)', fontWeight: 800, fontSize: 14 }}>{dateLabel}</span>
          <span style={{ color: dayStatus.color, fontWeight: 800, fontSize: 13 }}>{dayStatus.label}</span>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)', color: 'var(--ink-3)', fontSize: 13, fontWeight: 700 }}>
          Загружаем занятость на день...
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 10, padding: 12, border: '1px solid var(--border)', borderRadius: 10, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: dayStatus.color, flexShrink: 0 }} />
        <span style={{ color: 'var(--ink)', fontWeight: 800, fontSize: 14 }}>{dateLabel}</span>
        <span style={{ color: dayStatus.color, fontWeight: 800, fontSize: 13 }}>{dayStatus.label}</span>
        {loading && <span style={{ color: 'var(--ink-4)', fontSize: 12 }}>Обновление...</span>}
      </div>

      {allDayEntries.map(entry => {
        const st = TIMELINE_ST[entry.status] ?? TIMELINE_ST.busy!;
        return (
          <div key={entry.id} style={{ padding: '10px 12px', marginBottom: 10, borderRadius: 8, border: `1px solid ${st.border}`, background: st.bg, color: st.color, fontWeight: 800, fontSize: 13 }}>
            Весь день: {st.label}
          </div>
        );
      })}

      {allDayEntries.length === 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', color: 'var(--ink-4)', fontSize: 11, fontWeight: 700, margin: '0 0 6px 58px' }}>
            {['00', '06', '12', '18', '24'].map(h => <span key={h}>{h}:00</span>)}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {segments.map(segment => {
              const st = TIMELINE_ST[segment.status] ?? TIMELINE_ST.free!;
              const isFree = segment.status === 'free';
              return (
                <div key={segment.key} style={{ display: 'grid', gridTemplateColumns: '50px 1fr', gap: 8, alignItems: 'stretch' }}>
                  <div style={{ color: 'var(--ink-3)', fontSize: 12, fontWeight: 800, lineHeight: '18px', paddingTop: 4 }}>
                    {formatMinutes(segment.fromMin)}
                  </div>
                  <div style={{
                    minHeight: isFree ? 30 : 42,
                    borderRadius: 8,
                    border: `1px solid ${st.border}`,
                    background: isFree ? 'linear-gradient(90deg,#f8fafc,#f0fdf4)' : st.bg,
                    color: st.color,
                    padding: '7px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    fontSize: 13,
                    fontWeight: isFree ? 700 : 800,
                  }}>
                    <span>{st.label}</span>
                    <span style={{ color: isFree ? 'var(--ink-3)' : st.color, fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {formatMinutes(segment.fromMin)}-{formatMinutes(segment.toMin)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function LightboxOverlay({
  photos, idx, name, onClose, onPrev, onNext,
}: {
  photos: { id: string; url: string }[];
  idx: number;
  name: string;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const photo = photos[idx];
  if (!photo) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn .15s ease',
      }}
    >
      {/* Prev */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onPrev(); }}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >‹</button>
      )}

      {/* Image */}
      <img
        src={photo.url}
        alt={name}
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 10, boxShadow: '0 8px 48px rgba(0,0,0,.6)' }}
      />

      {/* Next */}
      {photos.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); onNext(); }}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >›</button>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,.12)', border: 'none', color: '#fff', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >✕</button>

      {/* Counter */}
      {photos.length > 1 && (
        <div style={{ position: 'absolute', bottom: 18, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,.5)', color: '#fff', padding: '4px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
          {idx + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
