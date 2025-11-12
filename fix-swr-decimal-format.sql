-- Fix SWR Decimal Format Migration
--
-- PROBLEM: The old deprecated calculateSafeWithdrawalRate() function returned
-- whole numbers (3.5, 4.0, 4.5) instead of decimals (0.035, 0.04, 0.045).
-- This caused database corruption when users edited personal info via settings.
--
-- SYMPTOMS:
-- - SWR displays as 4.0% but multiplier shows 28.6x (mathematically impossible)
-- - If SWR were truly 4.0% (0.04), multiplier should be 25x
-- - The 28.6x multiplier indicates actual SWR should be 3.5% (0.035)
--
-- SOLUTION: Convert all SWR values >= 1.0 to decimal format by dividing by 100
--
-- AFFECTED USERS: Anyone who edited personal info (DOB, dependents, marital status)
-- via the settings page after completing onboarding.
--
-- Date: 2025-11-12
-- Author: Claude Code (AI)

-- First, let's see how many rows are affected
-- SELECT COUNT(*) as affected_rows
-- FROM user_profiles
-- WHERE safe_withdrawal_rate >= 1;

-- Fix the corrupted SWR values
UPDATE user_profiles
SET
  safe_withdrawal_rate = safe_withdrawal_rate / 100,
  updated_at = NOW()
WHERE safe_withdrawal_rate >= 1;

-- Verify the fix
-- SELECT
--   id,
--   fire_target_age,
--   safe_withdrawal_rate,
--   (1.0 / safe_withdrawal_rate) as calculated_multiplier,
--   required_corpus
-- FROM user_profiles
-- WHERE updated_at >= NOW() - INTERVAL '5 minutes';

-- Expected results after migration:
-- - All SWR values should be < 1 (e.g., 0.033, 0.035, 0.037, 0.04, 0.043, 0.045)
-- - Multiplier calculation (1 / SWR) should match displayed multiplier
-- - Example: SWR = 0.035 → Multiplier = 28.6x (correct)
