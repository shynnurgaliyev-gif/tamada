import type { Db } from '../db';
import crypto from 'crypto';

export type TelegramRole = 'owner' | 'assistant' | 'spouse' | 'child' | 'partner' | 'other';
export type TelegramAccountStatus = 'pending' | 'linked' | 'unlinked' | 'blocked';
export type ActorType = 'web' | 'telegram';

export type TelegramAccount = {
  id: string;
  provider_id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_role: TelegramRole;
  status: TelegramAccountStatus;
  linked_at: Date | null;
  unlinked_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TelegramLinkToken = {
  id: string;
  provider_id: string;
  token_hash: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

// ---- Link Tokens ----

export function generateLinkToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createLinkToken(db: Db, providerId: string): Promise<TelegramLinkToken> {
  const token = generateLinkToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  const rows = await db<TelegramLinkToken[]>`
    INSERT INTO telegram_link_tokens (provider_id, token_hash, expires_at)
    VALUES (${providerId}, ${tokenHash}, ${expiresAt})
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create link token');
  return { ...rows[0], id: token }; // return raw token as id temporarily
}

export async function findValidLinkToken(db: Db, token: string): Promise<TelegramLinkToken | null> {
  const tokenHash = hashToken(token);
  const rows = await db<TelegramLinkToken[]>`
    SELECT * FROM telegram_link_tokens
    WHERE token_hash = ${tokenHash}
      AND used_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function markTokenUsed(db: Db, tokenHash: string): Promise<void> {
  await db`UPDATE telegram_link_tokens SET used_at = NOW() WHERE token_hash = ${tokenHash}`;
}

// ---- Telegram Accounts ----

export async function findLinkedAccountsByProvider(db: Db, providerId: string): Promise<TelegramAccount[]> {
  return db<TelegramAccount[]>`
    SELECT * FROM telegram_accounts
    WHERE provider_id = ${providerId} AND status = 'linked'
    ORDER BY created_at ASC
  `;
}

export async function findAllAccountsByProvider(db: Db, providerId: string): Promise<TelegramAccount[]> {
  return db<TelegramAccount[]>`
    SELECT * FROM telegram_accounts
    WHERE provider_id = ${providerId}
    ORDER BY created_at ASC
  `;
}

export async function findAccountByTelegramUserId(db: Db, telegramUserId: number): Promise<TelegramAccount | null> {
  const rows = await db<TelegramAccount[]>`
    SELECT * FROM telegram_accounts WHERE telegram_user_id = ${telegramUserId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findLinkedAccountByTelegramUserId(db: Db, telegramUserId: number): Promise<TelegramAccount | null> {
  const rows = await db<TelegramAccount[]>`
    SELECT * FROM telegram_accounts
    WHERE telegram_user_id = ${telegramUserId} AND status = 'linked'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function countLinkedAccounts(db: Db, providerId: string): Promise<number> {
  const rows = await db<{ count: string }[]>`
    SELECT COUNT(*) as count FROM telegram_accounts
    WHERE provider_id = ${providerId} AND status = 'linked'
  `;
  return parseInt(rows[0]?.count ?? '0', 10);
}

export async function createTelegramAccount(db: Db, data: {
  providerId: string;
  telegramUserId: number;
  telegramUsername?: string | undefined;
  telegramFirstName?: string | undefined;
  telegramLastName?: string | undefined;
  role: TelegramRole;
}): Promise<TelegramAccount> {
  const rows = await db<TelegramAccount[]>`
    INSERT INTO telegram_accounts
      (provider_id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, telegram_role, status, linked_at)
    VALUES
      (${data.providerId}, ${data.telegramUserId}, ${data.telegramUsername ?? null},
       ${data.telegramFirstName ?? null}, ${data.telegramLastName ?? null},
       ${data.role}, 'linked', NOW())
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create telegram account');
  return rows[0];
}

export async function relinkTelegramAccount(db: Db, id: string, data: {
  providerId: string;
  telegramUsername?: string | undefined;
  telegramFirstName?: string | undefined;
  telegramLastName?: string | undefined;
  role: TelegramRole;
}): Promise<TelegramAccount | null> {
  const rows = await db<TelegramAccount[]>`
    UPDATE telegram_accounts SET
      provider_id = ${data.providerId},
      telegram_username = ${data.telegramUsername ?? null},
      telegram_first_name = ${data.telegramFirstName ?? null},
      telegram_last_name = ${data.telegramLastName ?? null},
      telegram_role = ${data.role},
      status = 'linked',
      linked_at = NOW(),
      unlinked_at = NULL
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function unlinkTelegramAccount(db: Db, id: string): Promise<void> {
  await db`
    UPDATE telegram_accounts SET status = 'unlinked', unlinked_at = NOW() WHERE id = ${id}
  `;
}

// ---- Activity Logs ----

export async function logActivity(db: Db, data: {
  providerId: string;
  actorType: ActorType;
  actorAccountId?: string | undefined;
  telegramAccountId?: string | undefined;
  actionType: string;
  targetType?: string | undefined;
  targetId?: string | undefined;
  payloadJson?: object | undefined;
}): Promise<void> {
  await db`
    INSERT INTO activity_logs
      (provider_id, actor_type, actor_account_id, telegram_account_id, action_type, target_type, target_id, payload_json)
    VALUES
      (${data.providerId}, ${data.actorType}, ${data.actorAccountId ?? null},
       ${data.telegramAccountId ?? null}, ${data.actionType},
       ${data.targetType ?? null}, ${data.targetId ?? null},
       ${data.payloadJson ? JSON.stringify(data.payloadJson) : null})
  `;
}
