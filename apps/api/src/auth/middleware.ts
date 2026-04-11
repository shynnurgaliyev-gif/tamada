import type { FastifyRequest } from 'fastify';
import type { Db } from '../db';
import type { Account } from './repositories';
import { hashToken, findValidSession, findAccountById } from './repositories';

export async function getAuthAccount(db: Db, req: FastifyRequest): Promise<Account | null> {
  const auth = req.headers['authorization'];
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  if (!token) return null;
  const session = await findValidSession(db, hashToken(token));
  if (!session) return null;
  return findAccountById(db, session.account_id);
}
