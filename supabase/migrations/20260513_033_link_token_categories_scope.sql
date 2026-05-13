-- Migration 033: Categories scope on link tokens (additive)
-- Owner может пригласить помощника с привязкой к подмножеству категорий
-- (например, "только DJ-брони"). Scope сохраняется в invite-токене и при
-- consume переносится в telegram_accounts.categories_scope (см. migration 028).
--
-- Additive only. NULL = full access (legacy behaviour, без scope).

ALTER TABLE telegram_link_tokens
  ADD COLUMN IF NOT EXISTS categories_scope TEXT[];

COMMENT ON COLUMN telegram_link_tokens.categories_scope IS
  'Optional scope for assistant invites. NULL = full access (legacy). Array of category codes = scoped helper. На момент consume переносится в telegram_accounts.categories_scope.';
