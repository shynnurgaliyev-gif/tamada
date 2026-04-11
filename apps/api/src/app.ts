import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import type { AppEnv } from '@tamada/config';
import type { HealthResponse } from '@tamada/types';
import type { Db } from './db';
import type { SupabaseClient } from './supabase';
import { createAuthRoutes } from './auth/routes';
import { createProviderRoutes } from './providers/routes';
import { createCalendarRoutes } from './calendar/routes';
import { createTelegramRoutes } from './telegram/routes';

export function createApp(env: AppEnv, db: Db, supabase: SupabaseClient, wa: import('./auth/whatsapp').WhatsAppProvider) {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
  });

  void app.register(cors, { origin: true });
  void app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

  const health: HealthResponse = {
    status: 'ok',
    service: env.APP_NAME,
    env: env.NODE_ENV,
  };

  app.get('/health', async () => health);
  app.get('/api/health', async () => health);
  app.get('/', async () => health);

  void app.register(createAuthRoutes(db, wa));
  void app.register(createProviderRoutes(db, supabase, env));
  void app.register(createCalendarRoutes(db));
  void app.register(createTelegramRoutes(db, env));

  return app;
}
