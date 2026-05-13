-- Migration 028: Single-profile consolidation (additive prep)
-- Part of the multi-profile → single-profile-multi-category refactor.
-- See: docs/obsidian/proposal-single-profile.md
--
-- This migration is ADDITIVE ONLY. It adds new columns; existing code
-- continues to work unchanged. DROPs and UNIQUE constraints happen in
-- later migrations after backend code is updated.

-- ---- 1. Calendar entries: optional category tag ----
-- Used for (a) scope filtering — assistants only see entries matching their
-- categories_scope; (b) analytics group-by category.

ALTER TABLE calendar_entries
  ADD COLUMN IF NOT EXISTS category_tag TEXT;

CREATE INDEX IF NOT EXISTS idx_calendar_entries_category_tag
  ON calendar_entries(provider_id, category_tag)
  WHERE category_tag IS NOT NULL;

-- ---- 2. Telegram accounts: categories scope for assistants ----
-- NULL = full access (universal helper / owner). Array = scoped helper:
-- sees only calendar entries with matching category_tag and aggregated
-- busy/free for others.

ALTER TABLE telegram_accounts
  ADD COLUMN IF NOT EXISTS categories_scope TEXT[];

-- ---- 3. Comments for future devs ----

COMMENT ON COLUMN calendar_entries.category_tag IS
  'Optional category label for the entry (e.g. "DJ", "Тамада"). Used for assistant scope filtering and analytics.';

COMMENT ON COLUMN telegram_accounts.categories_scope IS
  'NULL = full access to provider. Array of category codes = assistant sees only matching calendar entries with full details (busy/free visible for all).';
