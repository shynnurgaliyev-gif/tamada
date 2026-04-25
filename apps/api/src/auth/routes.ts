import type { FastifyInstance } from 'fastify';
import type { Db } from '../db';
import type { WhatsAppProvider } from './whatsapp';
import type { SupabaseClient } from '../supabase';
import * as service from './service';
import { hashToken } from './repositories';
import { findAccountById, updateAccountPublicSettings, updateAccountProfile } from './repositories';
import { getAuthAccount } from './middleware';
import { getMiniSessionContext } from '../telegram/mini-session';

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
      if (!token) {
        const mini = await getMiniSessionContext(db, req);
        if (!mini) return reply.code(401).send({ ok: false, error: { code: 'UNAUTHORIZED', message: 'No token' } });
        const account = await findAccountById(db, mini.accountId);
        if (!account) return reply.code(401).send({ ok: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' } });
        return reply.send({ ok: true, account });
      }

      const result = await service.getMe(db, hashToken(token));
      return reply.code(result.ok ? 200 : 401).send(result);
    });

    // PATCH /auth/account/public-settings
    app.patch('/auth/account/public-settings', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_manage_subscription');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const showRelatedProfiles = typeof body['show_related_profiles'] === 'boolean'
        ? body['show_related_profiles']
        : undefined;
      if (showRelatedProfiles === undefined) {
        return reply.code(400).send({ ok: false, error: 'show_related_profiles required' });
      }

      const updated = await updateAccountPublicSettings(db, accountId, { showRelatedProfiles });
      return reply.send({ ok: true, account: updated });
    });

    // PATCH /auth/account/profile
    app.patch('/auth/account/profile', async (req, reply) => {
      const account = await getAuthAccount(db, req);
      const mini = account ? null : await getMiniSessionContext(db, req, 'can_edit_profile');
      const accountId = account?.id ?? mini?.accountId;
      if (!accountId) return reply.code(401).send({ ok: false, error: 'Unauthorized' });

      const body = req.body as Record<string, unknown>;
      const fullName = typeof body['full_name'] === 'string' ? body['full_name'].trim() : null;
      if (!fullName || fullName.length < 2) {
        return reply.code(400).send({ ok: false, error: 'full_name must be at least 2 characters' });
      }
      if (fullName.length > 100) {
        return reply.code(400).send({ ok: false, error: 'full_name too long (max 100 characters)' });
      }

      const updated = await updateAccountProfile(db, accountId, { fullName });
      return reply.send({ ok: true, account: updated });
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
