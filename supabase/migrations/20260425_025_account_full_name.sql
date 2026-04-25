-- Migration: add full_name field to accounts
-- Allows specialists to set their real name (FIO) independently from Telegram display name.
-- This will be the anchor field for future eGov/ECP identity verification.

ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS full_name text;
