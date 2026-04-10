import bcrypt from 'bcryptjs';
import type { Db } from '../db';
import type { WhatsAppProvider } from './whatsapp';
import * as repo from './repositories';

const CODE_EXPIRES_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const SESSION_EXPIRES_DAYS = 30;

type Err = { code: string; message: string };
type Fail = { ok: false; error: Err };
type Ok<T extends object = object> = { ok: true } & T;

function fail(code: string, message: string): Fail {
  return { ok: false, error: { code, message } };
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
}

// POST /auth/signup/request-code
export async function requestSignupCode(
  db: Db,
  wa: WhatsAppProvider,
  phone: string,
): Promise<Ok | Fail> {
  const existing = await repo.findAccountByPhone(db, phone);
  if (existing?.status === 'active') {
    return fail('PHONE_TAKEN', 'Phone already registered');
  }

  const code = repo.generateCode();
  await repo.createVerificationCode(db, {
    phone,
    purpose: 'signup',
    codeHash: repo.hashToken(code),
    expiresAt: new Date(Date.now() + CODE_EXPIRES_MS),
  });
  await wa.sendVerificationCode(phone, code, 'signup');

  return { ok: true };
}

// POST /auth/signup/confirm
export async function confirmSignup(
  db: Db,
  data: { phone: string; code: string; username: string; password: string },
  meta: { userAgent: string | null; ipAddress: string | null },
): Promise<Ok<{ token: string; account: repo.Account }> | Fail> {
  const verification = await repo.findValidVerificationCode(db, data.phone, 'signup');
  if (!verification) return fail('CODE_INVALID', 'Code expired or not found');

  const attempts = await repo.incrementVerificationAttempt(db, verification.id);
  if (attempts > MAX_ATTEMPTS) return fail('TOO_MANY_ATTEMPTS', 'Too many attempts');

  if (repo.hashToken(data.code) !== verification.code_hash) {
    return fail('CODE_INVALID', 'Invalid code');
  }

  await repo.markVerificationCodeUsed(db, verification.id);

  if (await repo.findAccountByUsername(db, data.username)) {
    return fail('USERNAME_TAKEN', 'Username already taken');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const account = await repo.createAccount(db, {
    username: data.username,
    phone: data.phone,
    passwordHash,
  });

  const token = repo.generateToken();
  await repo.createSession(db, {
    accountId: account.id,
    tokenHash: repo.hashToken(token),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: sessionExpiresAt(),
  });

  return { ok: true, token, account };
}

// POST /auth/login
export async function login(
  db: Db,
  data: { username: string; password: string },
  meta: { userAgent: string | null; ipAddress: string | null },
): Promise<Ok<{ token: string; account: repo.Account }> | Fail> {
  const account = await repo.findAccountByUsername(db, data.username);
  if (!account) return fail('INVALID_CREDENTIALS', 'Invalid username or password');
  if (account.status !== 'active') return fail('ACCOUNT_INACTIVE', 'Account is not active');

  const valid = await bcrypt.compare(data.password, account.password_hash);
  if (!valid) return fail('INVALID_CREDENTIALS', 'Invalid username or password');

  const token = repo.generateToken();
  await repo.createSession(db, {
    accountId: account.id,
    tokenHash: repo.hashToken(token),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt: sessionExpiresAt(),
  });

  return { ok: true, token, account };
}

// POST /auth/logout
export async function logout(db: Db, tokenHash: string): Promise<void> {
  const session = await repo.findValidSession(db, tokenHash);
  if (session) await repo.revokeSession(db, session.id);
}

// POST /auth/password/reset/request-code
export async function requestPasswordResetCode(
  db: Db,
  wa: WhatsAppProvider,
  phone: string,
): Promise<Ok> {
  const account = await repo.findAccountByPhone(db, phone);
  // Don't reveal whether phone exists
  if (!account || account.status !== 'active') return { ok: true };

  const code = repo.generateCode();
  await repo.createVerificationCode(db, {
    phone,
    purpose: 'reset_password',
    codeHash: repo.hashToken(code),
    expiresAt: new Date(Date.now() + CODE_EXPIRES_MS),
  });
  await wa.sendVerificationCode(phone, code, 'reset_password');

  return { ok: true };
}

// POST /auth/password/reset/confirm
export async function confirmPasswordReset(
  db: Db,
  data: { phone: string; code: string; newPassword: string },
): Promise<Ok | Fail> {
  const verification = await repo.findValidVerificationCode(db, data.phone, 'reset_password');
  if (!verification) return fail('CODE_INVALID', 'Code expired or not found');

  const attempts = await repo.incrementVerificationAttempt(db, verification.id);
  if (attempts > MAX_ATTEMPTS) return fail('TOO_MANY_ATTEMPTS', 'Too many attempts');

  if (repo.hashToken(data.code) !== verification.code_hash) {
    return fail('CODE_INVALID', 'Invalid code');
  }

  await repo.markVerificationCodeUsed(db, verification.id);

  const account = await repo.findAccountByPhone(db, data.phone);
  if (!account) return fail('ACCOUNT_NOT_FOUND', 'Account not found');

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await repo.updateAccountPassword(db, account.id, passwordHash);
  await repo.revokeAllSessionsForAccount(db, account.id);

  return { ok: true };
}

// GET /auth/me
export async function getMe(
  db: Db,
  tokenHash: string,
): Promise<Ok<{ account: repo.Account }> | Fail> {
  const session = await repo.findValidSession(db, tokenHash);
  if (!session) return fail('UNAUTHORIZED', 'Invalid or expired session');

  const account = await repo.findAccountById(db, session.account_id);
  if (!account) return fail('ACCOUNT_NOT_FOUND', 'Account not found');

  return { ok: true, account };
}
