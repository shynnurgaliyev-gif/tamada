-- ── Migration 026: normalize provider_links.url ──────────────────────────────
-- Cleans up rows that were saved with a label/title prefix glued to the URL
-- (e.g. "https://Demokrat https://2gis.kz/..."). The previous API logic blindly
-- prefixed `https://` when no scheme was found at the start of the trimmed
-- string, producing this kind of garbage when users pasted "<title> <url>"
-- from 2GIS / Telegram previews.
--
-- Strategy:
--   1. For rows containing whitespace AND at least one http(s):// substring,
--      replace url with the LAST http(s):// fragment found (and strip trailing
--      punctuation that tags along on copy).
--   2. For rows that contain whitespace but no recoverable http(s):// at all,
--      delete them — nothing to salvage.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

WITH all_matches AS (
  SELECT
    pl.id,
    m.match[1]                                                      AS frag,
    m.ord
  FROM provider_links pl
  CROSS JOIN LATERAL regexp_matches(pl.url, 'https?://\S+', 'g')
    WITH ORDINALITY AS m(match, ord)
  WHERE pl.url ~ '\s'
    AND pl.url ~* 'https?://'
),
last_per_row AS (
  SELECT DISTINCT ON (id)
    id,
    regexp_replace(frag, '[)\].,;!?]+$', '') AS clean_url
  FROM all_matches
  ORDER BY id, ord DESC
)
UPDATE provider_links pl
SET    url = lpr.clean_url
FROM   last_per_row lpr
WHERE  pl.id = lpr.id
  AND  pl.url <> lpr.clean_url;

DELETE FROM provider_links
WHERE url ~ '\s'
  AND url !~* 'https?://';

COMMIT;
