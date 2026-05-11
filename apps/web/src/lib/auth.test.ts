import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  authHeaders,
  clearMiniAuthToken,
  clearSessionToken,
  combinedAuthHeaders,
  getMiniAuthToken,
  getSessionToken,
  isMiniAuthTokenValid,
  isSessionExpired,
  miniAuthHeaders,
  setMiniAuthToken,
  setSessionToken,
} from './auth';

/* ── localStorage mock ────────────────────────────────────────────────────── */

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; },
  } satisfies Storage;
}

beforeEach(() => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('localStorage', makeLocalStorage());
});

/* ── Session token ────────────────────────────────────────────────────────── */

describe('session token', () => {
  it('getSessionToken returns empty string when not set', () => {
    expect(getSessionToken()).toBe('');
  });

  it('setSessionToken stores and getSessionToken returns the value', () => {
    setSessionToken('abc123');
    expect(getSessionToken()).toBe('abc123');
  });

  it('clearSessionToken removes the value', () => {
    setSessionToken('abc123');
    clearSessionToken();
    expect(getSessionToken()).toBe('');
  });

  it('setSessionToken stores expires_at when provided', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    setSessionToken('abc', future);
    expect(isSessionExpired()).toBe(false);
  });

  it('clearSessionToken removes expires_at too', () => {
    setSessionToken('abc', new Date(Date.now() + 60_000).toISOString());
    clearSessionToken();
    expect(isSessionExpired()).toBe(false); // no expiry → false
  });
});

describe('isSessionExpired', () => {
  it('false when no expires_at set', () => {
    expect(isSessionExpired()).toBe(false);
  });

  it('true when expires_at is in the past', () => {
    setSessionToken('t', new Date(Date.now() - 1000).toISOString());
    expect(isSessionExpired()).toBe(true);
  });

  it('false when expires_at is in the future', () => {
    setSessionToken('t', new Date(Date.now() + 60_000).toISOString());
    expect(isSessionExpired()).toBe(false);
  });
});

/* ── authHeaders ──────────────────────────────────────────────────────────── */

describe('authHeaders', () => {
  it('returns empty object when no session token', () => {
    expect(authHeaders()).toEqual({});
  });

  it('returns Bearer header when token is set', () => {
    setSessionToken('xyz');
    expect(authHeaders()).toEqual({ Authorization: 'Bearer xyz' });
  });
});

/* ── Mini auth token ──────────────────────────────────────────────────────── */

describe('mini auth token', () => {
  it('getMiniAuthToken returns empty string when not set', () => {
    expect(getMiniAuthToken()).toBe('');
  });

  it('setMiniAuthToken stores token and expires_at', () => {
    setMiniAuthToken('mini-abc', '2030-01-01T00:00:00Z');
    expect(getMiniAuthToken()).toBe('mini-abc');
  });

  it('setMiniAuthToken accepts null expires_at', () => {
    setMiniAuthToken('mini-abc', null);
    expect(getMiniAuthToken()).toBe('mini-abc');
  });

  it('clearMiniAuthToken removes both token and expires_at', () => {
    setMiniAuthToken('mini-abc', '2030-01-01T00:00:00Z');
    clearMiniAuthToken();
    expect(getMiniAuthToken()).toBe('');
    // After clear, token-valid check must be false (no expires)
    expect(isMiniAuthTokenValid()).toBe(false);
  });
});

/* ── isMiniAuthTokenValid ─────────────────────────────────────────────────── */

describe('isMiniAuthTokenValid', () => {
  it('false when no expires_at', () => {
    expect(isMiniAuthTokenValid()).toBe(false);
  });

  it('false when expires_at is in the past', () => {
    setMiniAuthToken('t', new Date(Date.now() - 60_000).toISOString());
    expect(isMiniAuthTokenValid()).toBe(false);
  });

  it('false within the 60-second expiry buffer', () => {
    setMiniAuthToken('t', new Date(Date.now() + 30_000).toISOString());
    expect(isMiniAuthTokenValid()).toBe(false);
  });

  it('true when expires_at is well in the future', () => {
    setMiniAuthToken('t', new Date(Date.now() + 5 * 60_000).toISOString());
    expect(isMiniAuthTokenValid()).toBe(true);
  });
});

/* ── miniAuthHeaders ──────────────────────────────────────────────────────── */

describe('miniAuthHeaders', () => {
  it('empty when no mini token', () => {
    expect(miniAuthHeaders()).toEqual({});
  });

  it('has X-Mini-Auth when set', () => {
    setMiniAuthToken('mini-tok');
    expect(miniAuthHeaders()).toEqual({ 'X-Mini-Auth': 'mini-tok' });
  });
});

/* ── combinedAuthHeaders ──────────────────────────────────────────────────── */

describe('combinedAuthHeaders', () => {
  it('empty when no tokens', () => {
    expect(combinedAuthHeaders()).toEqual({});
  });

  it('only Bearer when only session token set', () => {
    setSessionToken('s');
    expect(combinedAuthHeaders()).toEqual({ Authorization: 'Bearer s' });
  });

  it('only X-Mini-Auth when only mini token set', () => {
    setMiniAuthToken('m');
    expect(combinedAuthHeaders()).toEqual({ 'X-Mini-Auth': 'm' });
  });

  it('both headers when both tokens set', () => {
    setSessionToken('s');
    setMiniAuthToken('m');
    expect(combinedAuthHeaders()).toEqual({
      Authorization: 'Bearer s',
      'X-Mini-Auth': 'm',
    });
  });
});
