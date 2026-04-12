import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import { getAuthAccount } from '../auth/middleware';
import {
  findProvidersByAccountId,
  findProviderById,
  findServicesByProviderId,
  countPhotosByProviderId,
  findLinksByProviderId,
} from '../providers/repositories';
import { countLinkedAccounts } from '../telegram/repositories';
import { findEntriesByRange } from '../calendar/repositories';
import * as repo from './repositories';

export function createOnboardingRoutes(db: Db) {
  const plugin: FastifyPluginAsync = async (app) => {

    // GET /dashboard/onboarding — computed onboarding progress
    app.get('/dashboard/onboarding', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const query = req.query as Record<string, string>;
      let providerId = query['provider_id'] ?? '';

      if (providerId) {
        const p = await findProviderById(db, providerId);
        if (!p || p.account_id !== account.id) {
          return reply.code(403).send({ ok: false, error: 'Forbidden' });
        }
      } else {
        const providers = await findProvidersByAccountId(db, account.id);
        if (!providers[0]) {
          return reply.send({
            ok: true,
            provider_id: null,
            onboarding: noProviderState(),
          });
        }
        providerId = providers[0].id;
      }

      const provider = await findProviderById(db, providerId);

      const [services, photosCount, links, tgCount, calEntries, onboardingRow] = await Promise.all([
        findServicesByProviderId(db, providerId),
        countPhotosByProviderId(db, providerId),
        findLinksByProviderId(db, providerId),
        countLinkedAccounts(db, providerId),
        findEntriesByRange(db, providerId, new Date(), new Date(Date.now() + 90 * 86400000)),
        repo.findOnboarding(db, providerId),
      ]);

      const steps = {
        basics:   !!(provider?.display_name && (provider.city ?? provider.region) && services.some(s => s.is_active)),
        photos:   photosCount >= 1,
        contacts: links.length >= 1,
        telegram: tgCount >= 1,
        calendar: calEntries.length >= 1,
      };

      const doneCnt = Object.values(steps).filter(Boolean).length;
      const completion_pct = Math.round((doneCnt / 5) * 100);

      return reply.send({
        ok: true,
        provider_id: providerId,
        onboarding: {
          status:         onboardingRow?.status ?? 'in_progress',
          current_step:   onboardingRow?.current_step ?? 1,
          started_at:     onboardingRow?.started_at ?? null,
          completed_at:   onboardingRow?.completed_at ?? null,
          steps,
          completion_pct,
        },
      });
    });

    // PATCH /dashboard/onboarding — save progress
    app.patch('/dashboard/onboarding', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const providerId = typeof body['provider_id'] === 'string' ? body['provider_id'] : null;
      const step = typeof body['step'] === 'number' ? body['step'] : null;

      if (!providerId || !step) {
        return reply.code(400).send({ ok: false, error: 'provider_id and step required' });
      }

      const provider = await findProviderById(db, providerId);
      if (!provider || provider.account_id !== account.id) {
        return reply.code(403).send({ ok: false, error: 'Forbidden' });
      }

      const row = await repo.upsertOnboarding(db, providerId, step);
      return reply.send({ ok: true, onboarding: row });
    });

    // POST /dashboard/onboarding/complete
    app.post('/dashboard/onboarding/complete', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const providerId = typeof body['provider_id'] === 'string' ? body['provider_id'] : null;
      if (!providerId) return reply.code(400).send({ ok: false, error: 'provider_id required' });

      const provider = await findProviderById(db, providerId);
      if (!provider || provider.account_id !== account.id) {
        return reply.code(403).send({ ok: false, error: 'Forbidden' });
      }

      await repo.completeOnboarding(db, providerId);
      return reply.send({ ok: true });
    });
  };

  return plugin;
}

function noProviderState() {
  return {
    status: 'in_progress',
    current_step: 1,
    started_at: null,
    completed_at: null,
    steps: { basics: false, photos: false, contacts: false, telegram: false, calendar: false },
    completion_pct: 0,
  };
}
