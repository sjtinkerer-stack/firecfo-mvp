-- FireCFO Database Migration: Add Step 4 Asset Category Fields
-- Run this in Supabase SQL Editor after running supabase-migration.sql

-- Add individual asset category columns for Step 4
DO $$
BEGIN
  -- Equity (stocks, MFs, index funds)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'equity'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN equity NUMERIC(15, 2) DEFAULT 0;
  END IF;

  -- Debt (FDs, PPF, EPF, bonds)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'debt'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN debt NUMERIC(15, 2) DEFAULT 0;
  END IF;

  -- Cash (savings, liquid funds)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'cash'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN cash NUMERIC(15, 2) DEFAULT 0;
  END IF;

  -- Real Estate (property value)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'real_estate'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN real_estate NUMERIC(15, 2) DEFAULT 0;
  END IF;

  -- Other Assets (gold, crypto, etc.)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'other_assets'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN other_assets NUMERIC(15, 2) DEFAULT 0;
  END IF;
END $$;

-- Update current_networth to be a computed column if it exists
-- (Sum of all asset categories)
DO $$
BEGIN
  -- First check if current_networth exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'current_networth'
  ) THEN
    -- Update existing rows to calculate current_networth from components
    UPDATE user_profiles
    SET current_networth = COALESCE(equity, 0) + COALESCE(debt, 0) + COALESCE(cash, 0) + COALESCE(real_estate, 0) + COALESCE(other_assets, 0)
    WHERE equity IS NOT NULL OR debt IS NOT NULL OR cash IS NOT NULL OR real_estate IS NOT NULL OR other_assets IS NOT NULL;
  END IF;
END $$;

-- Verify the new columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN ('equity', 'debt', 'cash', 'real_estate', 'other_assets')
ORDER BY ordinal_position;

-- Test query: Show totals
SELECT
  id,
  equity,
  debt,
  cash,
  real_estate,
  other_assets,
  (COALESCE(equity, 0) + COALESCE(debt, 0) + COALESCE(cash, 0) + COALESCE(real_estate, 0) + COALESCE(other_assets, 0)) as calculated_networth
FROM user_profiles
LIMIT 5;
