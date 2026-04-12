import { createHash, randomBytes, randomInt } from 'crypto';
import type { Db } from '../db';

// ---- Helpers ----

export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateCode(): string {
  return randomInt(100000, 1000000).toString();
}

// ---- Account ----

export type AccountStatus = 'pending_verification' | 'active' | 'blocked';

export type Account = {
  id: string;
  username: string;
  phone: string;
  phone_verified_at: Date | null;
  password_hash: string;
  status: AccountStatus;
  created_at: Date;
  updated_at: Date;
};

export async function findAccountByUsername(db: Db, username: string): Promise<Account | null> {
  const rows = await db<Account[]>`SELECT * FROM accounts WHERE LOWER(username) = LOWER(${username}) LIMIT 1`;
  return rows[0] ?? null;
}

export async function findAccountByPhone(db: Db, phone: string): Promise<Account | null> {
  const rows = await db<Account[]>`SELECT * FROM accounts WHERE phone = ${phone} LIMIT 1`;
  return rows[0] ?? null;
}

export async function findAccountById(db: Db, id: string): Promise<Account | null> {
  const rows = await db<Account[]>`SELECT * FROM accounts WHERE id = ${id} LIMIT 1`;
  return rows[0] ?? null;
}

export async function createAccount(db: Db, data: {
  username: string;
  phone: string;
  passwordHash: string;
}): Promise<Account> {
  const rows = await db<Account[]>`
    INSERT INTO accounts (username, phone, password_hash, status, phone_verified_at)
    VALUES (${data.username}, ${data.phone}, ${data.passwordHash}, 'active', NOW())
    RETURNING *
  `;
  if (!rows[0]) throw new Error('Failed to create account');
  return rows[0];
}

export async function updateAccountPassword(db: Db, id: string, passwordHash: string): Promise<void> {
  await db`UPDATE accounts SET password_hash = ${passwordHash} WHERE id = ${id}`;
}

// ---- Verification Codes ----

export type VerificationPurpose = 'signup' | 'reset_password';

export type VerificationCode = {
  id: string;
  phone: string;
  purpose: VerificationPurpose;
  code_hash: string;
  expires_at: Date;
  used_at: Date | null;
  attempt_count: number;
  created_at: Date;
};

export async function createVerificationCode(db: Db, data: {
  phone: string;
  purpose: VerificationPurpose;
  codeHash: string;
  expiresAt: Date;
}): Promise<void> {
  await db`
    INSERT INTO phone_verification_codes (phone, purpose, code_hash, expires_at)
    VALUES (${data.phone}, ${data.purpose}, ${data.codeHash}, ${data.expiresAt})
  `;
}

export async function findValidVerificationCode(
  db: Db,
  phone: string,
  purpose: VerificationPurpose,
): Promise<VerificationCode | null> {
  const rows = await db<VerificationCode[]>`
    SELECT * FROM phone_verification_codes
    WHERE phone = ${phone}
      AND purpose = ${purpose}
      AND used_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function incrementVerificationAttempt(db: Db, id: string): Promise<number> {
  const rows = await db<{ attempt_count: number }[]>`
    UPDATE phone_verification_codes
    SET attempt_count = attempt_count + 1
    WHERE id = ${id}
    RETURNING attempt_count
  `;
  return rows[0]?.attempt_count ?? 0;
}

export async function markVerificationCodeUsed(db: Db, id: string): Promise<void> {
  await db`UPDATE phone_verification_codes SET used_at = NOW() WHERE id = ${id}`;
}

// ---- Sessions ----

export type AuthSession = {
  id: string;
  account_id: string;
  session_token_hash: string;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
};

export async function createSession(db: Db, data: {
  accountId: string;
  tokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiresAt: Date;
}): Promise<void> {
  await db`
    INSERT INTO auth_sessions (account_id, session_token_hash, user_agent, ip_address, expires_at)
    VALUES (${data.accountId}, ${data.tokenHash}, ${data.userAgent}, ${data.ipAddress}, ${data.expiresAt})
  `;
}

export async function findValidSession(db: Db, tokenHash: string): Promise<AuthSession | null> {
  const rows = await db<AuthSession[]>`
    SELECT * FROM auth_sessions
    WHERE session_token_hash = ${tokenHash}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function revokeSession(db: Db, id: string): Promise<void> {
  await db`UPDATE auth_sessions SET revoked_at = NOW() WHERE id = ${id}`;
}

export async function revokeAllSessionsForAccount(db: Db, accountId: string): Promise<void> {
  await db`
    UPDATE auth_sessions SET revoked_at = NOW()
    WHERE account_id = ${accountId} AND revoked_at IS NULL
  `;
}

export async function deleteAllSessionsForAccount(db: Db, accountId: string): Promise<void> {
  await db`DELETE FROM auth_sessions WHERE account_id = ${accountId}`;
}

export async function deleteVerificationCodesByPhone(db: Db, phone: string): Promise<void> {
  await db`DELETE FROM phone_verification_codes WHERE phone = ${phone}`;
}

export async function deleteAccount(db: Db, id: string): Promise<void> {
  await db`DELETE FROM accounts WHERE id = ${id}`;
}
