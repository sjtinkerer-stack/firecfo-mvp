# Quick Start: Asset Tracking System

## Step 1: Choose Your Migration Path

**If you encountered "column 'snapshot_id' does not exist" error:**
This means tables already exist with an incorrect schema. Use the **CLEAN migration** (Option A below).

**If this is your first time running the migration:**
Use the **CLEAN migration** for a fresh start (Option A below).

## Step 2: Apply the Migration

### Option A: CLEAN Migration (Recommended - Drops & Recreates)

⚠️ **WARNING**: This will delete any existing asset tracking data!

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Copy the entire contents of `add-asset-tracking-system-clean.sql`
6. Paste into the SQL editor
7. Click **"Run"** (or press Cmd/Ctrl + Enter)
8. Wait for success message: "Success. No rows returned"

### Option B: Original Migration (If tables don't exist)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Copy the entire contents of `add-asset-tracking-system.sql`
6. Paste into the SQL editor
7. Click **"Run"** (or press Cmd/Ctrl + Enter)
8. Wait for success message: "Success. No rows returned"

### Option C: Using Command Line

```bash
# If you have psql installed and your database connection string
psql "your_supabase_connection_string" -f add-asset-tracking-system.sql
```

To get your connection string:
1. Go to Supabase Dashboard → Project Settings → Database
2. Copy the "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your actual database password

### Option D: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Step 3: Verify Migration Success

Run this query in Supabase SQL Editor:

```sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'asset_snapshots',
    'assets',
    'asset_subclass_mapping',
    'asset_subclass_returns',
    'upload_logs'
  );
```

**Expected Output:** You should see all 5 table names listed.

## Step 4: Verify Seed Data

```sql
-- Check sub-class count (should be 26)
SELECT COUNT(*) FROM asset_subclass_mapping;

-- Check historical returns (should be ~300)
SELECT COUNT(*) FROM asset_subclass_returns;
```

## Step 5: Restart Your App

```bash
# Stop the dev server (Ctrl+C)
# Start it again
npm run dev
```

## Step 6: Test Asset Hub

1. Open http://localhost:3000/dashboard
2. Click **"Asset Hub"** button
3. You should see the empty state (no more errors!)
4. Click **"Upload Statements"** to test the upload flow

---

## Troubleshooting

### Error: "relation does not exist"
**Cause:** Migration not applied
**Fix:** Follow Step 2 above

### Error: "permission denied for table"
**Cause:** RLS policies not applied
**Fix:** Re-run the migration (it will skip existing tables but apply policies)

### Error: "Unauthorized"
**Cause:** Authentication issue
**Fix:** Try logging out and back in, then refresh the page

### Migration fails with "already exists"
**Cause:** Partial migration was applied before
**Fix:** The migration uses `IF NOT EXISTS` clauses, so it's safe to re-run. Just ignore the "already exists" warnings.

---

## What the Migration Creates

✅ **5 New Tables:**
1. `asset_snapshots` - Net worth snapshots over time
2. `assets` - Individual holdings (stocks, funds, etc.)
3. `asset_subclass_mapping` - 26 sub-class definitions
4. `asset_subclass_returns` - Historical return data (2015-2024)
5. `upload_logs` - File upload tracking

✅ **26 Sub-Classes:** Direct Stocks, Index Funds, Liquid Funds, etc.

✅ **300+ Historical Returns:** 10 years of data for weighted calculations

✅ **RLS Policies:** Row-level security for all tables

✅ **Helper Functions:** Weighted return calculations

---

## After Migration Success

You can now:
- Upload PDF/CSV/Excel statements
- AI will classify assets automatically
- Duplicate detection will flag similar assets
- Track net worth over time with snapshots
- Get personalized portfolio return calculations (instead of blanket 12%)

🎉 **You're all set!**
