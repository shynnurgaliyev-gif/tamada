/* ── auth — session token storage helpers ────────────────────────────────────
   Centralized accessors for the web session token. Used everywhere instead
   of inline `localStorage.getItem('session_token')` so future auth changes
   (refresh tokens, cookies, Telegram-first flow) need to touch only this file.
   Mini app has its own additional `mini_auth_token` — see `mini/hooks/useMiniApp`.
────────────────────────────────────────────────────────────────────────────── */

const TOKEN_KEY = 'session_token';

export function getSessionToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export function setSessionToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearSessionToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
}

/** Bearer auth header, or empty object if no token. */
export function authHeaders(): Record<string, string> {
  const t = getSessionToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
