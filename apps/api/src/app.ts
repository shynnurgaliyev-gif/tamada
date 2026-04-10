import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { AppEnv } from '@tamada/config';
import type { HealthResponse } from '@tamada/types';
import type { Db } from './db';
import type { WhatsAppProvider } from './auth/whatsapp';
import { createAuthRoutes } from './auth/routes';

export function createApp(env: AppEnv, db: Db, wa: WhatsAppProvider) {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  void app.register(cors, { origin: true });

  const health: HealthResponse = {
    status: 'ok',
    service: env.APP_NAME,
    env: env.NODE_ENV,
  };

  app.get('/health', async () => health);
  app.get('/api/health', async () => health);
  app.get('/', async () => health);

  void app.register(createAuthRoutes(db, wa));

  return app;
}
