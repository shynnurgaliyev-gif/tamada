'use client';

import { useEffect, useState } from 'react';
import { getTelegramWebApp } from '@/lib/telegram';
import { useProviderData } from '../hooks/useProviderData';
import { ProfileView } from './profile/ProfileView';
import { ProfileEditView } from './profile/ProfileEditView';
import { ProfilePhotosView } from './profile/ProfilePhotosView';
import { ProfileLinksView } from './profile/ProfileLinksView';
import { MiniPicker, SUBCATEGORIES } from '../overlays/MiniPicker';
import type { MiniPermissions, Provider } from '../types';
import type { CreateProfileInput } from '../hooks/useMiniApp';

type SubView = 'main' | 'detail' | 'edit' | 'photos' | 'links' | 'create';

const SUB_TITLES: Partial<Record<SubView, string>> = {
  photos: 'Фотографии',
  links:  'Ссылки и контакты',
};

export function MiniProfilesScreen({
  providers,
  activeIdx,
  canManageProfiles,
  permissions,
  maxProfiles,
  onSwitchProfile,
  onCreateProfile,
  onUnarchiveProfile,
  onProviderUpdated,
  openPhotosOnLoad,
  onPhotosOpened,
  onCreateFirstProfile,
}: {
  providers:           Provider[];
  activeIdx:           number;
  canManageProfiles:   boolean;
  permissions:         MiniPermissions;
  maxProfiles:         number;
  onSwitchProfile:     (idx: number) => void;
  onCreateProfile:     (input: CreateProfileInput) => Promise<Provider | null>;
  onUnarchiveProfile:  (providerId: string) => Promise<boolean>;
  onProviderUpdated:   (updated: Provider) => void;
  openPhotosOnLoad?:   boolean;
  onPhotosOpened?:     () => void;
  onCreateFirstProfile?: () => void;
}) {
  const provider = providers[activeIdx] ?? null;
  const [subView,     setSubView]     = useState<SubView>('main');
  const [archiveOpen, setArchiveOpen] = useState(false);

  const activeProfiles   = providers.filter(p => !p.archived_at && !p.pending_delete_at);
  const archivedProfiles = providers.filter(p => p.archived_at || p.pending_delete_at);
  const canCreate        = permissions.can_create_profile && activeProfiles.length < maxProfiles;

  const {
    photos, links, loading, saving, error, reload,
    updateBasic, uploadPhoto, deletePhoto, addLink, deleteLink, updateCategory,
  } = useProviderData(
    provider && !provider.archived_at && (permissions.can_edit_profile || permissions.can_manage_team)
      ? provider.id : null
  );

  // ── Telegram BackButton ─────────────────────────────────────────────────
  useEffect(() => {
    const tg = getTelegramWebApp();
    if (!tg) return;
    if (subView === 'main') { tg.BackButton.hide(); return; }

    // Back destination depends on current view
    const backTo: SubView = (subView === 'detail' || subView === 'create') ? 'main' : 'detail';
    const handler = () => setSubView(backTo);
    tg.BackButton.show();
    tg.BackButton.onClick(handler);
    return () => { tg.BackButton.offClick(handler); tg.BackButton.hide(); };
  }, [subView]);

  // ── Auto-open photos from first-profile success state ──────────────────
  useEffect(() => {
    if (openPhotosOnLoad && provider && !provider.archived_at && permissions.can_edit_profile) {
      setSubView('photos');
      onPhotosOpened?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPhotosOnLoad, provider?.id]);

  // ── Empty state ────────────────────────────────────────────────────────
  if (!provider && providers.length === 0) {
    if (permissions.can_create_profile) {
      return (
        <div style={{ textAlign: 'center', paddingTop: 56 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
          <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Профиль не создан</div>
          <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', marginBottom: 28, lineHeight: 1.5, padding: '0 20px' }}>
            Создайте первый профиль — клиенты со всего Казахстана смогут найти вас на сайте.
          </div>
          <button
            className="mini-btn mini-btn-primary mini-tap"
            onClick={onCreateFirstProfile}
            style={{ width: 'auto', padding: '13px 28px', display: 'inline-flex' }}
          >
            Создать первый профиль
          </button>
        </div>
      );
    }
    return (
      <div style={{ textAlign: 'center', paddingTop: 56 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👤</div>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 8 }}>Нет профилей</div>
        <div style={{ fontSize: 14, color: 'var(--tg-theme-hint-color, #6b7280)', lineHeight: 1.5 }}>
          Обратитесь к владельцу аккаунта.
        </div>
      </div>
    );
  }

  const title = SUB_TITLES[subView];
  const subHeader = title ? (
    <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid rgba(0,0,0,.07)' }}>
      {title}
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

  return (
    <div>
      {subHeader}
      {errorBanner}

      {/* ── Main: clean profile list ──────────────────────────── */}
      {subView === 'main' && (
        <ProfilesOverview
          providers={providers}
          activeIdx={activeIdx}
          activeProfiles={activeProfiles}
          archivedProfiles={archivedProfiles}
          archiveOpen={archiveOpen}
          canManageProfiles={canManageProfiles}
          canArchiveProfile={permissions.can_archive_profile}
          canCreate={canCreate}
          maxProfiles={maxProfiles}
          onToggleArchive={() => setArchiveOpen(v => !v)}
          onOpenProfile={(idx) => { onSwitchProfile(idx); setSubView('detail'); }}
          onCreate={activeProfiles.length === 0 && onCreateFirstProfile
            ? onCreateFirstProfile
            : () => setSubView('create')}
          onUnarchive={onUnarchiveProfile}
        />
      )}

      {/* ── Detail: compact profile + action rows ─────────────── */}
      {subView === 'detail' && provider && !provider.archived_at && !provider.pending_delete_at && (
        <ProfileView
          provider={provider}
          photos={photos}
          links={links}
          loading={loading}
          canEditProfile={permissions.can_edit_profile}
          onEdit={() => setSubView('edit')}
          onPhotos={() => setSubView('photos')}
          onLinks={() => setSubView('links')}
        />
      )}

      {/* ── Create ────────────────────────────────────────────── */}
      {subView === 'create' && permissions.can_create_profile && (
        <ProfileCreateView
          saving={saving}
          canCreate={canCreate}
          maxProfiles={maxProfiles}
          onCancel={() => setSubView('main')}
          onCreate={async input => {
            const created = await onCreateProfile(input);
            if (created) { setSubView('main'); }
          }}
        />
      )}

      {/* ── Edit ──────────────────────────────────────────────── */}
      {subView === 'edit' && provider && permissions.can_edit_profile && (
        <ProfileEditView
          provider={provider}
          saving={saving}
          onCancel={() => setSubView('detail')}
          onSave={async fields => {
            const updated = await updateBasic(fields);
            if (updated) { onProviderUpdated(updated); setSubView('detail'); }
          }}
          onUpdateCategory={updateCategory}
        />
      )}

      {/* ── Photos ────────────────────────────────────────────── */}
      {subView === 'photos' && permissions.can_edit_profile && (
        <ProfilePhotosView photos={photos} saving={saving} onUpload={uploadPhoto} onDelete={deletePhoto} />
      )}

      {/* ── Links ─────────────────────────────────────────────── */}
      {subView === 'links' && permissions.can_edit_profile && (
        <ProfileLinksView links={links} saving={saving} onAdd={addLink} onDelete={deleteLink} />
      )}
    </div>
  );
}

/* ── ProfilesOverview ──────────────────────────────────────────────────────── */

function ProfilesOverview(props: {
  providers:        Provider[];
  activeIdx:        number;
  activeProfiles:   Provider[];
  archivedProfiles: Provider[];
  archiveOpen:      boolean;
  canManageProfiles: boolean;
  canArchiveProfile: boolean;
  canCreate:        boolean;
  maxProfiles:      number;
  onToggleArchive:  () => void;
  onOpenProfile:    (idx: number) => void;
  onCreate:         () => void;
  onUnarchive:      (id: string) => Promise<boolean>;
}) {
  const [unarchivingId, setUnarchivingId] = useState<string | null>(null);
  const indexById = new Map(props.providers.map((p, i) => [p.id, i]));

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
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
            style={{ width: 'auto', padding: '9px 14px', fontSize: 13, opacity: props.canCreate ? 1 : .55 }}
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

      {/* Active profiles */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
        {props.activeProfiles.map(p => {
          const idx = indexById.get(p.id) ?? 0;
          return (
            <ProfileListCard
              key={p.id}
              provider={p}
              isActive={idx === props.activeIdx}
              onTap={() => props.onOpenProfile(idx)}
            />
          );
        })}
      </div>

      {/* Archived */}
      {props.archivedProfiles.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <button
            className="mini-tap"
            onClick={props.onToggleArchive}
            style={{ width: '100%', border: 'none', background: 'rgba(0,0,0,.04)', borderRadius: 10, padding: '10px 12px', textAlign: 'left', fontWeight: 800, color: 'var(--tg-theme-text-color, #111827)', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}
          >
            Архив · {props.archivedProfiles.length} {props.archiveOpen ? '↑' : '↓'}
          </button>
          {props.archiveOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              {props.archivedProfiles.map(p => (
                <div key={p.id}>
                  <ProfileListCard provider={p} isActive={false} archived onTap={() => undefined} />
                  {props.canArchiveProfile && (
                    <button
                      className="mini-tap"
                      onClick={async () => { setUnarchivingId(p.id); await props.onUnarchive(p.id); setUnarchivingId(null); }}
                      disabled={unarchivingId === p.id}
                      style={{ marginTop: 4, width: '100%', border: '1px solid rgba(34,197,94,.2)', background: 'rgba(34,197,94,.06)', color: '#166534', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 800, fontFamily: 'inherit', cursor: 'pointer' }}
                    >
                      {unarchivingId === p.id ? '...' : 'Восстановить профиль'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── ProfileListCard ───────────────────────────────────────────────────────── */

function ProfileListCard({ provider, isActive, archived, onTap }: {
  provider: Provider;
  isActive: boolean;
  archived?: boolean;
  onTap:    () => void;
}) {
  const category  = [provider.primary_category, provider.primary_subcategory].filter(Boolean).join(' · ') || 'Категория не указана';
  const isVisible = provider.publication_status === 'visible' && provider.provider_status === 'active';

  return (
    <button
      className="mini-tap"
      onClick={archived ? undefined : onTap}
      disabled={archived}
      style={{
        display: 'flex', gap: 12, alignItems: 'center',
        width: '100%', padding: '12px 14px',
        background: isActive ? 'rgba(124,58,237,.06)' : 'var(--tg-theme-secondary-bg-color,#fff)',
        border: isActive ? '1.5px solid rgba(124,58,237,.25)' : '1px solid rgba(0,0,0,.07)',
        borderRadius: 14,
        fontFamily: 'inherit', textAlign: 'left', cursor: archived ? 'default' : 'pointer',
        opacity: archived ? .7 : 1,
      }}
    >
      <div className="mini-avatar-sm">{provider.display_name[0]?.toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
          <span style={{ fontWeight: 800, fontSize: 14 }}>{provider.display_name}</span>
          {isActive && <Badge bg="rgba(124,58,237,.1)" color="#6d28d9">Активный</Badge>}
          {archived && <Badge bg="rgba(107,114,128,.12)" color="#4b5563">Архив</Badge>}
        </div>
        <div style={{ fontSize: 12, color: 'var(--tg-theme-hint-color,#6b7280)' }}>{category}</div>
        <div style={{ fontSize: 11, color: 'var(--tg-theme-hint-color,#9ca3af)', marginTop: 2 }}>
          {provider.city ? `📍 ${provider.city} · ` : ''}
          {isVisible ? 'Виден клиентам' : 'Скрыт'}
        </div>
      </div>
      {!archived && <span style={{ fontSize: 16, color: 'rgba(0,0,0,.18)', flexShrink: 0 }}>›</span>}
    </button>
  );
}

function Badge({ bg, color, children }: { bg: string; color: string; children: string }) {
  return <span style={{ background: bg, color, borderRadius: 8, padding: '2px 7px', fontSize: 11, fontWeight: 900 }}>{children}</span>;
}

/* ── ProfileCreateView ─────────────────────────────────────────────────────── */

const CREATE_CATEGORIES = [
  'Тамада', 'Фотограф', 'Видеограф', 'DJ',
  'Декоратор', 'Флорист', 'Артист', 'Аниматор',
];
const CREATE_KZ_CITIES = [
  'Алматы', 'Астана', 'Шымкент', 'Қарағанды', 'Ақтобе',
  'Тараз', 'Павлодар', 'Өскемен', 'Семей', 'Атырау',
  'Қостанай', 'Петропавл', 'Орал', 'Ақтау', 'Қызылорда',
];

type CreatePicker = 'category' | 'subcategory' | 'city' | null;

function ProfileCreateView({ saving, canCreate, maxProfiles, onCancel, onCreate }: {
  saving:    boolean;
  canCreate: boolean;
  maxProfiles: number;
  onCancel:  () => void;
  onCreate:  (input: CreateProfileInput) => Promise<void>;
}) {
  const [displayName,  setDisplayName]  = useState('');
  const [category,     setCategory]     = useState('');
  const [subcategory,  setSubcategory]  = useState('');
  const [city,         setCity]         = useState('');
  const [picker,       setPicker]       = useState<CreatePicker>(null);

  const canSubmit = !!displayName.trim() && !!category && canCreate && !saving;

  async function submit() {
    if (!canSubmit) return;
    await onCreate({ display_name: displayName.trim(), category, subcategory, city });
  }

  return (
    <>
      {/* ── Inline header ─────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, paddingBottom: 14,
        borderBottom: '1px solid rgba(0,0,0,.07)',
      }}>
        <button
          className="mini-tap"
          onClick={onCancel}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: 'var(--tg-theme-hint-color,#6b7280)', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
        >
          Отмена
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>Новый профиль</span>
        <button
          className="mini-tap"
          onClick={() => void submit()}
          disabled={!canSubmit}
          style={{ border: 'none', background: 'none', padding: '4px 0', color: canSubmit ? '#7c3aed' : 'rgba(124,58,237,.35)', fontFamily: 'inherit', fontSize: 15, fontWeight: 700, cursor: canSubmit ? 'pointer' : 'default' }}
        >
          {saving ? '...' : 'Создать'}
        </button>
      </div>

      {!canCreate && (
        <div style={{ padding: '12px 14px', background: 'rgba(245,158,11,.1)', color: '#92400e', borderRadius: 12, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
          Лимит: до {maxProfiles} профилей на аккаунт.
        </div>
      )}

      <div className="mini-field">
        <label>Название</label>
        <input className="mini-input" value={displayName} maxLength={80} placeholder="Например: Айдана Той" onChange={e => setDisplayName(e.target.value)} />
      </div>

      <PickerRow label="Категория"    value={category}    placeholder="Выберите категорию"    onOpen={() => setPicker('category')} />
      <PickerRow label="Подкатегория" value={subcategory} placeholder="Необязательно"         onOpen={() => setPicker('subcategory')} optional />
      <PickerRow label="Город"        value={city}        placeholder="Выберите город"        onOpen={() => setPicker('city')} optional />

      {picker === 'category' && (
        <MiniPicker title="Категория" options={CREATE_CATEGORIES} value={category} allowCustom
          onConfirm={v => { setCategory(v); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'subcategory' && (
        <MiniPicker title="Подкатегория" options={SUBCATEGORIES[category] ?? []} value={subcategory} allowCustom
          onConfirm={v => { setSubcategory(v); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
      {picker === 'city' && (
        <MiniPicker title="Город" options={CREATE_KZ_CITIES} value={city} allowCustom
          onConfirm={v => { setCity(v); setPicker(null); }}
          onClose={() => setPicker(null)}
        />
      )}
    </>
  );
}

/* ── PickerRow (shared) ────────────────────────────────────────────────────── */
function PickerRow({ label, value, placeholder, onOpen, optional }: {
  label:       string;
  value:       string;
  placeholder: string;
  onOpen:      () => void;
  optional?:   boolean;
}) {
  return (
    <button
      className="mini-tap"
      onClick={onOpen}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '13px 16px',
        background: 'var(--tg-theme-secondary-bg-color,#fff)',
        border: '1px solid rgba(0,0,0,.09)',
        borderRadius: 12, marginBottom: 10,
        fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
      }}
    >
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--tg-theme-hint-color,#6b7280)', marginBottom: 2 }}>
          {label}{optional ? <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}> — необязательно</span> : ''}
        </div>
        <div style={{ fontSize: 15, fontWeight: value ? 600 : 400, color: value ? 'var(--tg-theme-text-color,#0a0a0f)' : 'var(--tg-theme-hint-color,#9ca3af)' }}>
          {value || placeholder}
        </div>
      </div>
      <span style={{ fontSize: 16, color: 'rgba(0,0,0,.2)', marginLeft: 8 }}>›</span>
    </button>
  );
}
