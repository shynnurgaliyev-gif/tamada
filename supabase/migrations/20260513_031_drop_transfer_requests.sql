-- Migration 031: Drop ownership transfer requests
-- Transfer-of-ownership flow is removed as part of the single-profile
-- consolidation. Brand-new owners just register a fresh account.
-- See: docs/obsidian/proposal-single-profile.md
--
-- This migration is destructive but safe: no users yet, only test data.

DROP TABLE IF EXISTS provider_ownership_transfer_requests CASCADE;
DROP TYPE  IF EXISTS ownership_transfer_status;
