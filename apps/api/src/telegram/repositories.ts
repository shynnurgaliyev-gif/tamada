import type { Db } from '../db';
import crypto from 'crypto';

export type TelegramRole = 'owner' | 'assistant' | 'manager' | 'spouse' | 'child' | 'partner' | 'other';
export type TelegramAccountStatus = 'pending' | 'linked' | 'unlinked' | 'blocked';
export type TelegramProfileAccessStatus = 'active' | 'revoked' | 'expired';
export type ActorType = 'web' | 'telegram';

export type TelegramAccount = {
  id: string;
  provider_id: string | null;
  account_id: string | null;
  telegram_user_id: number;
  telegram_username: string | null;
  telegram_first_name: string | null;
  telegram_last_name: string | null;
  telegram_role: TelegramRole;
  is_primary: boolean;
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
  invite_role: TelegramRole;
  created_by_account_id: string | null;
  expires_at: Date;
  used_at: Date | null;
  categories_scope: string[] | null;
  created_at: Date;
};

export type TelegramProfileAccess = {
  id: string;
  telegram_account_id: string;
  provider_id: string;
  role: TelegramRole;
  status: TelegramProfileAccessStatus;
  granted_by_account_id: string | null;
  granted_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type TelegramMiniSession = {
  id: string;
  telegram_account_id: string;
  session_token_hash: string;
  telegram_user_id: number;
  role: TelegramRole;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};

export type ActivityLogView = {
  id: string;
  provider_id: string;
  actor_type: ActorType;
  actor_account_id: string | null;
  telegram_account_id: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  payload_json: Record<string, unknown> | null;
  created_at: Date;
  actor_name: string | null;
  actor_role: TelegramRole | null;
  actor_telegram_username: string | null;
};

export type TelegramBotSession = {
  telegram_account_id: string;
  active_provider_id: string | null;
  pending_booking: Record<string, unknown> | null;
  pending_expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

// ---- Link Tokens ----

export function generateLinkToken(): string {
  return crypto.randomBytes(24).toString('base64url');
}

export function generateMiniSessionToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function createLinkToken(
  db: Db,
  providerId: string,
  role: TelegramRole = 'owner',
  createdByAccountId?: string,
  categoriesScope?: string[] | null,
): Promise<TelegramLinkToken> {
  const token = generateLinkToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  const scope = categoriesScope && categoriesScope.length > 0 ? categoriesScope : null;
  const rows = await db<TelegramLinkToken[]>`
    INSERT INTO telegram_link_tokens (provider_id, token_hash, invite_role, created_by_account_id, expires_at, categories_scope)
    VALUES (${providerId}, ${tokenHash}, ${role}, ${createdByAccountId ?? null}, ${expiresAt}, ${scope})
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
    SELECT DISTINCT ta.* FROM telegram_accounts ta
    JOIN providers p ON p.id = ${providerId}
    LEFT JOIN telegram_profile_access tpa
      ON tpa.telegram_account_id = ta.id
      AND tpa.provider_id = ${providerId}
      AND tpa.status = 'active'
    WHERE ta.status = 'linked'
      AND (
        tpa.id IS NOT NULL
        OR (ta.account_id = p.account_id AND ta.is_primary = TRUE AND ta.telegram_role = 'owner')
      )
    ORDER BY ta.created_at ASC
  `;
}

export async function findAllAccountsByProvider(db: Db, providerId: string): Promise<TelegramAccount[]> {
  return db<TelegramAccount[]>`
    SELECT DISTINCT ta.* FROM telegram_accounts ta
    JOIN providers p ON p.id = ${providerId}
    LEFT JOIN telegram_profile_access tpa
      ON tpa.telegram_account_id = ta.id
      AND tpa.provider_id = ${providerId}
      AND tpa.status = 'active'
    WHERE tpa.id IS NOT NULL
      OR (ta.account_id = p.account_id AND ta.is_primary = TRUE AND ta.telegram_role = 'owner')
    ORDER BY ta.created_at ASC
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

export async function findTelegramAccountById(db: Db, id: string): Promise<TelegramAccount | null> {
  const rows = await db<TelegramAccount[]>`
    SELECT * FROM telegram_accounts
    WHERE id = ${id} AND status = 'linked'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function hasPrimaryTelegramOwner(db: Db, accountId: string): Promise<boolean> {
  const rows = await db<{ count: string }[]>`
    SELECT COUNT(*) as count FROM telegram_accounts
    WHERE account_id = ${accountId}
      AND is_primary = TRUE
      AND telegram_role = 'owner'
      AND status = 'linked'
  `;
  return parseInt(rows[0]?.count ?? '0', 10) > 0;
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
  accountId: string;
  telegramUserId: number;
  telegramUsername?: string | undefined;
  telegramFirstName?: string | undefined;
  telegramLastName?: string | undefined;
  role: TelegramRole;
  isPrimary?: boolean | undefined;
}): Promise<TelegramAccount> {
  const rows = await db<TelegramAccount[]>`
    INSERT INTO telegram_accounts
      (provider_id, account_id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, telegram_role, is_primary, status, linked_at)
    VALUES
      (${data.providerId}, ${data.accountId}, ${data.telegramUserId}, ${data.telegramUsername ?? null},
       ${data.telegramFirstName ?? null}, ${data.telegramLastName ?? null},
       ${data.role}, ${data.isPrimary ?? false}, 'linked', NOW())
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create telegram account');
  return rows[0];
}

export async function createOwnerTelegramAccountWithoutProvider(db: Db, data: {
  accountId: string;
  telegramUserId: number;
  telegramUsername?: string | undefined;
  telegramFirstName?: string | undefined;
  telegramLastName?: string | undefined;
}): Promise<TelegramAccount> {
  const rows = await db<TelegramAccount[]>`
    INSERT INTO telegram_accounts
      (provider_id, account_id, telegram_user_id, telegram_username, telegram_first_name, telegram_last_name, telegram_role, is_primary, status, linked_at)
    VALUES
      (NULL, ${data.accountId}, ${data.telegramUserId}, ${data.telegramUsername ?? null},
       ${data.telegramFirstName ?? null}, ${data.telegramLastName ?? null},
       'owner', TRUE, 'linked', NOW())
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create telegram account');
  return rows[0];
}

export async function relinkOwnerTelegramAccountWithoutProvider(db: Db, id: string, data: {
  accountId: string;
  telegramUsername?: string | undefined;
  telegramFirstName?: string | undefined;
  telegramLastName?: string | undefined;
}): Promise<TelegramAccount | null> {
  const rows = await db<TelegramAccount[]>`
    UPDATE telegram_accounts SET
      provider_id = NULL,
      account_id = ${data.accountId},
      telegram_username = ${data.telegramUsername ?? null},
      telegram_first_name = ${data.telegramFirstName ?? null},
      telegram_last_name = ${data.telegramLastName ?? null},
      telegram_role = 'owner',
      is_primary = TRUE,
      status = 'linked',
      linked_at = NOW(),
      unlinked_at = NULL
    WHERE id = ${id}
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function relinkTelegramAccount(db: Db, id: string, data: {
  providerId: string;
  accountId: string;
  telegramUsername?: string | undefined;
  telegramFirstName?: string | undefined;
  telegramLastName?: string | undefined;
  role: TelegramRole;
  isPrimary?: boolean | undefined;
}): Promise<TelegramAccount | null> {
  const rows = await db<TelegramAccount[]>`
    UPDATE telegram_accounts SET
      provider_id = ${data.providerId},
      account_id = ${data.accountId},
      telegram_username = ${data.telegramUsername ?? null},
      telegram_first_name = ${data.telegramFirstName ?? null},
      telegram_last_name = ${data.telegramLastName ?? null},
      telegram_role = ${data.role},
      is_primary = ${data.isPrimary ?? false},
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
  await db`
    UPDATE telegram_profile_access
    SET status = 'revoked', revoked_at = NOW()
    WHERE telegram_account_id = ${id}
      AND status = 'active'
  `.catch(() => null);
}

export async function upsertProfileAccess(db: Db, data: {
  telegramAccountId: string;
  providerId: string;
  role: TelegramRole;
  grantedByAccountId?: string | undefined;
}): Promise<TelegramProfileAccess> {
  const rows = await db<TelegramProfileAccess[]>`
    INSERT INTO telegram_profile_access
      (telegram_account_id, provider_id, role, status, granted_by_account_id, granted_at)
    VALUES
      (${data.telegramAccountId}, ${data.providerId}, ${data.role}, 'active',
       ${data.grantedByAccountId ?? null}, NOW())
    ON CONFLICT (telegram_account_id, provider_id) DO UPDATE SET
      role = EXCLUDED.role,
      status = 'active',
      granted_by_account_id = EXCLUDED.granted_by_account_id,
      granted_at = EXCLUDED.granted_at,
      revoked_at = NULL,
      updated_at = NOW()
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to upsert telegram profile access');
  return rows[0];
}

export async function findActiveProfileAccess(
  db: Db,
  telegramAccountId: string,
  providerId: string,
): Promise<TelegramProfileAccess | null> {
  const rows = await db<TelegramProfileAccess[]>`
    SELECT * FROM telegram_profile_access
    WHERE telegram_account_id = ${telegramAccountId}
      AND provider_id = ${providerId}
      AND status = 'active'
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findAccessibleProviderIdsForTelegramAccount(
  db: Db,
  tgAccount: TelegramAccount,
): Promise<string[]> {
  if (tgAccount.is_primary && tgAccount.account_id) {
    const rows = await db<Array<{ id: string }>>`
      SELECT id FROM providers
      WHERE account_id = ${tgAccount.account_id}
        AND archived_at IS NULL
        AND pending_delete_at IS NULL
      ORDER BY created_at ASC
    `;
    return rows.map(row => row.id);
  }

  const rows = await db<Array<{ id: string }>>`
    SELECT p.id
    FROM providers p
    JOIN telegram_profile_access tpa ON tpa.provider_id = p.id
    WHERE tpa.telegram_account_id = ${tgAccount.id}
      AND tpa.status = 'active'
      AND p.archived_at IS NULL
      AND p.pending_delete_at IS NULL
    ORDER BY p.created_at ASC
  `;
  return rows.map(row => row.id);
}

export async function revokeProfileAccess(db: Db, telegramAccountId: string, providerId: string): Promise<void> {
  await db`
    UPDATE telegram_profile_access
    SET status = 'revoked', revoked_at = NOW()
    WHERE telegram_account_id = ${telegramAccountId}
      AND provider_id = ${providerId}
      AND status = 'active'
  `;
}

export async function revokeAssistantAccessForProvider(db: Db, providerId: string): Promise<void> {
  await db`
    UPDATE telegram_profile_access
    SET status = 'revoked', revoked_at = NOW()
    WHERE provider_id = ${providerId}
      AND status = 'active'
      AND role <> 'owner'
  `;
}

export async function revokeLinkTokensForProvider(db: Db, providerId: string): Promise<void> {
  await db`
    UPDATE telegram_link_tokens
    SET used_at = NOW()
    WHERE provider_id = ${providerId}
      AND used_at IS NULL
  `;
}

export async function replacePrimaryTelegramOwner(db: Db, accountId: string, telegramAccountId: string): Promise<TelegramAccount | null> {
  await db`
    UPDATE telegram_accounts
    SET is_primary = FALSE
    WHERE account_id = ${accountId}
      AND is_primary = TRUE
      AND id <> ${telegramAccountId}
  `;
  const rows = await db<TelegramAccount[]>`
    UPDATE telegram_accounts
    SET is_primary = TRUE,
        telegram_role = 'owner',
        status = 'linked',
        linked_at = COALESCE(linked_at, NOW()),
        unlinked_at = NULL
    WHERE id = ${telegramAccountId}
      AND account_id = ${accountId}
      AND status = 'linked'
    RETURNING *
  `;
  return rows[0] ?? null;
}

export async function revokeAllProfileAccessForProvider(db: Db, providerId: string): Promise<void> {
  await db`
    UPDATE telegram_profile_access
    SET status = 'revoked', revoked_at = NOW()
    WHERE provider_id = ${providerId}
      AND status = 'active'
  `;
}

export async function revokeMiniSessionsForAccount(db: Db, accountId: string): Promise<void> {
  await db`
    UPDATE telegram_mini_sessions tms
    SET revoked_at = NOW()
    FROM telegram_accounts ta
    WHERE tms.telegram_account_id = ta.id
      AND ta.account_id = ${accountId}
      AND tms.revoked_at IS NULL
  `;
}

// ---- Mini App Sessions ----

export async function createMiniSession(db: Db, data: {
  telegramAccountId: string;
  telegramUserId: number;
  role: TelegramRole;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  await db`
    INSERT INTO telegram_mini_sessions
      (telegram_account_id, session_token_hash, telegram_user_id, role, expires_at)
    VALUES
      (${data.telegramAccountId}, ${data.tokenHash}, ${data.telegramUserId}, ${data.role}, ${data.expiresAt})
  `;
}

export async function findValidMiniSession(db: Db, tokenHash: string): Promise<TelegramMiniSession | null> {
  const rows = await db<TelegramMiniSession[]>`
    SELECT * FROM telegram_mini_sessions
    WHERE session_token_hash = ${tokenHash}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function revokeMiniSessionsForTelegramAccount(db: Db, telegramAccountId: string): Promise<void> {
  await db`
    UPDATE telegram_mini_sessions
    SET revoked_at = NOW()
    WHERE telegram_account_id = ${telegramAccountId}
      AND revoked_at IS NULL
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

export async function findActivityLogsByProvider(
  db: Db,
  providerId: string,
  category?: 'calendar' | 'team' | 'profile',
  limit = 50,
): Promise<ActivityLogView[]> {
  const calendarActions = ['calendar_created', 'calendar_updated', 'calendar_deleted'];
  const teamActions = [
    'assistant_invited',
    'assistant_revoked',
    'telegram_linked',
    'telegram_unlinked',
    'primary_telegram_changed',
  ];
  const profileActions = [
    'profile_archived',
    'profile_unarchived',
    'profile_pending_delete',
    'ownership_transfer_created',
    'ownership_transfer_accepted',
    'ownership_transfer_rejected',
  ];
  const actions = category === 'calendar'
    ? calendarActions
    : category === 'team'
      ? teamActions
      : category === 'profile'
        ? profileActions
        : null;

  return db<ActivityLogView[]>`
    SELECT al.*,
           COALESCE(
             NULLIF(CONCAT_WS(' ', ta.telegram_first_name, ta.telegram_last_name), ''),
             ta.telegram_username,
             actor_acc.username
           ) AS actor_name,
           ta.telegram_role AS actor_role,
           ta.telegram_username AS actor_telegram_username
    FROM activity_logs al
    LEFT JOIN telegram_accounts ta ON ta.id = al.telegram_account_id
    LEFT JOIN accounts actor_acc ON actor_acc.id = al.actor_account_id
    WHERE al.provider_id = ${providerId}
      ${actions ? db`AND al.action_type = ANY(${actions}::text[])` : db``}
    ORDER BY al.created_at DESC
    LIMIT ${Math.max(1, Math.min(limit, 100))}
  `;
}

export async function findBotSession(db: Db, telegramAccountId: string): Promise<TelegramBotSession | null> {
  const rows = await db<TelegramBotSession[]>`
    SELECT * FROM telegram_bot_sessions
    WHERE telegram_account_id = ${telegramAccountId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function setBotActiveProvider(
  db: Db,
  telegramAccountId: string,
  providerId: string,
): Promise<void> {
  await db`
    INSERT INTO telegram_bot_sessions (telegram_account_id, active_provider_id)
    VALUES (${telegramAccountId}, ${providerId})
    ON CONFLICT (telegram_account_id) DO UPDATE SET
      active_provider_id = EXCLUDED.active_provider_id,
      updated_at = NOW()
  `;
}

export async function setBotPendingBooking(
  db: Db,
  telegramAccountId: string,
  pendingBooking: object,
  expiresAt: Date,
): Promise<void> {
  await db`
    INSERT INTO telegram_bot_sessions (telegram_account_id, pending_booking, pending_expires_at)
    VALUES (${telegramAccountId}, ${JSON.stringify(pendingBooking)}, ${expiresAt})
    ON CONFLICT (telegram_account_id) DO UPDATE SET
      pending_booking = EXCLUDED.pending_booking,
      pending_expires_at = EXCLUDED.pending_expires_at,
      updated_at = NOW()
  `;
}

export async function clearBotPendingBooking(db: Db, telegramAccountId: string): Promise<void> {
  await db`
    UPDATE telegram_bot_sessions
    SET pending_booking = NULL,
        pending_expires_at = NULL,
        updated_at = NOW()
    WHERE telegram_account_id = ${telegramAccountId}
  `;
}
