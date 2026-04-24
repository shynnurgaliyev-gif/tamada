-- Migration: add show_owner_name flag to providers
-- Allows specialists to display their account owner's full name on their public profile.

ALTER TABLE providers
  ADD COLUMN IF NOT EXISTS show_owner_name boolean NOT NULL DEFAULT false;
