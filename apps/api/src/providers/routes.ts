import { randomUUID } from 'crypto';
import type { FastifyInstance } from 'fastify';
import type { AppEnv } from '@tamada/config';
import type { Db } from '../db';
import type { SupabaseClient } from '../supabase';
import { PHOTOS_BUCKET, photoPublicUrl } from '../supabase';
import { getAuthAccount } from '../auth/middleware';
import { getMiniSessionContext } from '../telegram/mini-session';
import type { MiniPermissionKey } from '../telegram/permissions';
import * as telegramRepo from '../telegram/repositories';
import * as repo from './repositories';

const MAX_PHOTOS = 5;
const MAX_PROFILES_PER_ACCOUNT = 3;
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

function withPhotoUrls(
  env: AppEnv,
  photos: repo.ProviderPhoto[],
): (repo.ProviderPhoto & { url: string })[] {
  return photos.map(p => ({ ...p, url: photoPublicUrl(env, p.storage_path) }));
}

export function createProviderRoutes(db: Db, supabase: SupabaseClient, env: AppEnv) {
  return async (app: FastifyInstance) => {
    async function getOwnerContext(req: Parameters<typeof getAuthAccount>[1], permission: MiniPermissionKey) {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, permission);
      const accountId = account?.id ?? mini?.accountId ?? null;
      const telegramAccountId = mini?.telegramAccount.id ?? null;
      return { accountId, telegramAccountId };
    }

    // POST /providers
    app.post('/providers', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_create_profile');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const displayName = typeof body['display_name'] === 'string' ? body['display_name'] : null;
      const slug = typeof body['slug'] === 'string' ? body['slug'] : null;
      if (!displayName || !slug) {
        return reply.code(400).send({ ok: false, error: 'display_name and slug required' });
      }
      if (!/^[a-z0-9-]+$/.test(slug)) {
        return reply.code(400).send({ ok: false, error: 'slug must be lowercase letters, numbers, hyphens' });
      }

      const existing = await repo.findProviderBySlug(db, slug);
      if (existing) return reply.code(400).send({ ok: false, error: 'slug already taken' });

      const profileCount = await repo.countActiveProvidersByAccountId(db, accountId);
      if (profileCount >= MAX_PROFILES_PER_ACCOUNT) {
        return reply.code(400).send({
          ok: false,
          error: `Maximum ${MAX_PROFILES_PER_ACCOUNT} profiles per account`,
        });
      }

      const provider = await repo.createProvider(db, {
        accountId,
        displayName,
        slug,
        bio: typeof body['bio'] === 'string' ? body['bio'] : undefined,
        countryCode: typeof body['country_code'] === 'string' ? body['country_code'] : undefined,
        region: typeof body['region'] === 'string' ? body['region'] : undefined,
        city: typeof body['city'] === 'string' ? body['city'] : undefined,
        district: typeof body['district'] === 'string' ? body['district'] : undefined,
        addressText: typeof body['address_text'] === 'string' ? body['address_text'] : undefined,
        timezone: typeof body['timezone'] === 'string' ? body['timezone'] : undefined,
      });

      // Auto-create 30-day trial subscription so provider appears in search immediately.
      // Only create if this account has no active/trial subscription yet.
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db`
        INSERT INTO subscriptions (account_id, provider_id, plan_code, status, starts_at, expires_at, trial_ends_at)
        SELECT ${accountId}, ${provider.id}, 'trial', 'trial', NOW(), ${trialEnd}, ${trialEnd}
        WHERE NOT EXISTS (
          SELECT 1 FROM subscriptions
          WHERE account_id = ${accountId}
            AND status NOT IN ('cancelled', 'expired', 'blocked')
            AND expires_at > NOW()
        )
      `.catch(() => null);

      return reply.code(201).send({ ok: true, provider });
    });

    // GET /providers/me
    app.get('/providers/me', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_view_profile');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const query = req.query as Record<string, string>;
      const includeArchived = query['include_archived'] === '1' || query['include_archived'] === 'true';
      const providers = includeArchived
        ? await repo.findAllProvidersByAccountId(db, accountId)
        : await repo.findProvidersByAccountId(db, accountId);
      return reply.send({ ok: true, providers });
    });

    // PATCH /providers/:id
    app.patch('/providers/:id', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_edit_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      const map: Record<string, string> = {
        display_name: 'display_name', bio: 'bio', country_code: 'country_code',
        region: 'region', city: 'city', district: 'district',
        address_text: 'address_text', timezone: 'timezone',
        provider_status: 'provider_status', publication_status: 'publication_status',
        show_owner_name: 'show_owner_name',
      };
      for (const [key, col] of Object.entries(map)) {
        if (body[key] !== undefined) updates[col] = body[key];
      }

      const updated = await repo.updateProvider(db, id, updates);
      return reply.send({ ok: true, provider: updated });
    });


    // POST /providers/:id/archive
    app.post('/providers/:id/archive', async (req, reply) => {
      const { accountId, telegramAccountId } = await getOwnerContext(req, 'can_archive_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const reason = typeof body['reason'] === 'string' ? body['reason'] : undefined;
      const archived = await repo.archiveProvider(db, id, accountId, reason);
      await telegramRepo.revokeLinkTokensForProvider(db, id);
      await telegramRepo.logActivity(db, {
        providerId: id,
        actorType: telegramAccountId ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: telegramAccountId ?? undefined,
        actionType: 'profile_archived',
        targetType: 'provider',
        targetId: id,
        payloadJson: { reason: reason ?? null },
      });
      return reply.send({ ok: true, provider: archived });
    });

    // POST /providers/:id/unarchive
    app.post('/providers/:id/unarchive', async (req, reply) => {
      const { accountId, telegramAccountId } = await getOwnerContext(req, 'can_archive_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const restored = await repo.unarchiveProvider(db, id);
      await telegramRepo.logActivity(db, {
        providerId: id,
        actorType: telegramAccountId ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: telegramAccountId ?? undefined,
        actionType: 'profile_unarchived',
        targetType: 'provider',
        targetId: id,
      });
      return reply.send({ ok: true, provider: restored });
    });

    // POST /providers/:id/hard-delete
    // Safety step: finalizes as hidden + pending_delete, revokes profile-scoped access/invites.
    app.post('/providers/:id/hard-delete', async (req, reply) => {
      const { accountId, telegramAccountId } = await getOwnerContext(req, 'can_archive_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const confirm = typeof body['confirm_text'] === 'string' ? body['confirm_text'].trim() : '';
      if (confirm !== provider.display_name) {
        return reply.code(400).send({ ok: false, error: 'confirm_text must match profile display_name' });
      }

      await telegramRepo.revokeAssistantAccessForProvider(db, id);
      await telegramRepo.revokeLinkTokensForProvider(db, id);
      const deleted = await repo.markProviderPendingDelete(db, id, accountId);
      await telegramRepo.logActivity(db, {
        providerId: id,
        actorType: telegramAccountId ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: telegramAccountId ?? undefined,
        actionType: 'profile_pending_delete',
        targetType: 'provider',
        targetId: id,
      });
      return reply.send({ ok: true, provider: deleted });
    });

    // POST /providers/:id/transfer-request
    app.post('/providers/:id/transfer-request', async (req, reply) => {
      const { accountId, telegramAccountId } = await getOwnerContext(req, 'can_archive_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const toPhone = typeof body['to_phone'] === 'string' ? body['to_phone'].trim() : '';
      const toAccountId = typeof body['to_account_id'] === 'string' ? body['to_account_id'] : undefined;
      if (!toPhone && !toAccountId) return reply.code(400).send({ ok: false, error: 'to_phone or to_account_id required' });

      const request = await telegramRepo.createOwnershipTransferRequest(db, {
        providerId: id,
        fromAccountId: accountId,
        requestedByAccountId: accountId,
        toAccountId,
        toPhone: toPhone || undefined,
      });
      await telegramRepo.revokeLinkTokensForProvider(db, id);
      await telegramRepo.logActivity(db, {
        providerId: id,
        actorType: telegramAccountId ? 'telegram' : 'web',
        actorAccountId: accountId,
        telegramAccountId: telegramAccountId ?? undefined,
        actionType: 'ownership_transfer_created',
        targetType: 'ownership_transfer_request',
        targetId: request.id,
        payloadJson: { to_account_id: toAccountId ?? null, to_phone: toPhone || null },
      });
      return reply.code(201).send({ ok: true, transfer_request: request });
    });

    // DELETE /providers/:id
    app.delete('/providers/:id', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== account.id) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      await repo.deleteProvider(db, id);
      return reply.send({ ok: true });
    });

    // GET /providers/:id/data  (authenticated — works for drafts too)
    app.get('/providers/:id/data', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_view_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const [services, photos, links] = await Promise.all([
        repo.findServicesByProviderId(db, id),
        repo.findPhotosByProviderId(db, id),
        repo.findLinksByProviderId(db, id),
      ]);

      return reply.send({
        ok: true,
        services: services.filter(s => s.is_active),
        photos: withPhotoUrls(env, photos),
        links,
      });
    });

    // POST /providers/:id/services
    app.post('/providers/:id/services', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_edit_profile');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider) return reply.code(404).send({ ok: false, error: 'Provider not found' });
      if (provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const category = typeof body['category'] === 'string' ? body['category'] : null;
      if (!category) {
        return reply.code(400).send({ ok: false, error: 'category required' });
      }
      // title defaults to subcategory or category name if not provided
      const rawTitle = typeof body['title'] === 'string' ? body['title'].trim() : '';
      const subcategory = typeof body['subcategory'] === 'string' ? body['subcategory'] : undefined;
      const title = rawTitle || subcategory || category;

      const service = await repo.createService(db, {
        providerId: id, category, title,
        subcategory: typeof body['subcategory'] === 'string' ? body['subcategory'] : undefined,
        description: typeof body['description'] === 'string' ? body['description'] : undefined,
        priceFrom: typeof body['price_from'] === 'number' ? body['price_from'] : undefined,
        priceTo: typeof body['price_to'] === 'number' ? body['price_to'] : undefined,
        currency: typeof body['currency'] === 'string' ? body['currency'] : undefined,
      });

      return reply.code(201).send({ ok: true, service });
    });

    // PATCH /providers/:id/services/:serviceId
    app.patch('/providers/:id/services/:serviceId', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_edit_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, serviceId } = req.params as { id: string; serviceId: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const service = await repo.findServiceById(db, serviceId);
      if (!service || service.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Service not found' });

      const body = req.body as Record<string, unknown>;
      const updates: Record<string, unknown> = {};
      for (const key of ['category', 'subcategory', 'title', 'description', 'price_from', 'price_to', 'currency', 'is_active']) {
        if (body[key] !== undefined) updates[key] = body[key];
      }

      const updated = await repo.updateService(db, serviceId, updates);
      return reply.send({ ok: true, service: updated });
    });

    // POST /providers/:id/photos (multipart)
    app.post('/providers/:id/photos', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_edit_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const count = await repo.countPhotosByProviderId(db, id);
      if (count >= MAX_PHOTOS) {
        return reply.code(400).send({ ok: false, error: `Maximum ${MAX_PHOTOS} photos allowed` });
      }

      const file = await req.file();
      if (!file) return reply.code(400).send({ ok: false, error: 'No file uploaded' });
      if (!ALLOWED_MIME.includes(file.mimetype)) {
        return reply.code(400).send({ ok: false, error: 'Only JPEG, PNG, WebP allowed' });
      }

      const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
      const storagePath = `providers/${id}/${randomUUID()}.${ext}`;
      const buffer = await file.toBuffer();

      const { error: uploadError } = await supabase.storage
        .from(PHOTOS_BUCKET)
        .upload(storagePath, buffer, { contentType: file.mimetype });

      if (uploadError) {
        return reply.code(500).send({ ok: false, error: 'Upload failed' });
      }

      const photo = await repo.createPhoto(db, {
        providerId: id,
        storagePath,
        sortOrder: count,
        isCover: count === 0,
      });

      return reply.code(201).send({ ok: true, photo: { ...photo, url: photoPublicUrl(env, storagePath) } });
    });

    // DELETE /providers/:id/photos/:photoId
    app.delete('/providers/:id/photos/:photoId', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_edit_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, photoId } = req.params as { id: string; photoId: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const photo = await repo.findPhotoById(db, photoId);
      if (!photo || photo.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Photo not found' });

      await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
      await repo.deletePhoto(db, photoId);

      return reply.send({ ok: true });
    });

    // POST /providers/:id/links
    app.post('/providers/:id/links', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_edit_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id } = req.params as { id: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = req.body as Record<string, unknown>;
      const linkType = typeof body['link_type'] === 'string' ? body['link_type'] : null;
      const url = typeof body['url'] === 'string' ? body['url'] : null;
      if (!linkType || !url) return reply.code(400).send({ ok: false, error: 'link_type and url required' });

      const link = await repo.createLink(db, {
        providerId: id,
        linkType: linkType as repo.LinkType,
        url,
        label: typeof body['label'] === 'string' ? body['label'] : undefined,
      });

      return reply.code(201).send({ ok: true, link });
    });

    // DELETE /providers/:id/links/:linkId
    app.delete('/providers/:id/links/:linkId', async (req, reply) => {
      const { accountId } = await getOwnerContext(req, 'can_edit_profile');
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const { id, linkId } = req.params as { id: string; linkId: string };
      const provider = await repo.findProviderById(db, id);
      if (!provider || provider.account_id !== accountId) return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const link = await repo.findLinkById(db, linkId);
      if (!link || link.provider_id !== id) return reply.code(404).send({ ok: false, error: 'Link not found' });

      await repo.deleteLink(db, linkId);
      return reply.send({ ok: true });
    });

    // GET /public/providers/:slug
    app.get('/public/providers/:slug', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await repo.findProviderBySlug(db, slug);

      if (
        !provider ||
        provider.publication_status !== 'visible' ||
        provider.provider_status !== 'active' ||
        provider.archived_at ||
        provider.pending_delete_at
      ) {
        return reply.code(404).send({ ok: false, error: 'Provider not found' });
      }

      // Check subscription visibility
      const { getSubscriptionStatus } = await import('../subscription/routes');
      const subInfo = await getSubscriptionStatus(db, provider.id);
      if (!subInfo.is_visible && subInfo.status !== null) {
        return reply.code(404).send({ ok: false, error: 'Provider not found' });
      }

      // Track profile view — fire-and-forget, never blocks response
      const { trackProfileView } = await import('../analytics/repositories');
      trackProfileView(db, provider.id).catch(() => null);

      const [services, photos] = await Promise.all([
        repo.findServicesByProviderId(db, provider.id),
        repo.findPhotosByProviderId(db, provider.id),
      ]);
      const relatedProfiles = await repo.findRelatedPublicProviders(db, provider);

      // Derive owner name when the specialist opts in
      let ownerName: string | null = null;
      if (provider.show_owner_name) {
        const rows = await db<{ first_name: string | null; last_name: string | null }[]>`
          SELECT telegram_first_name AS first_name, telegram_last_name AS last_name
          FROM telegram_accounts
          WHERE account_id = ${provider.account_id}
            AND is_primary = true
            AND status = 'linked'
          LIMIT 1
        `;
        if (rows[0]) {
          ownerName = [rows[0].first_name, rows[0].last_name].filter(Boolean).join(' ') || null;
        }
      }

      // Strip private fields before sending public response
      // Links are NOT included here — returned only via POST reveal-contacts
      const {
        account_id: _a,
        show_related_profiles: _showRelated,
        show_owner_name: _showOwner,
        ...publicProvider
      } = provider as typeof provider & { account_id: unknown; show_related_profiles?: unknown; show_owner_name?: unknown };

      return reply.send({
        ok: true,
        provider: { ...publicProvider, owner_name: ownerName },
        services: services.filter(s => s.is_active),
        photos: withPhotoUrls(env, photos),
        related_profiles: relatedProfiles,
      });
    });
  };
}
