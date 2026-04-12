import type { FastifyInstance } from 'fastify';
import type { Db } from '../db';
import type { WhatsAppProvider } from './whatsapp';
import type { SupabaseClient } from '../supabase';
import * as service from './service';
import { hashToken } from './repositories';
import { getAuthAccount } from './middleware';

function extractToken(request: { headers: Record<string, string | string[] | undefined> }): string | null {
  const auth = request.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7);
  }
  return null;
}

export function createAuthRoutes(db: Db, wa: WhatsAppProvider, supabase: SupabaseClient) {
  return async (app: FastifyInstance) => {
    // POST /auth/signup/request-code
    app.post('/auth/signup/request-code', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const phone = typeof body['phone'] === 'string' ? body['phone'] : null;
      if (!phone) return reply.code(400).send({ ok: false, error: 'phone required' });

      const result = await service.requestSignupCode(db, wa, phone);
      return reply.code(result.ok ? 200 : 400).send(result);
    });

    // POST /auth/signup/confirm
    app.post('/auth/signup/confirm', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const phone = typeof body['phone'] === 'string' ? body['phone'] : null;
      const code = typeof body['code'] === 'string' ? body['code'] : null;
      const username = typeof body['username'] === 'string' ? body['username'] : null;
      const password = typeof body['password'] === 'string' ? body['password'] : null;

      if (!phone || !code || !username || !password) {
        return reply.code(400).send({ ok: false, error: 'phone, code, username, password required' });
      }

      const result = await service.confirmSignup(
        db,
        { phone, code, username, password },
        { userAgent: req.headers['user-agent'] ?? null, ipAddress: req.ip },
      );
      return reply.code(result.ok ? 200 : 400).send(result);
    });

    // POST /auth/login
    app.post('/auth/login', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const username = typeof body['username'] === 'string' ? body['username'] : null;
      const password = typeof body['password'] === 'string' ? body['password'] : null;

      if (!username || !password) {
        return reply.code(400).send({ ok: false, error: 'username and password required' });
      }

      const result = await service.login(
        db,
        { username, password },
        { userAgent: req.headers['user-agent'] ?? null, ipAddress: req.ip },
      );
      return reply.code(result.ok ? 200 : 401).send(result);
    });

    // POST /auth/logout
    app.post('/auth/logout', async (req, reply) => {
      const token = extractToken(req);
      if (token) await service.logout(db, hashToken(token));
      return reply.send({ ok: true });
    });

    // POST /auth/password/reset/request-code
    app.post('/auth/password/reset/request-code', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const phone = typeof body['phone'] === 'string' ? body['phone'] : null;
      if (!phone) return reply.code(400).send({ ok: false, error: 'phone required' });

      const result = await service.requestPasswordResetCode(db, wa, phone);
      return reply.send(result);
    });

    // POST /auth/password/reset/confirm
    app.post('/auth/password/reset/confirm', async (req, reply) => {
      const body = req.body as Record<string, unknown>;
      const phone = typeof body['phone'] === 'string' ? body['phone'] : null;
      const code = typeof body['code'] === 'string' ? body['code'] : null;
      const newPassword = typeof body['new_password'] === 'string' ? body['new_password'] : null;

      if (!phone || !code || !newPassword) {
        return reply.code(400).send({ ok: false, error: 'phone, code, new_password required' });
      }

      const result = await service.confirmPasswordReset(db, { phone, code, newPassword });
      return reply.code(result.ok ? 200 : 400).send(result);
    });

    // GET /auth/me
    app.get('/auth/me', async (req, reply) => {
      const token = extractToken(req);
      if (!token) return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });

      const result = await service.getMe(db, hashToken(token));
      return reply.code(result.ok ? 200 : 401).send(result);
    });

    // DELETE /auth/account  — permanently delete account + all data
    app.delete('/auth/account', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      if (!account) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const password = typeof body['password'] === 'string' ? body['password'] : null;
      if (!password) return reply.code(400).send({ ok: false, error: 'password required' });

      const result = await service.deleteAccount(db, supabase, account.id, password);
      return reply.code(result.ok ? 200 : 400).send(result);
    });
  };
}
