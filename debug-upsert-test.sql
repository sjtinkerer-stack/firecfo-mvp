-- DEBUG: Test upsert behavior for user_profiles
-- Run this in Supabase SQL Editor to diagnose the issue

-- Step 1: Get your user ID
SELECT
  id as user_id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 1;

-- Step 2: Check if user_profiles row exists and what it contains
-- Replace 'YOUR_USER_ID' with the actual UUID from Step 1
SELECT * FROM user_profiles WHERE id = 'YOUR_USER_ID';

-- Step 3: Check the table structure (verify id is PRIMARY KEY)
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default,
  CASE
    WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
    WHEN uq.column_name IS NOT NULL THEN 'UNIQUE'
    ELSE ''
  END as key_type
FROM information_schema.columns c
LEFT JOIN (
  SELECT ku.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage ku
    ON tc.constraint_name = ku.constraint_name
    AND tc.table_schema = ku.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_name = 'user_profiles'
) pk ON c.column_name = pk.column_name
LEFT JOIN (
  SELECT ku.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage ku
    ON tc.constraint_name = ku.constraint_name
    AND tc.table_schema = ku.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_name = 'user_profiles'
) uq ON c.column_name = uq.column_name
WHERE c.table_name = 'user_profiles'
ORDER BY c.ordinal_position;

-- Step 4: Test UPDATE operation (this is what upsert does on existing rows)
-- Replace 'YOUR_USER_ID' with your actual UUID
UPDATE user_profiles
SET
  age = 34,
  city = 'Mumbai',
  updated_at = NOW()
WHERE id = 'YOUR_USER_ID';

-- Step 5: Verify the update worked
SELECT
  id,
  age,
  city,
  marital_status,
  dependents,
  monthly_income,
  spouse_income,
  updated_at
FROM user_profiles
WHERE id = 'YOUR_USER_ID';

-- Step 6: Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;
