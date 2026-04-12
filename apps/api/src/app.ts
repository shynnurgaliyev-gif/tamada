import Fastify, { type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import type { AppEnv } from '@tamada/config';
import type { Db } from './db';
import type { SupabaseClient } from './supabase';
import { createAuthRoutes } from './auth/routes';
import { createProviderRoutes } from './providers/routes';
import { createCalendarRoutes } from './calendar/routes';
import { createTelegramRoutes } from './telegram/routes';
import { createSubscriptionRoutes } from './subscription/routes';
import { createJobsRoutes } from './jobs/routes';
import { createSearchRoutes } from './search/routes';
import { createReferenceRoutes } from './reference/routes';
import { createAnalyticsRoutes } from './analytics/routes';
import { createOnboardingRoutes } from './onboarding/routes';

const startTime = Date.now();

export function createApp(env: AppEnv, db: Db, supabase: SupabaseClient, wa: import('./auth/whatsapp').WhatsAppProvider) {
  const app = Fastify({
    logger: { level: env.LOG_LEVEL },
    bodyLimit: 512 * 1024, // 512 KB JSON body limit
  });

  // ── Security headers ──────────────────────────────────────────────────
  void app.register(helmet, {
    contentSecurityPolicy: false,       // API serves JSON, not HTML
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  // ── CORS ──────────────────────────────────────────────────────────────
  const allowedOrigins: string | string[] | boolean =
    env.NODE_ENV === 'production'
      ? (env.CORS_ORIGINS ?? env.APP_BASE_URL)
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
      : true;

  void app.register(cors, {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  // ── File uploads ──────────────────────────────────────────────────────
  void app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } }); // 10 MB

  // ── Global rate limit (generous baseline — 120 req/min) ───────────────
  void app.register(rateLimit, {
    global: true,
    max: 120,
    timeWindow: 60_000,
    errorResponseBuilder: () => ({ ok: false, error: 'Too many requests, please slow down' }),
    keyGenerator: (req) => req.ip,
  });

  // ── Health ─────────────────────────────────────────────────────────────
  const health = {
    status: 'ok',
    service: env.APP_NAME,
    env: env.NODE_ENV,
    get uptime() { return Math.floor((Date.now() - startTime) / 1000); },
  };

  app.get('/health', async () => health);
  app.get('/api/health', async () => health);
  app.get('/', async () => health);

  // ── Auth — strict rate limit (15 req / 15 min per IP) ─────────────────
  void app.register(async (authScope) => {
    void authScope.register(rateLimit, {
      max: 15,
      timeWindow: 15 * 60_000,
      errorResponseBuilder: () => ({ ok: false, error: 'Too many attempts, try again in 15 minutes' }),
      keyGenerator: (req) => req.ip,
    });
    void authScope.register(createAuthRoutes(db, wa));
  });

  // ── Search + AI — moderate rate limit (30 req/min per IP) ─────────────
  void app.register(async (searchScope) => {
    void searchScope.register(rateLimit, {
      max: 30,
      timeWindow: 60_000,
      errorResponseBuilder: () => ({ ok: false, error: 'Too many search requests, please slow down' }),
      keyGenerator: (req) => req.ip,
    });
    void searchScope.register(createSearchRoutes(db, env));
  });

  // ── Reference data (public, cached) ───────────────────────────────────
  void app.register(createReferenceRoutes(db));

  // ── Other routes ───────────────────────────────────────────────────────
  void app.register(createProviderRoutes(db, supabase, env));
  void app.register(createCalendarRoutes(db));
  void app.register(createTelegramRoutes(db, env));
  void app.register(createSubscriptionRoutes(db, env));
  void app.register(createJobsRoutes(db, env));
  void app.register(createAnalyticsRoutes(db));
  void app.register(createOnboardingRoutes(db));

  // ── Global error handler ───────────────────────────────────────────────
  app.setErrorHandler((error: FastifyError, req, reply) => {
    const status = error.statusCode ?? 500;
    if (status >= 500) {
      app.log.error({ err: error, method: req.method, url: req.url }, 'Unhandled error');
    }
    void reply.code(status).send({
      ok: false,
      error: status >= 500 && env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (error.message ?? 'Unknown error'),
    });
  });

  // ── 404 ────────────────────────────────────────────────────────────────
  app.setNotFoundHandler((_req, reply) => {
    void reply.code(404).send({ ok: false, error: 'Not found' });
  });

  return app;
}
