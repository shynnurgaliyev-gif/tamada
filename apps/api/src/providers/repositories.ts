import type { Db } from '../db';

export type ProviderStatus = 'active' | 'inactive' | 'sick' | 'vacation' | 'blocked';
export type PublicationStatus = 'draft' | 'visible' | 'hidden' | 'suspended';
export type LinkType = 'instagram' | 'whatsapp' | 'telegram' | 'tiktok' | 'youtube' | 'website' | 'two_gis' | 'map' | 'other';

export type Provider = {
  id: string;
  account_id: string;
  display_name: string;
  slug: string;
  bio: string | null;
  country_code: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  address_text: string | null;
  timezone: string;
  provider_status: ProviderStatus;
  publication_status: PublicationStatus;
  is_featured: boolean;
  is_verified: boolean;
  created_at: Date;
  updated_at: Date;
};

export type ProviderService = {
  id: string;
  provider_id: string;
  category: string;
  subcategory: string | null;
  title: string;
  description: string | null;
  price_from: string | null;
  price_to: string | null;
  currency: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type ProviderPhoto = {
  id: string;
  provider_id: string;
  storage_path: string;
  sort_order: number;
  is_cover: boolean;
  created_at: Date;
};

export type ProviderLink = {
  id: string;
  provider_id: string;
  link_type: LinkType;
  url: string;
  label: string | null;
  created_at: Date;
};

// ---- Providers ----

export async function findProvidersByAccountId(db: Db, accountId: string): Promise<Provider[]> {
  return db<Provider[]>`SELECT * FROM providers WHERE account_id = ${accountId} ORDER BY created_at ASC`;
}

export async function findProviderById(db: Db, id: string): Promise<Provider | null> {
  const rows = await db<Provider[]>`SELECT * FROM providers WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function findProviderBySlug(db: Db, slug: string): Promise<Provider | null> {
  const rows = await db<Provider[]>`SELECT * FROM providers WHERE slug = ${slug} LIMIT 1`;
  return rows[0] ?? null;
}

export async function createProvider(db: Db, data: {
  accountId: string; displayName: string; slug: string;
  bio?: string | undefined; countryCode?: string | undefined; region?: string | undefined;
  city?: string | undefined; district?: string | undefined; addressText?: string | undefined; timezone?: string | undefined;
}): Promise<Provider> {
  const rows = await db<Provider[]>`
    INSERT INTO providers (account_id, display_name, slug, bio, country_code, region, city, district, address_text, timezone)
    VALUES (
      ${data.accountId}, ${data.displayName}, ${data.slug},
      ${data.bio ?? null}, ${data.countryCode ?? null}, ${data.region ?? null},
      ${data.city ?? null}, ${data.district ?? null}, ${data.addressText ?? null},
      ${data.timezone ?? 'Asia/Almaty'}
    )
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create provider');
  return rows[0];
}

export async function updateProvider(db: Db, id: string, data: Record<string, unknown>): Promise<Provider | null> {
  if (Object.keys(data).length === 0) return findProviderById(db, id);
  const rows = await db<Provider[]>`UPDATE providers SET ${db(data)} WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

// ---- Services ----

export async function findServicesByProviderId(db: Db, providerId: string): Promise<ProviderService[]> {
  return db<ProviderService[]>`SELECT * FROM provider_services WHERE provider_id = ${providerId} ORDER BY created_at ASC`;
}

export async function findServiceById(db: Db, id: string): Promise<ProviderService | null> {
  const rows = await db<ProviderService[]>`SELECT * FROM provider_services WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function createService(db: Db, data: {
  providerId: string; category: string; title: string;
  subcategory?: string | undefined; description?: string | undefined;
  priceFrom?: number | undefined; priceTo?: number | undefined; currency?: string | undefined;
}): Promise<ProviderService> {
  const rows = await db<ProviderService[]>`
    INSERT INTO provider_services (provider_id, category, subcategory, title, description, price_from, price_to, currency)
    VALUES (
      ${data.providerId}, ${data.category}, ${data.subcategory ?? null},
      ${data.title}, ${data.description ?? null},
      ${data.priceFrom ?? null}, ${data.priceTo ?? null}, ${data.currency ?? 'KZT'}
    )
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create service');
  return rows[0];
}

export async function updateService(db: Db, id: string, data: Record<string, unknown>): Promise<ProviderService | null> {
  if (Object.keys(data).length === 0) return findServiceById(db, id);
  const rows = await db<ProviderService[]>`UPDATE provider_services SET ${db(data)} WHERE id = ${id} RETURNING *`;
  return rows[0] ?? null;
}

export async function deleteService(db: Db, id: string): Promise<void> {
  await db`DELETE FROM provider_services WHERE id = ${id}`;
}

// ---- Photos ----

export async function findPhotosByProviderId(db: Db, providerId: string): Promise<ProviderPhoto[]> {
  return db<ProviderPhoto[]>`SELECT * FROM provider_photos WHERE provider_id = ${providerId} ORDER BY sort_order ASC, created_at ASC`;
}

export async function countPhotosByProviderId(db: Db, providerId: string): Promise<number> {
  const rows = await db<{ count: string }[]>`SELECT COUNT(*) as count FROM provider_photos WHERE provider_id = ${providerId}`;
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function findPhotoById(db: Db, id: string): Promise<ProviderPhoto | null> {
  const rows = await db<ProviderPhoto[]>`SELECT * FROM provider_photos WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function createPhoto(db: Db, data: {
  providerId: string; storagePath: string; sortOrder?: number; isCover?: boolean;
}): Promise<ProviderPhoto> {
  const rows = await db<ProviderPhoto[]>`
    INSERT INTO provider_photos (provider_id, storage_path, sort_order, is_cover)
    VALUES (${data.providerId}, ${data.storagePath}, ${data.sortOrder ?? 0}, ${data.isCover ?? false})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create photo');
  return rows[0];
}

export async function deletePhoto(db: Db, id: string): Promise<void> {
  await db`DELETE FROM provider_photos WHERE id = ${id}`;
}

// ---- Links ----

export async function findLinksByProviderId(db: Db, providerId: string): Promise<ProviderLink[]> {
  return db<ProviderLink[]>`SELECT * FROM provider_links WHERE provider_id = ${providerId} ORDER BY created_at ASC`;
}

export async function findLinkById(db: Db, id: string): Promise<ProviderLink | null> {
  const rows = await db<ProviderLink[]>`SELECT * FROM provider_links WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function createLink(db: Db, data: {
  providerId: string; linkType: LinkType; url: string; label?: string | undefined;
}): Promise<ProviderLink> {
  const rows = await db<ProviderLink[]>`
    INSERT INTO provider_links (provider_id, link_type, url, label)
    VALUES (${data.providerId}, ${data.linkType}, ${data.url}, ${data.label ?? null})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create link');
  return rows[0];
}

export async function deleteLink(db: Db, id: string): Promise<void> {
  await db`DELETE FROM provider_links WHERE id = ${id}`;
}
