-- Diagnostic Query: Check if asset tracking tables already exist
-- Run this in Supabase SQL Editor BEFORE running the migration

-- Check which tables exist
SELECT
  table_name,
  'EXISTS' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'asset_snapshots',
    'assets',
    'asset_subclass_mapping',
    'asset_subclass_returns',
    'upload_logs'
  )
ORDER BY table_name;

-- Check columns in assets table (if it exists)
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'assets'
ORDER BY ordinal_position;
