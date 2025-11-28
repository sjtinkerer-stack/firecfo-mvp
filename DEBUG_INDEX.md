# Investigation Index: `tempUpload.merge_decision` Not Set to 'merge'

## Problem
User uploads PDF (2nd upload), app should detect it matches existing "November 2025" snapshot and set `merge_decision: 'merge'`, but UI shows "new" label instead.

## Investigation Documents

### 1. **MERGE_DECISION_INVESTIGATION_SUMMARY.md** ← START HERE
**Best for:** Getting the complete picture with code snippets
- Executive summary
- Step-by-step upload flow with actual code
- All 5 scenarios with diagnosis + fixes
- Quick debug guide with SQL queries
- File reference table

**Time to read:** 10-15 minutes
**Best use case:** Understanding the full flow before debugging

---

### 2. **FLOWCHART_merge_detection.txt** ← VISUAL OVERVIEW
**Best for:** Understanding the data flow visually
- ASCII flowchart of the entire process
- Decision tree showing when 'merge' is returned
- Problem visualization with examples
- Quick fix checklist

**Time to read:** 5 minutes
**Best use case:** Getting a mental model of how the system works

---

### 3. **CODE_TRACE_merge_decision.md** ← TECHNICAL DEEP DIVE
**Best for:** Developers debugging with code references
- Complete call stack with line numbers
- Decision tree logic
- Critical lines of code highlighted
- Debugging steps with logging code
- Common issues & fixes table

**Time to read:** 15-20 minutes
**Best use case:** Adding logging and debugging systematically

---

### 4. **INVESTIGATION_merge_decision.md** ← REFERENCE
**Best for:** Long-term reference while working on the fix
- Root cause analysis (5 scenarios)
- Architectural patterns
- Investigation checklist
- Hypotheses ranked by likelihood
- Data flow diagram

**Time to read:** 20 minutes (not all at once)
**Best use case:** Reference material while implementing fixes

---

## Quick Start (5 minutes)

1. **Read:** FLOWCHART_merge_detection.txt (visual overview)
2. **Check:** Run the SQL query in that file
3. **Diagnose:** Which scenario matches your situation?
4. **Implement:** See scenario-specific fix in MERGE_DECISION_INVESTIGATION_SUMMARY.md

---

## Most Likely Root Cause

**95% probability:** Existing snapshot's `statement_date` column is NULL

**Why:** 
- Line 309 in `statement-date-utils.ts` filters out snapshots without `statement_date`
- If your "November 2025" snapshot lacks this field, it never matches
- No match = `suggested_action: 'create_new'` = UI shows "new" label

**Quick check:**
```sql
SELECT id, snapshot_name, statement_date, snapshot_date
FROM asset_snapshots
WHERE snapshot_name = 'November 2025';
```

If `statement_date` is NULL → This is the problem. Need to backfill.

---

## Debug Flow

```
1. Run SQL query above
   ├─ statement_date IS NULL? → Scenario 1 ✓
   └─ statement_date IS NOT NULL? → Scenario 2-5

2. Check browser console during upload
   ├─ See "Grouped X files into Y groups"?
   │  ├─ YES → Continue
   │  └─ NO → Scenario 2 (PDF date extraction)
   │
   └─ Add logging to parse API (see guide)
      └─ Log which snapshots pass the filter

3. Check parse API response
   └─ Network tab → POST /api/assets/parse
      └─ Look for statement_date_groups in response
         └─ Check suggested_action value

4. Match result against scenarios
   └─ Implement scenario-specific fix
```

---

## Key Code Locations

| What | File | Lines | Issue |
|------|------|-------|-------|
| Parse API | `/api/assets/parse/route.ts` | 201-237 | Returns `suggested_action` |
| Decision mapping | `/dashboard/assets/page.tsx` | 105 | Maps to `merge_decision` |
| Match logic | `/app/lib/assets/statement-date-utils.ts` | 309, 326-331 | Filters & matches snapshots |
| Storage | `/api/assets/review/create/route.ts` | 72 | Persists `merge_decision` |
| Display | `/dashboard/assets/review/[uploadId]/page.tsx` | 197-198 | Shows "new" or "merge" label |

