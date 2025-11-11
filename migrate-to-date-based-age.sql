-- Migration: Replace age/fire_age with date_of_birth/fire_target_date
-- Purpose: Enable automatic age calculation and precise FIRE countdowns
-- Date: 2025-01-XX
-- Author: FireCFO Team

-- Step 1: Add new date-based columns
ALTER TABLE user_profiles
  ADD COLUMN date_of_birth DATE,
  ADD COLUMN fire_target_date DATE,
  ADD COLUMN fire_target_age INTEGER; -- Keep for user's preferred expression

-- Step 2: Drop old age-based columns
-- Note: No data migration needed (clean slate as per requirements)
ALTER TABLE user_profiles
  DROP COLUMN IF EXISTS age,
  DROP COLUMN IF EXISTS fire_age;

-- Step 3: NOT NULL constraints
-- NOTE: These columns are nullable to allow initial user profile creation
-- They will be filled in during the onboarding process
-- DO NOT add NOT NULL constraints - the auth callback creates empty profiles

-- Step 4: Add validation constraints
-- Ensure FIRE target date is after date of birth
ALTER TABLE user_profiles
  ADD CONSTRAINT fire_target_date_after_birth
    CHECK (fire_target_date > date_of_birth);

-- Ensure fire_target_age is reasonable (18-80 years)
ALTER TABLE user_profiles
  ADD CONSTRAINT fire_target_age_range
    CHECK (fire_target_age >= 18 AND fire_target_age <= 80);

-- Step 5: Add helpful comments
COMMENT ON COLUMN user_profiles.date_of_birth IS 'User date of birth - source of truth for age calculation';
COMMENT ON COLUMN user_profiles.fire_target_date IS 'Computed FIRE target date based on date_of_birth + fire_target_age';
COMMENT ON COLUMN user_profiles.fire_target_age IS 'User preferred FIRE age (e.g., 45) - used to compute fire_target_date';

-- Step 6: Update RLS policies (if they reference age/fire_age)
-- Note: Current policies only check user ID, so no changes needed
-- If future policies filter by age, they should use:
-- EXTRACT(YEAR FROM AGE(CURRENT_DATE, date_of_birth)) for age calculation

-- Migration complete!
-- Next steps:
-- 1. Update application code to use date_of_birth instead of age
-- 2. Update onboarding forms to collect birth year/month
-- 3. Update all calculations to derive age from date_of_birth
-- 4. Test FIRE countdown features with real dates
