-- Migration 020: Ownership transfer accept/reject flow.

ALTER TYPE ownership_transfer_status ADD VALUE IF NOT EXISTS 'rejected';

CREATE INDEX IF NOT EXISTS idx_provider_transfer_from_account
  ON provider_ownership_transfer_requests(from_account_id, status);
