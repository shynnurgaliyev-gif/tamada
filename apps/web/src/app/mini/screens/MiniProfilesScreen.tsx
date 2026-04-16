'use client';

import { useEffect, useState } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';
import { useProviderData } from '../hooks/useProviderData';
import { EmptyState } from '../components/EmptyState';
import { ProfileView } from './profile/ProfileView';
import { ProfileEditView } from './profile/ProfileEditView';
import { ProfilePhotosView } from './profile/ProfilePhotosView';
import { ProfileLinksView } from './profile/ProfileLinksView';
import type { Provider } from '../types';
import type { CreateProfileInput } from '../hooks/useMiniApp';

type SubView = 'main' | 'edit' | 'photos' | 'links' | 'create';

const SUB_TITLES: Record<SubView, string> = {
  main: '',
  edit: 'Редактировать профиль',
  photos: 'Фотографии',
  links: 'Ссылки и контакты',
  create: 'Новый профиль',
};

export function MiniProfilesScreen({
  providers,
  activeIdx,
  canManageProfiles,
  maxProfiles,
  onSwitchProfile,
  onCreateProfile,
  onArchiveProfile,
  onProviderUpdated,
}: {
  providers: Provider[];
  activeIdx: number;
  canManageProfiles: boolean;
  maxProfiles: number;
  onSwitchProfile: (idx: number) => void;
  onCreateProfile: (input: CreateProfileInput) => Promise<Provider | null>;
  onArchiveProfile: (providerId: string) => Promise<boolean>;
  onProviderUpdated: (updated: Provider) => void;
}) {
  const provider = providers[activeIdx] ?? null;
  const [subView, setSubView] = useState<SubView>('main');
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const activeProfiles = providers.filter(p => !p.archived_at && !p.pending_delete_at);
  const archivedProfiles = providers.filter(p => p.archived_at || p.pending_delete_at);
  const canCreate = canManageProfiles && activeProfiles.length < maxProfiles;

  const {
    photos, links, loading, saving, error, reload,
    updateBasic, uploadPhoto, deletePhoto, addLink, deleteLink,
  } = useProviderData(provider && !provider.archived_at ? provider.id : null);

  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;

    if (subView !== 'main') {
      tg.BackButton.show();
      const handler = () => setSubView('main');
      tg.BackButton.onClick(handler);
      return () => { tg.BackButton.offClick(handler); tg.BackButton.hide(); };
    }
    tg.BackButton.hide();
  }, [subView]);

  if (!provider && providers.length === 0) {
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

  const subHeader = subView !== 'main' ? (
    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,.07)' }}>
      {SUB_TITLES[subView]}
    </div>
  ) : null;

  const errorBanner = error ? (
    <div style={{ padding: '10px 14px', marginBottom: 12, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      {error}
      <button className="mini-tap" onClick={reload} style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer' }}>
        Повторить
      </button>
    </div>
  ) : null;

  async function archiveProvider(id: string) {
    if (!canManageProfiles || archivingId) return;
    setArchivingId(id);
    try {
      const ok = await onArchiveProfile(id);
      if (ok) setSubView('main');
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div>
      {subHeader}
      {errorBanner}

      {subView === 'main' && (
        <>
          <ProfilesOverview
            providers={providers}
            activeIdx={activeIdx}
            activeProfiles={activeProfiles}
            archivedProfiles={archivedProfiles}
            archiveOpen={archiveOpen}
            canManageProfiles={canManageProfiles}
            canCreate={canCreate}
            maxProfiles={maxProfiles}
            archivingId={archivingId}
            onToggleArchive={() => setArchiveOpen(v => !v)}
            onSwitch={onSwitchProfile}
            onCreate={() => setSubView('create')}
            onArchive={archiveProvider}
          />

          {provider && !provider.archived_at && !provider.pending_delete_at && (
            <ProfileView
              provider={provider}
              photos={photos}
              links={links}
              loading={loading}
              canManage={canManageProfiles}
              onEdit={() => setSubView('edit')}
              onPhotos={() => setSubView('photos')}
              onLinks={() => setSubView('links')}
            />
          )}
        </>
      )}

      {subView === 'create' && (
        <ProfileCreateView
          saving={saving}
          canCreate={canCreate}
          maxProfiles={maxProfiles}
          onCancel={() => setSubView('main')}
          onCreate={async input => {
            const created = await onCreateProfile(input);
            if (created) setSubView('main');
          }}
        />
      )}

      {subView === 'edit' && provider && (
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
        <ProfilePhotosView photos={photos} saving={saving} onUpload={uploadPhoto} onDelete={deletePhoto} />
      )}

      {subView === 'links' && (
        <ProfileLinksView links={links} saving={saving} onAdd={addLink} onDelete={deleteLink} />
      )}
    </div>
  );
}

function ProfilesOverview(props: {
  providers: Provider[];
  activeIdx: number;
  activeProfiles: Provider[];
  archivedProfiles: Provider[];
  archiveOpen: boolean;
  canManageProfiles: boolean;
  canCreate: boolean;
  maxProfiles: number;
  archivingId: string | null;
  onToggleArchive: () => void;
  onSwitch: (idx: number) => void;
  onCreate: () => void;
  onArchive: (id: string) => void;
}) {
  const indexById = new Map(props.providers.map((p, i) => [p.id, i]));

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Профили</div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 2 }}>
            {props.activeProfiles.length} из {props.maxProfiles} активных
          </div>
        </div>
        {props.canManageProfiles && (
          <button
            className="mini-btn mini-btn-primary mini-tap"
            onClick={props.onCreate}
            disabled={!props.canCreate}
            style={{ width: 'auto', padding: '9px 12px', fontSize: 13, opacity: props.canCreate ? 1 : .55 }}
          >
            + Новый
          </button>
        )}
      </div>

      {!props.canCreate && props.canManageProfiles && (
        <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(245,158,11,.1)', color: '#92400e', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
          Лимит: до {props.maxProfiles} профилей на аккаунт.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {props.activeProfiles.map(p => (
          <ProfileListCard
            key={p.id}
            provider={p}
            isActive={indexById.get(p.id) === props.activeIdx}
            canManage={props.canManageProfiles}
            archiving={props.archivingId === p.id}
            onSwitch={() => props.onSwitch(indexById.get(p.id) ?? 0)}
            onArchive={() => props.onArchive(p.id)}
          />
        ))}
      </div>

      {props.archivedProfiles.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <button className="mini-tap" onClick={props.onToggleArchive} style={{ width: '100%', border: 'none', background: 'rgba(0,0,0,.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: 'var(--tg-theme-text-color, #111827)' }}>
            Архив · {props.archivedProfiles.length} {props.archiveOpen ? '↑' : '↓'}
          </button>
          {props.archiveOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {props.archivedProfiles.map(p => (
                <ProfileListCard key={p.id} provider={p} isActive={false} canManage={false} archived archiving={false} onSwitch={() => undefined} onArchive={() => undefined} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileListCard({ provider, isActive, canManage, archived, archiving, onSwitch, onArchive }: {
  provider: Provider;
  isActive: boolean;
  canManage: boolean;
  archived?: boolean;
  archiving: boolean;
  onSwitch: () => void;
  onArchive: () => void;
}) {
  const category = [provider.primary_category, provider.primary_subcategory].filter(Boolean).join(' · ') || 'Категория не указана';
  const isVisible = provider.publication_status === 'visible' && provider.provider_status === 'active';

  return (
    <div className="mini-card" style={{ padding: 12, opacity: archived ? .72 : 1 }}>
      <button className="mini-tap" onClick={archived ? undefined : onSwitch} disabled={archived} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', width: '100%', border: 'none', background: 'transparent', padding: 0, textAlign: 'left', fontFamily: 'inherit' }}>
        <div className="mini-avatar-sm">{provider.display_name[0]?.toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>{provider.display_name}</span>
            {isActive && <Badge bg="rgba(124,58,237,.1)" color="#6d28d9">Active</Badge>}
            {archived && <Badge bg="rgba(107,114,128,.12)" color="#4b5563">Архив</Badge>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)', marginTop: 3 }}>{category}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 5, fontSize: 12, color: 'var(--tg-theme-hint-color, #6b7280)' }}>
            {provider.city && <span>📍 {provider.city}</span>}
            <span>{isVisible ? 'Виден клиентам' : 'Скрыт'}</span>
          </div>
        </div>
      </button>
      {canManage && !archived && (
        <button className="mini-tap" onClick={onArchive} disabled={archiving} style={{ marginTop: 10, border: '1px solid rgba(239,68,68,.18)', background: 'rgba(239,68,68,.06)', color: '#dc2626', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 800, width: '100%' }}>
          {archiving ? '...' : 'Архивировать профиль'}
        </button>
      )}
    </div>
  );
}

function Badge({ bg, color, children }: { bg: string; color: string; children: string }) {
  return <span style={{ background: bg, color, borderRadius: 8, padding: '2px 7px', fontSize: 11, fontWeight: 900 }}>{children}</span>;
}

function ProfileCreateView({ saving, canCreate, maxProfiles, onCancel, onCreate }: {
  saving: boolean;
  canCreate: boolean;
  maxProfiles: number;
  onCancel: () => void;
  onCreate: (input: CreateProfileInput) => Promise<void>;
}) {
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [city, setCity] = useState('');

  async function submit() {
    if (!displayName.trim() || !category.trim() || !canCreate || saving) return;
    await onCreate({ display_name: displayName, category, subcategory, city });
  }

  return (
    <div>
      {!canCreate && (
        <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,.1)', color: '#92400e', borderRadius: 12, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          Лимит: до {maxProfiles} профилей на аккаунт.
        </div>
      )}
      <div className="mini-field">
        <label>Название</label>
        <input className="mini-input" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Например: Айдана Той" />
      </div>
      <div className="mini-field">
        <label>Категория</label>
        <input className="mini-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="Тамада" />
      </div>
      <div className="mini-field">
        <label>Подкатегория</label>
        <input className="mini-input" value={subcategory} onChange={e => setSubcategory(e.target.value)} placeholder="Ведущий, DJ..." />
      </div>
      <div className="mini-field">
        <label>Город</label>
        <input className="mini-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Алматы" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <button className="mini-btn mini-btn-outline mini-tap" onClick={onCancel}>Отмена</button>
        <button className="mini-btn mini-btn-primary mini-tap" onClick={() => void submit()} disabled={!displayName.trim() || !category.trim() || !canCreate || saving}>
          {saving ? '...' : 'Создать'}
        </button>
      </div>
    </div>
  );
}
