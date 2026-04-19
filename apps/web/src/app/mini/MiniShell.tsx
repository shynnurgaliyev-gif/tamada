'use client';

import { useState, useEffect }         from 'react';
import { useSearchParams }              from 'next/navigation';

import { getTelegramWebApp }             from '@/lib/telegram';
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
    return (tg?.contentSafeAreaInset?.top ?? tg?.safeAreaInset?.top ?? 0) + 8;
  });
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    tg.requestFullscreen?.();
    const update = () => setSafeTop(
      (tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0) + 8
    );
    tg.onEvent('safeAreaChanged', update);
    tg.onEvent('contentSafeAreaChanged', update);
    return () => {
      tg.offEvent('safeAreaChanged', update);
      tg.offEvent('contentSafeAreaChanged', update);
    };
  }, []);

  // Hide bottom nav + scroll focused input when keyboard opens
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const vp = window.visualViewport;
    if (!vp) return;
    const viewport = vp; // non-null reference for closures
    const initH = viewport.height; // full height captured before any keyboard event

    function scrollFocused() {
      const el = document.activeElement as HTMLElement | null;
      if (!el || (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA')) return;
      const container = el.closest('.mini-content') as HTMLElement | null;
      if (!container) return;
      const elRect = el.getBoundingClientRect();
      const visibleBottom = viewport.offsetTop + viewport.height;
      // Center the input in the visible content area (below topbar ~56px, above keyboard)
      const visibleCenter = viewport.offsetTop + 56 + (viewport.height - 56) * 0.5;
      const elCenter = (elRect.top + elRect.bottom) / 2;
      if (elRect.bottom > visibleBottom - 20) {
        container.scrollTop += elCenter - visibleCenter;
      }
    }

    // viewport resize = keyboard opens or closes
    const onResize = () => {
      const kbOpen = initH - viewport.height > 150;
      setKeyboardOpen(kbOpen);
      if (kbOpen) setTimeout(scrollFocused, 100); // wait for React re-render + keyboard anim
    };

    // focusin = user taps another field while keyboard is already open
    const onFocusIn = () => {
      if (initH - viewport.height > 150) setTimeout(scrollFocused, 50);
    };

    viewport.addEventListener('resize', onResize);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      viewport.removeEventListener('resize', onResize);
      document.removeEventListener('focusin', onFocusIn);
    };
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
    summary, sumLoading, loadAnalytics,
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
      <MiniGuestGate
        tgUser={tgUser}
        authError={miniAuthError}
        onCreateAccount={createGuestAccount}
      />
    );
  }

  if (phase === 'onboarding') {
    return (
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
    );
  }

  // ── First-profile gate (in-shell, any entry point) ──────
  const noActiveProfiles = providers.filter(p => !p.archived_at && !p.pending_delete_at).length === 0;
  const onCreateFirstProfile = noActiveProfiles
    ? () => setShowFirstProfileGate(true)
    : undefined;

  if (showFirstProfileGate) {
    return (
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
          onToggleSwitch={() => setShowSwitch(s => !s)}
          onCreateFirstProfile={onCreateFirstProfile}
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
              onCreateFirstProfile={onCreateFirstProfile}
            />
          )}
          {tab === 'calendar'  && permissions.can_manage_calendar && <MiniCalendarScreen   provider={activeProvider} openNewEntry={calendarNewEntry} onNewEntryHandled={() => setCalendarNewEntry(false)} onCreateFirstProfile={onCreateFirstProfile} />}
          {tab === 'analytics' && permissions.can_view_analytics && <MiniAnalyticsScreen  summary={summary} loading={sumLoading} onRetry={loadAnalytics} />}
          {tab === 'more'      && <MiniMoreScreen        tgUser={tgUser} permissions={permissions} activeProvider={activeProvider} onProvidersChanged={refreshProviders} />}
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
            onCreateFirstProfile={onCreateFirstProfile}
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
