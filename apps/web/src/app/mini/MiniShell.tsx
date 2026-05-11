'use client';

import { useState, useEffect, useRef }  from 'react';
import { useSearchParams }              from 'next/navigation';

import { getTelegramWebApp }             from '@/lib/telegram';
import { useVisibleViewport }            from '@/lib/useVisibleViewport';
import { useMiniApp }                   from './hooks/useMiniApp';
import { MiniStyles }                   from './components/MiniStyles';
import { MiniTopBar }                   from './components/MiniTopBar';
import { MiniBottomNav }                from './components/MiniBottomNav';
import { MiniLoader }                   from './components/MiniLoader';
import { MiniProfilesScreen }           from './screens/MiniProfilesScreen';
import { MiniCalendarScreen }           from './screens/MiniCalendarScreen';
import { MiniAnalyticsScreen }          from './screens/MiniAnalyticsScreen';
import { MiniMoreScreen }               from './screens/MiniMoreScreen';
import { MiniAddSheet }                 from './overlays/MiniAddSheet';
import { MiniSwitchSheet }              from './overlays/MiniSwitchSheet';
import { MiniFirstProfileGate }         from './overlays/MiniFirstProfileGate';
import { MiniGuestGate }                from './overlays/MiniGuestGate';

export default function MiniShell() {
  // useSearchParams must be called here (inside the Suspense boundary in page.tsx)
  const params  = useSearchParams();
  const tgFlow  = params.get('tg_flow');

  // ── Theme detection (light / dark) ──────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (getTelegramWebApp()?.colorScheme as 'light' | 'dark') ?? 'light';
  });
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    const handler = () => setTheme((tg.colorScheme as 'light' | 'dark') ?? 'light');
    tg.onEvent('themeChanged', handler);
    return () => tg.offEvent('themeChanged', handler);
  }, []);

  // ── Fullscreen safe area (contentSafeAreaInset.top = Telegram header height)
  const [safeTop, setSafeTop] = useState(() => {
    const tg = getTelegramWebApp();
    return (tg?.contentSafeAreaInset?.top ?? tg?.safeAreaInset?.top ?? 0) + 12;
  });
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    tg.requestFullscreen?.();
    const update = () => setSafeTop(
      (tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0) + 12
    );
    tg.onEvent('safeAreaChanged', update);
    tg.onEvent('contentSafeAreaChanged', update);
    return () => {
      tg.offEvent('safeAreaChanged', update);
      tg.offEvent('contentSafeAreaChanged', update);
    };
  }, []);

  // Hide bottom nav + scroll focused input when keyboard opens
  const { height: vpHeight, offsetTop: vpTop } = useVisibleViewport();
  const vpRef = useRef({ height: vpHeight, top: vpTop });
  vpRef.current = { height: vpHeight, top: vpTop };
  // Full height captured before any keyboard event — used to detect kb open via delta.
  const initHRef = useRef<number | null>(null);
  if (initHRef.current === null) initHRef.current = vpHeight;

  const [keyboardOpen, setKeyboardOpen] = useState(false);

  function scrollFocused() {
    const el = document.activeElement as HTMLElement | null;
    if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
    const container = el.closest('.mini-content') as HTMLElement | null;
    if (!container) return;
    const elRect = el.getBoundingClientRect();
    const { height, top } = vpRef.current;
    const visibleBottom = top + height;
    // Center the input in the visible content area (below topbar ~56px, above keyboard)
    const visibleCenter = top + 56 + (height - 56) * 0.5;
    const elCenter = (elRect.top + elRect.bottom) / 2;
    if (elRect.bottom > visibleBottom - 20) {
      container.scrollTop += elCenter - visibleCenter;
    }
  }

  // viewport height delta = keyboard opens or closes
  useEffect(() => {
    const initH = initHRef.current;
    if (initH === null) return;
    const kbOpen = initH - vpHeight > 150;
    setKeyboardOpen(kbOpen);
    if (kbOpen) {
      const t = setTimeout(scrollFocused, 100); // wait for React re-render + keyboard anim
      return () => clearTimeout(t);
    }
  }, [vpHeight]);

  // focusin = user taps another field while keyboard is already open
  useEffect(() => {
    const onFocusIn = () => {
      const initH = initHRef.current;
      if (initH !== null && initH - vpRef.current.height > 150) {
        setTimeout(scrollFocused, 50);
      }
    };
    document.addEventListener('focusin', onFocusIn);
    return () => document.removeEventListener('focusin', onFocusIn);
  }, []);

  // ── Overlay state (UI-only, not owned by the hook) ──────
  const [showAdd,              setShowAdd]              = useState(false);
  const [showSwitch,           setShowSwitch]           = useState(false);
  const [calendarNewEntry,     setCalendarNewEntry]     = useState(false);
  const [openPhotosOnLoad,     setOpenPhotosOnLoad]     = useState(false);
  const [showFirstProfileGate, setShowFirstProfileGate] = useState(false);

  // ── Core state + init ────────────────────────────────────
  const {
    phase, setPhase,
    tab, handleTab,
    tgUser, miniAuthError, permissions, createGuestAccount,
    providers, activeIdx, setActiveIdx, activeProvider,
    updateActiveProvider, refreshProviders, canManageProfiles, maxProfiles, createProfile, unarchiveProfile,
    accountFullName,
    subStatus, subDaysLeft,
    summary, sumLoading, analyticsDays, switchAnalyticsPeriod,
  } = useMiniApp(tgFlow);

  // ── Tab handler also closes overlays ────────────────────
  function onTab(next: Parameters<typeof handleTab>[0]) {
    setShowAdd(false);
    setShowSwitch(false);
    handleTab(next);
  }

  // ── Phases ───────────────────────────────────────────────
  if (phase === 'loading') return <MiniLoader />;

  if (phase === 'guest') {
    return (
      <>
        <MiniStyles />
        <div style={{ paddingTop: safeTop }}>
          <MiniGuestGate
            tgUser={tgUser}
            authError={miniAuthError}
            onCreateAccount={createGuestAccount}
          />
        </div>
      </>
    );
  }

  if (phase === 'onboarding') {
    return (
      <>
        <MiniStyles />
        <div style={{ paddingTop: safeTop }}>
          <MiniFirstProfileGate
            tgUser={tgUser}
            createProfile={createProfile}
            onSkip={() => setPhase('shell')}
            onDone={(_, action) => {
              setPhase('shell');
              if (action === 'calendar') {
                handleTab('calendar');
              } else if (action === 'photos') {
                setOpenPhotosOnLoad(true);
                handleTab('profiles');
              }
            }}
          />
        </div>
      </>
    );
  }

  // ── First-profile gate (in-shell, any entry point) ──────
  const noActiveProfiles = providers.filter(p => !p.archived_at && !p.pending_delete_at).length === 0;
  const firstProfileProps = noActiveProfiles
    ? { onCreateFirstProfile: () => setShowFirstProfileGate(true) }
    : {};

  if (showFirstProfileGate) {
    return (
      <>
        <MiniStyles />
        <div style={{ paddingTop: safeTop }}>
          <MiniFirstProfileGate
            tgUser={tgUser}
            createProfile={createProfile}
            onSkip={() => setShowFirstProfileGate(false)}
            onDone={(_, action) => {
              setShowFirstProfileGate(false);
              if (action === 'calendar') {
                handleTab('calendar');
              } else if (action === 'photos') {
                setOpenPhotosOnLoad(true);
                handleTab('profiles');
              }
            }}
          />
        </div>
      </>
    );
  }

  // ── Shell ────────────────────────────────────────────────
  return (
    <>
      <MiniStyles />
      <div className={keyboardOpen ? 'mini-root keyboard-open' : 'mini-root'} data-theme={theme} style={{ paddingTop: safeTop }}>

        <MiniTopBar
          provider={activeProvider}
          providers={providers}
          ownerName={accountFullName ?? (tgUser ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || null : null)}
          subStatus={subStatus}
          subDaysLeft={subDaysLeft}
          onToggleSwitch={() => setShowSwitch(s => !s)}
          {...firstProfileProps}
        />

        <main className="mini-content mini-fadein" key={tab}>
          {tab === 'profiles'  && (
            <MiniProfilesScreen
              providers={providers}
              activeIdx={activeIdx}
              canManageProfiles={canManageProfiles}
              permissions={permissions}
              maxProfiles={maxProfiles}
              onSwitchProfile={setActiveIdx}
              onCreateProfile={createProfile}
              onUnarchiveProfile={unarchiveProfile}
              onProviderUpdated={updateActiveProvider}
              openPhotosOnLoad={openPhotosOnLoad}
              onPhotosOpened={() => setOpenPhotosOnLoad(false)}
              {...firstProfileProps}
            />
          )}
          {tab === 'calendar'  && permissions.can_manage_calendar && <MiniCalendarScreen   provider={activeProvider} openNewEntry={calendarNewEntry} onNewEntryHandled={() => setCalendarNewEntry(false)} {...firstProfileProps} />}
          {tab === 'analytics' && permissions.can_view_analytics && <MiniAnalyticsScreen summary={summary} loading={sumLoading} days={analyticsDays} onSwitchPeriod={switchAnalyticsPeriod} />}
          {tab === 'more'      && <MiniMoreScreen        tgUser={tgUser} permissions={permissions} activeProvider={activeProvider} subStatus={subStatus} subDaysLeft={subDaysLeft} onProvidersChanged={refreshProviders} />}
        </main>

        <MiniBottomNav
          tab={tab}
          permissions={permissions}
          onTab={onTab}
          onAdd={() => setShowAdd(true)}
        />

        {showAdd && (
          <MiniAddSheet
            hasProfile={!!activeProvider}
            permissions={permissions}
            onClose={() => setShowAdd(false)}
            onNewCalendarEntry={() => {
              setShowAdd(false);
              handleTab('calendar');
              setCalendarNewEntry(true);
            }}
            {...firstProfileProps}
          />
        )}

        {showSwitch && providers.filter(p => !p.archived_at && !p.pending_delete_at).length > 1 && (
          <MiniSwitchSheet
            providers={providers}
            activeIdx={activeIdx}
            onSelect={i => { setActiveIdx(i); setShowSwitch(false); }}
            onClose={() => setShowSwitch(false)}
          />
        )}

      </div>
    </>
  );
}
