import type { FastifyRequest } from 'fastify';
import type { Db } from '../db';
import type { Account } from './repositories';
import { hashToken, findValidSession, findAccountById, touchAccountActivity } from './repositories';

export async function getAuthAccount(db: Db, req: FastifyRequest): Promise<Account | null> {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  if (!token) return null;
  const session = await findValidSession(db, hashToken(token));
  if (!session) return null;
  const account = await findAccountById(db, session.account_id);
  if (account) {
    // Fire-and-forget — refresh last_active_at (throttled internally to 5 min).
    // Used by the hibernation cron to decide whether to hide inactive profiles.
    void touchAccountActivity(db, account.id);
  }
  return account;
}
