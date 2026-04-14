/* ── useProviderData ───────────────────────────────────────────────────────────
   Fetches and mutates provider sub-resources: photos, links, services.
   Accepts providerId; re-fetches when it changes.
────────────────────────────────────────────────────────────────────────────── */

import { useEffect, useState, useCallback } from 'react';
import type {
  Provider,
  ProviderPhoto,
  ProviderLink,
  ProviderService,
  ProviderUpdate,
  LinkType,
} from '../types';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? '';

function token() { return localStorage.getItem('session_token') ?? ''; }
function auth()  { return { Authorization: `Bearer ${token()}` }; }

/* ── Return shape ─────────────────────────────────────────────────────────── */

export interface ProviderDataState {
  photos:   ProviderPhoto[];
  links:    ProviderLink[];
  services: ProviderService[];
  loading:  boolean;
  saving:   boolean;
  error:    string | null;
  reload:   () => void;

  updateBasic:  (fields: ProviderUpdate) => Promise<Provider | null>;
  uploadPhoto:  (file: File)             => Promise<boolean>;
  deletePhoto:  (photoId: string)        => Promise<boolean>;
  addLink:      (link_type: LinkType, url: string, label?: string) => Promise<boolean>;
  deleteLink:   (linkId: string)         => Promise<boolean>;
}

/* ── Hook ─────────────────────────────────────────────────────────────────── */

export function useProviderData(providerId: string | null): ProviderDataState {
  const [photos,   setPhotos]   = useState<ProviderPhoto[]>([]);
  const [links,    setLinks]    = useState<ProviderLink[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!providerId) return;
    setLoading(true);
    setError(null);
    fetch(`${API}/providers/${providerId}/data`, { headers: auth() })
      .then(r => r.json())
      .then((d: { ok: boolean; photos?: ProviderPhoto[]; links?: ProviderLink[]; services?: ProviderService[] }) => {
        if (d.ok) {
          setPhotos(d.photos   ?? []);
          setLinks(d.links     ?? []);
          setServices(d.services ?? []);
        } else {
          setError('Ошибка загрузки данных');
        }
      })
      .catch(() => setError('Нет соединения'))
      .finally(() => setLoading(false));
  }, [providerId]);

  useEffect(() => { reload(); }, [reload]);

  /* ── Mutations ─────────────────────────────────────────────────────────── */

  const updateBasic = useCallback(async (fields: ProviderUpdate): Promise<Provider | null> => {
    if (!providerId) return null;
    setSaving(true);
    try {
      const r = await fetch(`${API}/providers/${providerId}`, {
        method: 'PATCH',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const d: { ok: boolean; provider?: Provider } = await r.json();
      return d.ok && d.provider ? d.provider : null;
    } catch {
      return null;
    } finally {
      setSaving(false);
    }
  }, [providerId]);

  const uploadPhoto = useCallback(async (file: File): Promise<boolean> => {
    if (!providerId) return false;
    if (photos.length >= 5) return false;
    setSaving(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(`${API}/providers/${providerId}/photos`, {
        method: 'POST',
        headers: auth(),
        body: form,
      });
      const d: { ok: boolean; photo?: ProviderPhoto } = await r.json();
      if (d.ok && d.photo) {
        setPhotos(prev => [...prev, d.photo!]);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [providerId, photos.length]);

  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    if (!providerId) return false;
    setSaving(true);
    try {
      const r = await fetch(`${API}/providers/${providerId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: auth(),
      });
      const d: { ok: boolean } = await r.json();
      if (d.ok) { setPhotos(prev => prev.filter(p => p.id !== photoId)); }
      return d.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [providerId]);

  const addLink = useCallback(async (
    link_type: LinkType,
    url: string,
    label?: string,
  ): Promise<boolean> => {
    if (!providerId) return false;
    setSaving(true);
    try {
      const r = await fetch(`${API}/providers/${providerId}/links`, {
        method: 'POST',
        headers: { ...auth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ link_type, url, label }),
      });
      const d: { ok: boolean; link?: ProviderLink } = await r.json();
      if (d.ok && d.link) { setLinks(prev => [...prev, d.link!]); }
      return d.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [providerId]);

  const deleteLink = useCallback(async (linkId: string): Promise<boolean> => {
    if (!providerId) return false;
    setSaving(true);
    try {
      const r = await fetch(`${API}/providers/${providerId}/links/${linkId}`, {
        method: 'DELETE',
        headers: auth(),
      });
      const d: { ok: boolean } = await r.json();
      if (d.ok) { setLinks(prev => prev.filter(l => l.id !== linkId)); }
      return d.ok;
    } catch {
      return false;
    } finally {
      setSaving(false);
    }
  }, [providerId]);

  return {
    photos, links, services,
    loading, saving, error,
    reload,
    updateBasic, uploadPhoto, deletePhoto, addLink, deleteLink,
  };
}
