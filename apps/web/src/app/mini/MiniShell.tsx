'use client';

import { useState }                    from 'react';
import { useSearchParams }              from 'next/navigation';

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
import { MiniOnboardingGate }           from './overlays/MiniOnboardingGate';

export default function MiniShell() {
  // useSearchParams must be called here (inside the Suspense boundary in page.tsx)
  const params  = useSearchParams();
  const tgFlow  = params.get('tg_flow');

  // ── Overlay state (UI-only, not owned by the hook) ──────
  const [showAdd,          setShowAdd]          = useState(false);
  const [showSwitch,       setShowSwitch]       = useState(false);
  const [calendarNewEntry, setCalendarNewEntry] = useState(false);

  // ── Core state + init ────────────────────────────────────
  const {
    phase, setPhase,
    tab, handleTab,
    tgUser,
    providers, activeIdx, setActiveIdx, activeProvider,
    updateActiveProvider, canManageProfiles, maxProfiles, createProfile, archiveProfile,
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

  if (phase === 'onboarding') {
    return (
      <MiniOnboardingGate
        tgUser={tgUser}
        onContinue={() => setPhase('shell')}
      />
    );
  }

  // ── Shell ────────────────────────────────────────────────
  return (
    <>
      <MiniStyles />
      <div className="mini-root">

        <MiniTopBar
          provider={activeProvider}
          providers={providers}
          onToggleSwitch={() => setShowSwitch(s => !s)}
        />

        <main className="mini-content mini-fadein" key={tab}>
          {tab === 'profiles'  && (
            <MiniProfilesScreen
              providers={providers}
              activeIdx={activeIdx}
              canManageProfiles={canManageProfiles}
              maxProfiles={maxProfiles}
              onSwitchProfile={setActiveIdx}
              onCreateProfile={createProfile}
              onArchiveProfile={archiveProfile}
              onProviderUpdated={updateActiveProvider}
            />
          )}
          {tab === 'calendar'  && <MiniCalendarScreen   provider={activeProvider} openNewEntry={calendarNewEntry} onNewEntryHandled={() => setCalendarNewEntry(false)} />}
          {tab === 'analytics' && <MiniAnalyticsScreen  summary={summary} loading={sumLoading} onRetry={loadAnalytics} />}
          {tab === 'more'      && <MiniMoreScreen        tgUser={tgUser} />}
        </main>

        <MiniBottomNav
          tab={tab}
          onTab={onTab}
          onAdd={() => setShowAdd(true)}
        />

        {showAdd && (
          <MiniAddSheet
            hasProfile={!!activeProvider}
            onClose={() => setShowAdd(false)}
            onNewCalendarEntry={() => {
              setShowAdd(false);
              handleTab('calendar');
              setCalendarNewEntry(true);
            }}
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
