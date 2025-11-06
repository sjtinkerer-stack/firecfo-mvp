-- FireCFO Database Migration: Add Step 5 FIRE Goal Fields
-- Run this in Supabase SQL Editor after running previous migrations

-- Add Step 5 FIRE Goal fields
DO $$
BEGIN
  -- Target FIRE age
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'fire_age'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN fire_age INTEGER;
  END IF;

  -- FIRE lifestyle type (lean, standard, fat)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'fire_lifestyle_type'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN fire_lifestyle_type TEXT CHECK (fire_lifestyle_type IN ('lean', 'standard', 'fat'));
  END IF;

  -- Calculated field: Lifestyle Inflation Adjustment percentage
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'lifestyle_inflation_adjustment'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN lifestyle_inflation_adjustment NUMERIC(5, 2);
  END IF;

  -- Calculated field: Post-FIRE monthly expense
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'post_fire_monthly_expense'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN post_fire_monthly_expense NUMERIC(15, 2);
  END IF;

  -- Calculated field: Required FIRE corpus
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'required_corpus'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN required_corpus NUMERIC(15, 2);
  END IF;

  -- Calculated field: Projected corpus at FIRE age
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'projected_corpus_at_fire'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN projected_corpus_at_fire NUMERIC(15, 2);
  END IF;

  -- Calculated field: Monthly savings needed to hit FIRE goal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'monthly_savings_needed'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN monthly_savings_needed NUMERIC(15, 2);
  END IF;

  -- Calculated field: Whether user is on track to achieve FIRE
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'is_on_track'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN is_on_track BOOLEAN;
  END IF;

  -- Calculated field: Safe Withdrawal Rate used in calculation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles'
    AND column_name = 'safe_withdrawal_rate'
  ) THEN
    ALTER TABLE user_profiles
    ADD COLUMN safe_withdrawal_rate NUMERIC(4, 2);
  END IF;

END $$;

-- Add constraints for fire_age
DO $$
BEGIN
  -- Ensure fire_age is at least 18
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles'
    AND constraint_name = 'fire_age_min'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT fire_age_min CHECK (fire_age IS NULL OR fire_age >= 18);
  END IF;

  -- Ensure fire_age is at most 80
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'user_profiles'
    AND constraint_name = 'fire_age_max'
  ) THEN
    ALTER TABLE user_profiles
    ADD CONSTRAINT fire_age_max CHECK (fire_age IS NULL OR fire_age <= 80);
  END IF;
END $$;

-- Verify the new columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN (
  'fire_age',
  'fire_lifestyle_type',
  'lifestyle_inflation_adjustment',
  'post_fire_monthly_expense',
  'required_corpus',
  'projected_corpus_at_fire',
  'monthly_savings_needed',
  'is_on_track',
  'safe_withdrawal_rate'
)
ORDER BY ordinal_position;

-- Test query: Show FIRE goal data for users
SELECT
  id,
  age,
  fire_age,
  fire_lifestyle_type,
  safe_withdrawal_rate,
  monthly_expenses,
  post_fire_monthly_expense,
  required_corpus,
  projected_corpus_at_fire,
  is_on_track
FROM user_profiles
WHERE fire_age IS NOT NULL
LIMIT 5;
