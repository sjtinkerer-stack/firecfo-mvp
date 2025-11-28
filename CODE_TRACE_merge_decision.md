# Code Trace: Upload → Merge Decision

## Complete Call Stack

```
1. User Uploads PDF File
   └─ UploadModal.tsx: handleUpload()
      └─ useAssetUpload.uploadFiles()
         └─ POST /api/assets/parse
            
2. Parse API (/api/assets/parse/route.ts)
   ├─ Line 70-75: parseFiles(files) 
   │  └─ Extracts: assets[], parsed_statement_date, statement_date_source
   │
   ├─ Line 177-183: Fetch user's existing snapshots
   │  └─ Query: SELECT * FROM asset_snapshots WHERE user_id = $1
   │  └─ Returns: Array of snapshots with statement_date column
   │
   ├─ Line 229-232: groupFilesByStatementDate(filesWithDates, userSnapshots)
   │  └─ File groups by statement date
   │  └─ Calls: matchSnapshot() for each group
   │
   └─ Line 273-288: Build statement_date_groups response
      └─ Each group contains:
         ├─ statement_date: "2024-11-30" (from PDF)
         ├─ suggested_snapshot_name: "November 2024"
         ├─ matched_snapshot: { id, name, statement_date }
         └─ suggested_action: 'merge' | 'prompt' | 'create_new'

3. Assets Page (/dashboard/assets/page.tsx)
   ├─ Line 91-129: handleUploadSuccess(result)
   │  └─ result.statement_date_groups[] (from parse API)
   │
   ├─ Line 100: statement_date = result.statement_date_groups?.[0]?.statement_date
   ├─ Line 103: suggested_snapshot_name = result.statement_date_groups?.[0]?.suggested_snapshot_name
   ├─ Line 104: matched_snapshot_id = result.statement_date_groups?.[0]?.matched_snapshot?.id
   │
   └─ Line 105: CRITICAL DECISION
      merge_decision = result.statement_date_groups?.[0]?.suggested_action === 'merge' ? 'merge' : 'create_new'
                       ↑                                                           ↑
                       └───────────────────────────────────────────────────────────┘
                       Maps: 'merge' → 'merge'
                             'prompt' → 'create_new'  ← Ignores user prompt!
                             'create_new' → 'create_new'
                             undefined → 'create_new'
   
   ├─ Line 94-109: POST /api/assets/review/create
   │  └─ Body includes:
   │     ├─ statement_date: "2024-11-30"
   │     ├─ suggested_snapshot_name: "November 2024"
   │     ├─ matched_snapshot_id: "snap_123"
   │     └─ merge_decision: 'merge' | 'create_new'

4. Create Temp Upload (/api/assets/review/create/route.ts)
   ├─ Line 61-76: INSERT INTO temp_uploads
   │  └─ Stores: merge_decision, matched_snapshot_id, statement_date, etc.
   │
   └─ Line 129-134: Return { upload_id } to browser

5. Review Page (/dashboard/assets/review/[uploadId]/page.tsx)
   ├─ Line 197: ReviewHeaderCard
   │  ├─ isNewSnapshot={tempUpload.merge_decision === 'create_new'}
   │  └─ isMergeMode={tempUpload.merge_decision === 'merge'}
   │
   └─ UI displays "new" or "merge" label based on merge_decision
```

---

## Decision Tree: When is `suggested_action === 'merge'`?

```
matchSnapshot(userSnapshots, statementDate)
    │
    ├─ Filter snapshots with statement_date (line 309)
    │  ├─ YES: Continue
    │  └─ NO: Return { suggested_action: 'create_new' }
    │
    ├─ Find nearby snapshots (line 311-315)
    │  └─ Searches within 15 days tolerance
    │
    ├─ Calculate days difference to nearest snapshot
    │  │
    │  ├─ Is Infinity (no snapshots)?
    │  │  └─ Return { suggested_action: 'create_new' } ← Line 321
    │  │
    │  ├─ Is 0 (exact match)?
    │  │  └─ Return { suggested_action: 'merge' } ✓ ← Line 331
    │  │
    │  ├─ Is 1-15 days (close match)?
    │  │  └─ Return { suggested_action: 'prompt' } ← Line 341
    │  │     (But assets/page.tsx treats 'prompt' as 'create_new'!)
    │  │
    │  └─ Is >15 days (far apart)?
    │     └─ Return { suggested_action: 'create_new' } ← Line 348
```

