/* ── normalizeLinkUrl ──────────────────────────────────────────────────────────
   Strict URL normalization for provider_links.url.

   Solves a real bug: users pasting from 2GIS / messengers often copy
   "Demokrat https://2gis.kz/…" (org name + URL). The previous logic blindly
   prefixed "https://" when no scheme was found at the start, producing
   "https://Demokrat https://2gis.kz/…" — saved verbatim into the DB and broken
   forever after.

   Rules:
     1. Trim outer whitespace.
     2. If the input contains an http(s):// substring, take the LAST one —
        anything before it is presumed to be a pasted label/title.
     3. Strip trailing punctuation that commonly tails along on copy
        (closing brackets, comma, period, semicolon, !, ?).
     4. Reject if any whitespace remains inside.
     5. Add https:// when no scheme is present.
     6. Parse with the URL constructor; reject anything that doesn't.
     7. Allow only http: and https:.
     8. Hostname must contain a dot (or be `localhost` for local dev).
────────────────────────────────────────────────────────────────────────────── */

export type NormalizeLinkUrlResult =
  | { ok: true;  url: string }
  | { ok: false; error: string };

const SCHEME_RE       = /^[a-z][a-z0-9+\-.]*:\/\//i;
const HTTP_FRAG_RE    = /https?:\/\/\S+/gi;
const TRAILING_PUNCT  = /[)\].,;!?]+$/;

export function normalizeLinkUrl(input: unknown): NormalizeLinkUrlResult {
  if (typeof input !== 'string') return { ok: false, error: 'URL обязателен' };

  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'URL обязателен' };

  // Pull last http(s):// fragment if present (handles "Label https://…" pastes).
  const matches = trimmed.match(HTTP_FRAG_RE);
  let candidate = matches && matches.length > 0
    ? matches[matches.length - 1]!
    : trimmed;

  candidate = candidate.replace(TRAILING_PUNCT, '');

  if (/\s/.test(candidate)) {
    return { ok: false, error: 'URL не должен содержать пробелы' };
  }

  if (!SCHEME_RE.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: 'Некорректный URL' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'Разрешены только http(s) ссылки' };
  }

  const host = parsed.hostname;
  if (!host || (!host.includes('.') && host !== 'localhost')) {
    return { ok: false, error: 'Некорректный домен' };
  }

  return { ok: true, url: parsed.toString() };
}
