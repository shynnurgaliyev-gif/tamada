/* ── MiniProfilesScreen ────────────────────────────────────────────────────────
   Profiles tab. Manages sub-view routing (main → edit / photos / links) using
   Telegram BackButton. Data is loaded via useProviderData.
────────────────────────────────────────────────────────────────────────────── */

'use client';

import { useEffect, useState }         from 'react';
import { getTelegramWebApp }           from '@/lib/telegram';
import { useProviderData }             from '../hooks/useProviderData';
import { EmptyState }                  from '../components/EmptyState';
import { ProfileView }                 from './profile/ProfileView';
import { ProfileEditView }             from './profile/ProfileEditView';
import { ProfilePhotosView }           from './profile/ProfilePhotosView';
import { ProfileLinksView }            from './profile/ProfileLinksView';
import type { Provider }               from '../types';

type SubView = 'main' | 'edit' | 'photos' | 'links';

const SUB_TITLES: Record<SubView, string> = {
  main:   '',
  edit:   'Редактировать профиль',
  photos: 'Фотографии',
  links:  'Ссылки и контакты',
};

export function MiniProfilesScreen({
  providers,
  activeIdx,
  onProviderUpdated,
}: {
  providers:         Provider[];
  activeIdx:         number;
  onProviderUpdated: (updated: Provider) => void;
}) {
  const provider = providers[activeIdx] ?? null;
  const [subView, setSubView] = useState<SubView>('main');

  const {
    photos, links, loading, saving, error, reload,
    updateBasic, uploadPhoto, deletePhoto, addLink, deleteLink,
  } = useProviderData(provider?.id ?? null);

  /* ── Telegram BackButton ──────────────────────────────────────────────── */
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;

    if (subView !== 'main') {
      tg.BackButton.show();
      const handler = () => setSubView('main');
      tg.BackButton.onClick(handler);
      return () => { tg.BackButton.offClick(handler); tg.BackButton.hide(); };
    } else {
      tg.BackButton.hide();
    }
  }, [subView]);

  /* ── Empty state ──────────────────────────────────────────────────────── */
  if (!provider) {
    return (
      <EmptyState
        icon="👤"
        title="Профиль не создан"
        sub="Создайте профиль, чтобы клиенты нашли вас"
        href="/dashboard/onboarding"
        cta="Создать профиль"
      />
    );
  }

  /* ── Sub-view header (when not on main) ──────────────────────────────── */
  const subHeader = subView !== 'main' ? (
    <div style={{
      fontWeight: 800, fontSize: 17, marginBottom: 16,
      paddingBottom: 12,
      borderBottom: '1px solid rgba(0,0,0,.07)',
    }}>
      {SUB_TITLES[subView]}
    </div>
  ) : null;

  /* ── Error banner ─────────────────────────────────────────────────────── */
  const errorBanner = error ? (
    <div style={{
      padding: '10px 14px', marginBottom: 12,
      background: 'rgba(239,68,68,.08)',
      border: '1px solid rgba(239,68,68,.2)',
      borderRadius: 12,
      fontSize: 13, color: '#dc2626',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {error}
      <button
        className="mini-tap"
        onClick={reload}
        style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        Повторить
      </button>
    </div>
  ) : null;

  /* ── Views ────────────────────────────────────────────────────────────── */
  return (
    <div>
      {subHeader}
      {errorBanner}

      {subView === 'main' && (
        <ProfileView
          provider={provider}
          photos={photos}
          links={links}
          loading={loading}
          onEdit={()   => setSubView('edit')}
          onPhotos={() => setSubView('photos')}
          onLinks={()  => setSubView('links')}
        />
      )}

      {subView === 'edit' && (
        <ProfileEditView
          provider={provider}
          saving={saving}
          onSave={async fields => {
            const updated = await updateBasic(fields);
            if (updated) { onProviderUpdated(updated); setSubView('main'); }
          }}
        />
      )}

      {subView === 'photos' && (
        <ProfilePhotosView
          photos={photos}
          saving={saving}
          onUpload={uploadPhoto}
          onDelete={deletePhoto}
        />
      )}

      {subView === 'links' && (
        <ProfileLinksView
          links={links}
          saving={saving}
          onAdd={addLink}
          onDelete={deleteLink}
        />
      )}
    </div>
  );
}