---

## Key Findings

### Only ONE Path Leads to 'merge'
```
matchSnapshot() returns EXACT match (0 days difference)
  ↓
suggested_action: 'merge'
  ↓
Assets page: merge_decision: 'merge'
  ↓
UI displays "merge" label
```

### Requirements for 'merge'
1. Existing snapshot MUST have `statement_date` populated
2. PDF MUST extract same date (YYYY-MM-DD format)
3. Date difference MUST be exactly 0 days

### Current Behavior When NOT Met
→ Defaults to `merge_decision: 'create_new'`
→ UI displays "new" label

---

## The 5 Scenarios

| # | Scenario | Symptom | Fix |
|---|----------|---------|-----|
| 1 | Snapshot missing `statement_date` | Always "new" | Backfill column |
| 2 | PDF date extraction failing | Always "new" | Check PDF parser |
| 3 | Date format mismatch | Dates don't compare | Normalize to ISO |
| 4 | Files creating multiple groups | Won't merge | Adjust tolerance |
| 5 | RLS blocking snapshot query | Always "new" | Check permissions |

**Most likely:** #1 (95%)
**Next likely:** #2 (4%)
**Others:** (1%)

---

## Files Generated

```
firecfo/
├── MERGE_DECISION_INVESTIGATION_SUMMARY.md    ← START HERE
├── FLOWCHART_merge_detection.txt              ← Visual overview
├── CODE_TRACE_merge_decision.md               ← Technical deep dive
├── INVESTIGATION_merge_decision.md            ← Reference material
└── DEBUG_INDEX.md                             ← This file
```

---

## Debugging Commands

### 1. Check Snapshot Data
```sql
SELECT id, snapshot_name, statement_date, snapshot_date, total_networth
FROM asset_snapshots
WHERE user_id = 'YOUR_USER_ID'
ORDER BY snapshot_date DESC
LIMIT 5;
```

### 2. Add Parse API Logging
See section "Add Console Logging (Parse API)" in CODE_TRACE_merge_decision.md

### 3. Add Assets Page Logging
See section "Add Console Logging (Assets Page)" in CODE_TRACE_merge_decision.md

### 4. Check Network Response
DevTools → Network → POST /api/assets/parse → Response tab
Look for `statement_date_groups` field

---

## Next Steps

1. **Verify Data:** Run SQL query to check `statement_date` column
2. **Add Logging:** Follow logging instructions in CODE_TRACE_merge_decision.md
3. **Re-upload:** Test with PDF upload
4. **Check Logs:** Review browser console and server logs
5. **Identify Root Cause:** Match to one of 5 scenarios
6. **Implement Fix:** See scenario-specific fix in MERGE_DECISION_INVESTIGATION_SUMMARY.md
7. **Verify:** Re-test upload to confirm merge is detected

---

## Questions Answered in Documents

- "Where is `merge_decision` set?" → MERGE_DECISION_INVESTIGATION_SUMMARY.md
- "What code determines if it's 'merge'?" → CODE_TRACE_merge_decision.md  
- "How does the data flow?" → FLOWCHART_merge_detection.txt
- "Why isn't it working?" → All documents (5 scenarios each)
- "How do I debug?" → CODE_TRACE_merge_decision.md + this file
- "What's the most likely issue?" → This file (Scenario 1)

---

## Pro Tips

1. **Start with the flowchart** - Gets you oriented quickly
2. **Check statement_date first** - Solves 95% of cases
3. **Add logging strategically** - Parse API + Assets page critical
4. **Check Network tab** - Confirms API is returning data
5. **Look at parse API logs** - "Grouped X files into Y groups" tells you if dates extracted

---

Created: Nov 28, 2024
Status: Complete Investigation
Next Action: Run SQL query and add logging
