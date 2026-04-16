import type { FastifyRequest } from 'fastify';
import type { Db } from '../db';
import type { TelegramAccount } from './repositories';
import * as repo from './repositories';
import { hasMiniPermission, type MiniPermissionKey } from './permissions';

export type MiniSessionContext = {
  accountId: string;
  telegramAccount: TelegramAccount;
};

export async function getMiniSessionContext(
  db: Db,
  req: FastifyRequest,
  permission?: MiniPermissionKey,
): Promise<MiniSessionContext | null> {
  const header = req.headers['x-mini-auth'];
  const rawToken = Array.isArray(header) ? header[0] : header;
  if (!rawToken) return null;

  const session = await repo.findValidMiniSession(db, repo.hashToken(rawToken));
  if (!session) return null;
  if (permission && !hasMiniPermission(session.role, permission)) return null;

  const telegramAccount = await repo.findTelegramAccountById(db, session.telegram_account_id);
  if (!telegramAccount?.account_id || !telegramAccount.is_primary || telegramAccount.telegram_role !== 'owner') {
    return null;
  }

  return { accountId: telegramAccount.account_id, telegramAccount };
}
