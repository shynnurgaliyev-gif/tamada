import Fastify from 'fastify';
import type { AppEnv } from '@tamada/config';
import type { HealthResponse } from '@tamada/types';

export function createApp(env: AppEnv) {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
    },
  });

  const health: HealthResponse = {
    status: 'ok',
    service: env.APP_NAME,
    env: env.NODE_ENV,
  };

  app.get('/health', async () => health);
  app.get('/api/health', async () => health);
  app.get('/', async () => health);

  return app;
}
