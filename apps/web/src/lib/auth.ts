/* ── auth — token storage helpers ─────────────────────────────────────────────
   Centralized accessors for both auth tokens:
     · session_token        — issued by /auth/login (web flow)
     · mini_auth_token      — issued by /telegram/mini/auth (Mini App flow)
   Used everywhere instead of inline `localStorage.getItem(...)` so future auth
   changes (refresh tokens, cookies, Telegram-first onboarding) need to touch
   only this file.
────────────────────────────────────────────────────────────────────────────── */

const SESSION_KEY      = 'session_token';
const MINI_KEY         = 'mini_auth_token';
const MINI_EXPIRES_KEY = 'mini_auth_expires_at';

/* ── Session token (web) ─────────────────────────────────────────────────── */

export function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(SESSION_KEY) ?? '';
}

export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

/* ── Mini auth token (Telegram Mini App) ─────────────────────────────────── */

export function getMiniAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(MINI_KEY) ?? '';
}

export function setMiniAuthToken(token: string, expiresAt?: string | null): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MINI_KEY, token);
  if (expiresAt) localStorage.setItem(MINI_EXPIRES_KEY, expiresAt);
}

export function clearMiniAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(MINI_KEY);
  localStorage.removeItem(MINI_EXPIRES_KEY);
}

/** True if mini token exists and won't expire within the next 60 seconds. */
export function isMiniAuthTokenValid(): boolean {
  if (typeof window === 'undefined') return false;
  const exp = localStorage.getItem(MINI_EXPIRES_KEY);
  if (!exp) return false;
  return new Date(exp).getTime() > Date.now() + 60_000;
}

/* ── Header builders ─────────────────────────────────────────────────────── */

/** Bearer auth header, or empty object if no session token. */
export function authHeaders(): Record<string, string> {
  const t = getSessionToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** X-Mini-Auth header, or empty object if no mini token. */
export function miniAuthHeaders(): Record<string, string> {
  const t = getMiniAuthToken();
  return t ? { 'X-Mini-Auth': t } : {};
}

/** Both Bearer and X-Mini-Auth headers; either or both may be empty. */
export function combinedAuthHeaders(): Record<string, string> {
  return { ...authHeaders(), ...miniAuthHeaders() };
}