---

## Where Can merge_decision Become 'merge'?

1. **Only ONE path in entire codebase** leads to `merge_decision: 'merge'`:
   - Parse API returns `suggested_action: 'merge'`
   - ↓
   - matchSnapshot() returns exact match (0 days difference)
   - ↓
   - Assets page maps 'merge' → 'merge'
   - ↓
   - Temp upload created with `merge_decision: 'merge'`

2. **Requirements for exact match:**
   - Existing snapshot MUST have `statement_date` column populated
   - PDF MUST extract same date (YYYY-MM-DD format)
   - Date difference MUST be exactly 0 days

---

## Critical Lines of Code

### Parse API (statement-date-utils.ts)

**Line 309:** Filter snapshots
```typescript
const snapshotsWithDates = userSnapshots.filter((s) => s.statement_date);
```
⚠️ If existing snapshot lacks `statement_date`, it's filtered out here!

**Line 326-332:** Exact match check
```typescript
if (matchResult.days_to_nearest === SNAPSHOT_MATCHING_CONFIG.EXACT_MATCH_DAYS) {
  return {
    match_type: 'exact',
    matched_snapshot: matchResult.suggested_merge,
    days_difference: 0,
    suggested_action: 'merge',  // ← Only path to 'merge'
  };
}
```

### Assets Page (page.tsx)

**Line 105:** Decision mapping
```typescript
merge_decision: result.statement_date_groups?.[0]?.suggested_action === 'merge' ? 'merge' : 'create_new',
```
⚠️ Converts 'prompt' → 'create_new' (loses user choice info)
⚠️ Treats undefined as 'create_new'

### Temp Upload Creation (create/route.ts)

**Line 72:** Store decision
```typescript
merge_decision: body.merge_decision || null,
```
⚠️ If undefined, becomes null (UI won't recognize as 'merge')

---

## Debugging Steps

### 1. Check if snapshot has statement_date
```sql
SELECT id, snapshot_name, statement_date, snapshot_date
FROM asset_snapshots
WHERE snapshot_name = 'November 2025'
LIMIT 1;
```

### 2. Add logging to parse API
```typescript
// Add around line 232
console.log('🔍 Grouping files by statement date');
console.log('  Input files:', filesWithDates);
console.log('  User snapshots:', userSnapshots.map(s => ({
  id: s.id,
  name: s.snapshot_name,
  statement_date: s.statement_date,
})));

const fileGroups = groupFilesByStatementDate(filesWithDates, userSnapshots);

console.log('  Result groups:', fileGroups.map(g => ({
  statement_date: g.statement_date,
  match_type: g.match_result.match_type,
  suggested_action: g.match_result.suggested_action,
  matched_snapshot: g.match_result.matched_snapshot?.snapshot_name,
})));
```

### 3. Add logging to assets page
```typescript
// Add around line 100-105
console.log('📤 Upload success');
console.log('  Groups:', result.statement_date_groups);
if (result.statement_date_groups?.[0]) {
  console.log('  First group suggested_action:', result.statement_date_groups[0].suggested_action);
  console.log('  Will create merge_decision:', result.statement_date_groups[0].suggested_action === 'merge' ? 'merge' : 'create_new');
}
```

---

## Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| `statement_date` column NULL | Always creates new | Backfill snapshots with statement_date |
| PDF date not extracted | suggested_action always create_new | Check PDF parser, add logging |
| Date format mismatch | Exact match never triggers | Ensure ISO format YYYY-MM-DD |
| 'prompt' action ignored | Loses user choice | Need UI flow for 'prompt' action |
| groupFilesByStatementDate creates multiple groups | Groups don't merge | Check 7-day tolerance logic |
| RLS policies blocking snapshot query | No snapshots returned | Check Supabase RLS settings |

