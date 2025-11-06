# Debug Guide: Onboarding Data Not Saving

## Step 1: Fix RLS Policies (Most Likely Issue)

Your Supabase Row Level Security (RLS) policies might be blocking writes.

**Action:** Run `fix-rls-policies.sql` in Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/gyxjcahxnbaghodoywzr
2. Click: SQL Editor
3. Copy and paste the contents of `fix-rls-policies.sql`
4. Click: Run

This will:
- Drop any conflicting existing policies
- Create proper policies for authenticated users
- Verify the policies were created

---

## Step 2: Check Browser Console for Errors

While filling out the onboarding form:

1. Open browser console (F12 or Cmd+Option+I)
2. Go to the Console tab
3. Fill in Step 1 fields (age, city, marital status, dependents)
4. Wait 1-2 seconds (auto-save delay)
5. Look for errors in console

**What to look for:**
- ✅ `"Data auto-saved successfully"` - Good! Data saved
- ❌ `"Auto-save failed"` - Check the error details
- ❌ `"new row violates row-level security policy"` - RLS issue (run Step 1)
- ❌ `"permission denied"` - RLS issue (run Step 1)
- ❌ Any red error messages

**Screenshot and share any errors you see!**

---

## Step 3: Manual Test in Supabase

Try inserting data manually to test RLS:

1. Go to Supabase SQL Editor
2. Run this query (replace USER_ID with your actual user ID from auth.users):

```sql
-- First, get your user ID
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 1;

-- Then try to insert/update using that ID
-- Replace '4380b045-5d74-43e8-9052-c1dcce2a50b3' with your actual user ID
UPDATE user_profiles
SET
  age = 30,
  city = 'Mumbai',
  marital_status = 'Single',
  dependents = 0,
  monthly_income = 100000,
  spouse_income = 0,
  updated_at = NOW()
WHERE id = '4380b045-5d74-43e8-9052-c1dcce2a50b3';

-- Check if it worked
SELECT * FROM user_profiles WHERE id = '4380b045-5d74-43e8-9052-c1dcce2a50b3';
```

If this UPDATE fails, it's definitely an RLS issue.

---

## Step 4: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "Fetch/XHR"
4. Fill in a field in the onboarding form
5. Wait 1-2 seconds
6. Look for a request to Supabase (should see `gyxjcahxnbaghodoywzr.supabase.co`)
7. Click on it and check:
   - **Request tab**: See what data is being sent
   - **Response tab**: Check for error messages
   - **Status code**: Should be 200 or 201 (success), not 401/403 (auth error) or 400 (bad request)

---

## Step 5: Verify Environment Variables

Make sure your `.env.local` has the correct values:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://gyxjcahxnbaghodoywzr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci... (your anon key)
```

After changing `.env.local`, you MUST restart your dev server:
```bash
npm run dev
```

---

## Step 6: Check if Profile Row Exists

In Supabase Table Editor:

1. Go to `user_profiles` table
2. Look for your user ID (4380b045-5d74-43e8-9052-c1dcce2a50b3)
3. If row exists but fields are NULL → RLS or auto-save issue
4. If row doesn't exist → Profile creation failed in auth callback

---

## Common Fixes

### Fix 1: RLS Policies
Run `fix-rls-policies.sql` (Step 1 above)

### Fix 2: Restart Dev Server
```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Fix 3: Clear Browser Cache
- Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
- Or clear site data in DevTools

### Fix 4: Check Vercel Environment Variables (Production Only)
If this is on Vercel, make sure environment variables are set:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Redeploy

---

## Report Back

After running Step 1 (RLS fix) and Step 2 (console check), let me know:
1. Did you see "Data auto-saved successfully" in console?
2. Any error messages in console?
3. Does data now appear in Supabase table?
4. Screenshot of Network tab showing the request/response?
