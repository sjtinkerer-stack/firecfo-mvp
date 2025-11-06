-- FireCFO Database Migration: Add missing columns to user_profiles
-- Run this in Supabase SQL Editor

-- First, check if onboarding_completed column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add created_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add remaining Step 3-5 columns if missing
DO $$
BEGIN
  -- Step 3: Expenses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'monthly_expenses'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN monthly_expenses INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'rent_amount'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN rent_amount INTEGER;
  END IF;

  -- Step 4: Net Worth
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'current_networth'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN current_networth NUMERIC(15, 2);
  END IF;

  -- Step 5: FIRE Goal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'fire_age'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN fire_age INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'fire_target_amount'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN fire_target_amount NUMERIC(15, 2);
  END IF;
END $$;

-- Create or replace the updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;

-- Create the trigger
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update existing row to set onboarding_completed = false and timestamps
UPDATE user_profiles
SET
  onboarding_completed = COALESCE(onboarding_completed, FALSE),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE onboarding_completed IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL;

-- Verify the schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
