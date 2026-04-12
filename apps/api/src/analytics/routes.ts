import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import { getAuthAccount } from '../auth/middleware';
import { findProviderBySlug, findProviderById, findProvidersByAccountId, findLinksByProviderId } from '../providers/repositories';
import * as repo from './repositories';

export function createAnalyticsRoutes(db: Db) {
  const plugin: FastifyPluginAsync = async (app) => {

    // POST /public/providers/:slug/reveal-contacts
    // Logs the reveal event and returns the provider's contact links
    app.post('/public/providers/:slug/reveal-contacts', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await findProviderBySlug(db, slug);
      if (!provider || provider.publication_status !== 'visible') {
        return reply.code(404).send({ ok: false, error: 'Provider not found' });
      }

      const body = (req.body ?? {}) as Record<string, unknown>;
      const sourcePage = typeof body['source_page'] === 'string' ? body['source_page'] : 'profile';
      const selectedDate = typeof body['selected_date'] === 'string' ? body['selected_date'] : undefined;
      const selectedTimeFrom = typeof body['selected_time_from'] === 'string' ? body['selected_time_from'] : undefined;
      const selectedTimeTo = typeof body['selected_time_to'] === 'string' ? body['selected_time_to'] : undefined;
      const viewerSessionId = typeof body['viewer_session_id'] === 'string' ? body['viewer_session_id'] : undefined;

      // Log reveal — non-blocking (don't fail the request if analytics write fails)
      repo.logContactReveal(db, {
        providerId: provider.id,
        sourcePage,
        ...(selectedDate !== undefined && { selectedDate }),
        ...(selectedTimeFrom !== undefined && { selectedTimeFrom }),
        ...(selectedTimeTo !== undefined && { selectedTimeTo }),
        ...(viewerSessionId !== undefined && { viewerSessionId }),
      }).catch(() => null);

      // Return the provider's contact links
      const links = await findLinksByProviderId(db, provider.id);
      return reply.send({ ok: true, links });
    });

    // POST /public/providers/:slug/track  — fire-and-forget event tracker
    app.post('/public/providers/:slug/track', async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const provider = await findProviderBySlug(db, slug);
      if (!provider || provider.publication_status !== 'visible') {
        return reply.code(404).send({ ok: false });
      }
      const body = (req.body ?? {}) as Record<string, unknown>;
      const event = typeof body['event'] === 'string' ? body['event'] : '';
      if (event === 'calendar_view') {
        repo.trackCalendarView(db, provider.id).catch(() => null);
      }
      return reply.send({ ok: true });
    });

    // GET /dashboard/analytics/summary?provider_id=&days=
    app.get('/dashboard/analytics/summary', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const query = req.query as Record<string, string>;
      const days = parseInt(query['days'] ?? '30', 10);

      // Resolve provider — explicit id or first owned provider
      let providerId = query['provider_id'] ?? '';
      if (providerId) {
        const p = await findProviderById(db, providerId);
        if (!p || p.account_id !== account.id) {
          return reply.code(403).send({ ok: false, error: 'Forbidden' });
        }
      } else {
        const providers = await findProvidersByAccountId(db, account.id);
        if (!providers[0]) return reply.send({ ok: true, summary: null });
        providerId = providers[0].id;
      }

      const summary = await repo.getAnalyticsSummary(db, providerId, days);
      return reply.send({ ok: true, provider_id: providerId, days, summary });
    });

    // GET /dashboard/analytics/daily?provider_id=&from=&to=
    app.get('/dashboard/analytics/daily', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const query = req.query as Record<string, string>;
      const from = query['from'] ? new Date(query['from']) : new Date(Date.now() - 30 * 86400000);
      const to   = query['to']   ? new Date(query['to'])   : new Date();

      let providerId = query['provider_id'] ?? '';
      if (providerId) {
        const p = await findProviderById(db, providerId);
        if (!p || p.account_id !== account.id) {
          return reply.code(403).send({ ok: false, error: 'Forbidden' });
        }
      } else {
        const providers = await findProvidersByAccountId(db, account.id);
        if (!providers[0]) return reply.send({ ok: true, rows: [] });
        providerId = providers[0].id;
      }

      const rows = await repo.getAnalyticsDaily(db, providerId, from, to);
      return reply.send({ ok: true, provider_id: providerId, rows });
    });

  };
  return plugin;
}
