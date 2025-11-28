-- Migration: Add statement date tracking to asset snapshots
-- Purpose: Enable smart merging of uploads based on parsed statement dates
-- Author: Claude Code
-- Date: 2024-11-26

-- =============================================================================
-- 1. Add statement_date columns to asset_snapshots
-- =============================================================================

-- Add statement_date column (the date the financial statement represents)
-- This is distinct from snapshot_date (when the snapshot was created in our DB)
ALTER TABLE asset_snapshots
  ADD COLUMN IF NOT EXISTS statement_date DATE;

-- Add snapshot_name for user-friendly naming
ALTER TABLE asset_snapshots
  ADD COLUMN IF NOT EXISTS snapshot_name TEXT;

-- Add confidence score for AI-extracted dates
ALTER TABLE asset_snapshots
  ADD COLUMN IF NOT EXISTS statement_date_confidence TEXT
  CHECK (statement_date_confidence IN ('high', 'medium', 'low', 'manual'));

-- Add source of statement date (for debugging/audit trail)
ALTER TABLE asset_snapshots
  ADD COLUMN IF NOT EXISTS statement_date_source TEXT
  CHECK (statement_date_source IN ('document_content', 'filename', 'user_input', 'upload_timestamp'));

-- =============================================================================
-- 2. Add statement_date columns to upload_logs
-- =============================================================================

-- Track parsed statement date from each upload
ALTER TABLE upload_logs
  ADD COLUMN IF NOT EXISTS parsed_statement_date DATE;

-- Track how we extracted the date
ALTER TABLE upload_logs
  ADD COLUMN IF NOT EXISTS statement_date_source TEXT;

-- Add confidence score for tracking AI accuracy
ALTER TABLE upload_logs
  ADD COLUMN IF NOT EXISTS statement_date_confidence TEXT;

-- =============================================================================
-- 3. Backfill existing snapshots with default values
-- =============================================================================

-- For existing snapshots, use snapshot_date as fallback statement_date
-- Mark as low confidence since we're inferring from upload timestamp
UPDATE asset_snapshots
SET
  statement_date = DATE(snapshot_date),
  statement_date_confidence = 'low',
  statement_date_source = 'upload_timestamp',
  snapshot_name = TO_CHAR(snapshot_date, 'Month YYYY')
WHERE statement_date IS NULL;

-- =============================================================================
-- 4. Create index for fast snapshot lookups by statement_date
-- =============================================================================

-- Index for finding snapshots by user + statement_date (used in merge logic)
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_user_statement_date
  ON asset_snapshots(user_id, statement_date);

-- Index for sorting/filtering by statement_date
CREATE INDEX IF NOT EXISTS idx_asset_snapshots_statement_date
  ON asset_snapshots(statement_date DESC);

-- =============================================================================
-- 5. Add comments for documentation
-- =============================================================================

COMMENT ON COLUMN asset_snapshots.statement_date IS
  'The date the financial statement represents (e.g., "as of Nov 30, 2024"). Distinct from snapshot_date which is when the record was created in our DB.';

COMMENT ON COLUMN asset_snapshots.snapshot_name IS
  'User-friendly name for the snapshot (e.g., "November 2024", "Q3 2024 Portfolio"). Auto-generated from statement_date but user can override.';

COMMENT ON COLUMN asset_snapshots.statement_date_confidence IS
  'Confidence level of AI-extracted date: "high" (>90%), "medium" (70-90%), "low" (<70%), "manual" (user-entered)';

COMMENT ON COLUMN asset_snapshots.statement_date_source IS
  'Where the statement_date came from: "document_content" (AI parsed from PDF/CSV), "filename" (extracted from filename), "user_input" (user specified), "upload_timestamp" (fallback)';

-- =============================================================================
-- Verification queries
-- =============================================================================

-- Uncomment to verify migration:
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'asset_snapshots'
--   AND column_name IN ('statement_date', 'snapshot_name', 'statement_date_confidence', 'statement_date_source');

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'upload_logs'
--   AND column_name IN ('parsed_statement_date', 'statement_date_source', 'statement_date_confidence');
