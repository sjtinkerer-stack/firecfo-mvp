-- Migration: Add temp_uploads and temp_assets tables for review workflow
-- Purpose: Store uploaded assets temporarily during review before saving to snapshots

-- Temp uploads table (stores upload session metadata)
CREATE TABLE IF NOT EXISTS temp_uploads (
  id TEXT PRIMARY KEY, -- Format: tmp_YYYYMMDD_randomString
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Upload metadata
  file_names TEXT[] NOT NULL, -- Array of uploaded filenames
  total_assets INTEGER NOT NULL DEFAULT 0,
  total_value NUMERIC(15, 2) NOT NULL DEFAULT 0,

  -- Statement date from parsing
  statement_date DATE,
  statement_date_confidence TEXT, -- 'high', 'medium', 'low', 'manual'
  statement_date_source TEXT, -- 'document_content', 'filename', 'user_input', 'upload_timestamp'

  -- Snapshot decision (from statementDateGroups)
  suggested_snapshot_name TEXT,
  matched_snapshot_id TEXT, -- If AI found a matching snapshot
  merge_decision TEXT, -- 'merge', 'create_new', null (not decided yet)

  -- Processing info
  processing_time_ms INTEGER,
  duplicates_found INTEGER DEFAULT 0,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_review', 'completed', 'cancelled'

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Temp assets table (stores individual assets during review)
CREATE TABLE IF NOT EXISTS temp_assets (
  id TEXT PRIMARY KEY, -- Format: tmp_asset_randomString
  temp_upload_id TEXT NOT NULL REFERENCES temp_uploads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Asset details (same as assets table)
  asset_name TEXT NOT NULL,
  asset_class TEXT NOT NULL, -- 'equity', 'debt', 'cash', 'real_estate', 'other'
  asset_subclass TEXT NOT NULL,
  current_value NUMERIC(15, 2) NOT NULL,
  quantity NUMERIC(15, 4),
  purchase_price NUMERIC(15, 2),
  purchase_date DATE,
  risk_level TEXT NOT NULL, -- 'very_low', 'low', 'medium', 'high', 'very_high'
  expected_return_percentage NUMERIC(5, 2) NOT NULL,

  -- Source info
  source_file TEXT,
  ai_confidence_score NUMERIC(3, 2), -- 0.00 to 1.00
  verified_via TEXT, -- 'api_lookup', 'ai_classification', 'manual', 'none'
  security_type TEXT, -- 'equity', 'mutual_fund', 'bond', 'etf', 'commodity', 'unknown'

  -- Financial identifiers
  isin TEXT,
  ticker_symbol TEXT,
  exchange TEXT,

  -- Duplicate detection
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_matches JSONB, -- Array of DuplicateMatch objects

  -- Review state
  is_selected BOOLEAN DEFAULT TRUE, -- Auto-selected unless duplicate
  is_edited BOOLEAN DEFAULT FALSE, -- Track if user edited this asset

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_temp_uploads_user_id ON temp_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_uploads_status ON temp_uploads(status);
CREATE INDEX IF NOT EXISTS idx_temp_uploads_created_at ON temp_uploads(created_at);
CREATE INDEX IF NOT EXISTS idx_temp_uploads_expires_at ON temp_uploads(expires_at);

CREATE INDEX IF NOT EXISTS idx_temp_assets_temp_upload_id ON temp_assets(temp_upload_id);
CREATE INDEX IF NOT EXISTS idx_temp_assets_user_id ON temp_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_assets_is_selected ON temp_assets(is_selected);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_temp_uploads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER temp_uploads_updated_at_trigger
  BEFORE UPDATE ON temp_uploads
  FOR EACH ROW
  EXECUTE FUNCTION update_temp_uploads_updated_at();

CREATE OR REPLACE FUNCTION update_temp_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER temp_assets_updated_at_trigger
  BEFORE UPDATE ON temp_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_temp_assets_updated_at();

-- RLS Policies
ALTER TABLE temp_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_assets ENABLE ROW LEVEL SECURITY;

-- Users can only access their own temp uploads
CREATE POLICY temp_uploads_user_policy ON temp_uploads
  FOR ALL
  USING (auth.uid() = user_id);

-- Users can only access their own temp assets
CREATE POLICY temp_assets_user_policy ON temp_assets
  FOR ALL
  USING (auth.uid() = user_id);

-- Cleanup function (to be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_temp_uploads()
RETURNS void AS $$
BEGIN
  -- Delete expired temp uploads (cascade will delete temp_assets)
  DELETE FROM temp_uploads
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Add comment explaining the tables
COMMENT ON TABLE temp_uploads IS 'Temporary storage for asset uploads during review workflow. Auto-expires after 24 hours.';
COMMENT ON TABLE temp_assets IS 'Temporary storage for individual assets during review. Linked to temp_uploads.';
