/* ── linkUrl ──────────────────────────────────────────────────────────────────
   Client-side URL helpers for provider links.

   Mirrors the server-side `normalizeLinkUrl` (apps/api/src/providers/
   normalizeLinkUrl.ts) so client and server agree on what's accepted. Keep
   logic in sync if either side changes.
────────────────────────────────────────────────────────────────────────────── */

export type NormalizeLinkUrlResult =
  | { ok: true;  url: string }
  | { ok: false; error: string };

const SCHEME_RE      = /^[a-z][a-z0-9+\-.]*:\/\//i;
const HTTP_FRAG_RE   = /https?:\/\/\S+/gi;
const TRAILING_PUNCT = /[)\].,;!?]+$/;

export function normalizeLinkUrl(input: unknown): NormalizeLinkUrlResult {
  if (typeof input !== 'string') return { ok: false, error: 'URL обязателен' };

  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'URL обязателен' };

  const matches = trimmed.match(HTTP_FRAG_RE);
  let candidate = matches && matches.length > 0
    ? matches[matches.length - 1]!
    : trimmed;

  candidate = candidate.replace(TRAILING_PUNCT, '');

  if (/\s/.test(candidate)) return { ok: false, error: 'URL не должен содержать пробелы' };

  if (!SCHEME_RE.test(candidate)) candidate = `https://${candidate}`;

  let parsed: URL;
  try { parsed = new URL(candidate); }
  catch { return { ok: false, error: 'Некорректный URL' }; }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Разрешены только http(s) ссылки' };
  }

  const host = parsed.hostname;
  if (!host || (!host.includes('.') && host !== 'localhost')) {
    return { ok: false, error: 'Некорректный домен' };
  }

  return { ok: true, url: parsed.toString() };
}

/* Soft cleanup for input/paste handlers — extracts the last http(s):// fragment
   if one is present, otherwise returns the trimmed input as-is. Does NOT
   validate; pair with `normalizeLinkUrl` before submit. */
export function cleanPastedUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  const matches = trimmed.match(HTTP_FRAG_RE);
  if (matches && matches.length > 0) {
    return matches[matches.length - 1]!.replace(TRAILING_PUNCT, '');
  }
  return trimmed;
}

/* Defensive read-side helper: turn whatever is in the DB (incl. legacy
   "https://Label https://real.url" garbage) into a usable href. Returns
   `null` if no valid URL can be extracted. */
export function safeLinkHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const r = normalizeLinkUrl(raw);
  return r.ok ? r.url : null;
}
