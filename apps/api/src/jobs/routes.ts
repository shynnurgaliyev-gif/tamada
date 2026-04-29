import type { FastifyPluginAsync } from 'fastify';
import type { Db } from '../db';
import type { AppEnv } from '@tamada/config';
import { enqueueEventReminders, enqueueSubscriptionReminders, enqueueCalendarStaleReminders } from './enqueue';
import { processReminders } from './process';
import { findAllRecentLogs } from './repositories';
import { getAuthAccount } from '../auth/middleware';
import { badRequest, unauthorized, forbidden, notFound, conflict, serverError } from '../replies';

export function createJobsRoutes(db: Db, env: AppEnv) {
  const plugin: FastifyPluginAsync = async (app) => {

    function checkSecret(req: import('fastify').FastifyRequest): boolean {
      const secret = env.INTERNAL_JOBS_SECRET;
      if (!secret) return false; // secret required in production
      const header = req.headers['x-internal-secret'];
      return header === secret;
    }

    // POST /internal/jobs/enqueue-reminders
    app.post('/internal/jobs/enqueue-reminders', async (req, reply) => {
      if (!checkSecret(req)) return forbidden(reply);

      const [eventCount, subCount, staleCount] = await Promise.all([
        enqueueEventReminders(db, env.DEFAULT_MORNING_REMINDER_HOUR),
        enqueueSubscriptionReminders(db),
        enqueueCalendarStaleReminders(db, env.CALENDAR_STALE_DAYS),
      ]);

      return reply.send({
        ok: true,
        enqueued: { event_reminders: eventCount, subscription_reminders: subCount, calendar_stale: staleCount },
      });
    });

    // POST /internal/jobs/process-reminders
    app.post('/internal/jobs/process-reminders', async (req, reply) => {
      if (!checkSecret(req)) return forbidden(reply);

      const result = await processReminders(db, env);
      return reply.send({ ok: true, ...result });
    });

    // GET /providers/:id/notifications  (auth, for web dashboard)
    app.get('/providers/:id/notifications', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return unauthorized(reply);

      const { id } = req.params as { id: string };
      const { findProviderById } = await import('../providers/repositories');
      const provider = await findProviderById(db, id);
      if (!provider) return notFound(reply, 'Профиль не найден');
      if (provider.account_id !== account.id) return forbidden(reply);

      const logs = await findAllRecentLogs(db, 20);
      const filtered = logs.filter(l => l.provider_id === id);
      return reply.send({ ok: true, logs: filtered });
    });
  };

  return plugin;
}
