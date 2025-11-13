-- FireCFO Database Migration: Fix Safe Withdrawal Rate Precision
-- The original migration created safe_withdrawal_rate as NUMERIC(4, 2)
-- which only allows 2 decimal places (e.g., 0.04)
-- But our SWR values need 3 decimal places (e.g., 0.037, 0.033, 0.045)
-- This migration fixes the column type to allow proper precision

-- Change safe_withdrawal_rate from NUMERIC(4, 2) to NUMERIC(5, 3)
-- This allows values like 0.037, 0.033, 0.045 with full precision
ALTER TABLE user_profiles
ALTER COLUMN safe_withdrawal_rate TYPE NUMERIC(5, 3);

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name = 'safe_withdrawal_rate';

-- Show affected users (those with rounded SWR values)
-- These will need to update their FIRE goal to recalculate with correct precision
SELECT
  id,
  fire_target_age,
  safe_withdrawal_rate,
  CASE
    WHEN safe_withdrawal_rate = 0.04 THEN 'Possibly rounded from 0.037 or 0.040'
    WHEN safe_withdrawal_rate = 0.05 THEN 'Possibly rounded from 0.045 or 0.050'
    ELSE 'OK'
  END as status
FROM user_profiles
WHERE safe_withdrawal_rate IS NOT NULL;
