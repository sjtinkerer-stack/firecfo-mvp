# Impact Preview Test Checklist

## Purpose
This checklist validates the fix for false positive previews in Settings modals.

## Bug Fixed
Impact Preview was showing misleading messages when field changes didn't affect calculations (e.g., Single→Married with spouse_income=0).

## Implementation Changes

### 1. Personal Info Modal (`edit-personal-info-modal.tsx`)
- **Change**: Smart `hasChanges` check that compares effective spouse income and final calculations
- **Thresholds**:
  - Corpus change > ₹50,000
  - SWR change > 0.1%

### 2. FIRE Goal Modal (`edit-fire-goal-modal.tsx`)
- **Change**: Smart `hasChanges` check with meaningful thresholds
- **Thresholds**:
  - Corpus change > ₹50,000
  - SWR change > 0.1%
  - Any year change (always meaningful)

### 3. Impact Preview Component (`impact-preview.tsx`)
- **Change**: Increased thresholds and quantified messages
- **Thresholds**:
  - Corpus detail: > ₹50,000 (was ₹1,000)
  - Summary section: Only shows if year change OR corpus > ₹100,000 OR SWR > 0.1%
  - Summary messages: Quantified with exact amounts

---

## Test Cases - Personal Info Modal

### Test Case 1: Marital Status Single → Married (spouse_income = 0) ✅ PRIMARY BUG FIX
**Setup:**
- User is Single
- spouse_income = 0
- Go to Settings > Personal Info

**Steps:**
1. Change marital status to "Married"

**Expected:**
- ❌ NO Impact Preview should appear
- Placeholder message: "💡 Make changes above to see how they'll impact your FIRE plan"

**Why:** Spouse income is 0, so household income doesn't change. Calculations identical.

---

### Test Case 2: Marital Status Married → Single (spouse_income = 0)
**Setup:**
- User is Married
- spouse_income = 0
- Go to Settings > Personal Info

**Steps:**
1. Change marital status to "Single"

**Expected:**
- ❌ NO Impact Preview should appear
- Warning banner: "Important: Spouse Income Will Be Reset" should NOT appear (already 0)

**Why:** Spouse income is already 0, no calculation change.

---

### Test Case 3: Marital Status Married → Single (spouse_income > 0) ✅ SHOULD SHOW PREVIEW
**Setup:**
- User is Married
- spouse_income = ₹50,000 (or any non-zero amount)
- Go to Settings > Personal Info

**Steps:**
1. Change marital status to "Single"

**Expected:**
- ✅ Impact Preview SHOULD appear
- Warning banner: "Important: Spouse Income Will Be Reset"
- Preview should show:
  - Reduced household income
  - Higher required corpus
  - Lower savings rate impact

**Why:** Losing ₹50K monthly income materially affects calculations.

---

### Test Case 4: Dependents 0 → 1 (minimal LIA change)
**Setup:**
- User has 0 dependents
- Age: 35, savings rate: 45% (factors offset each other)

**Steps:**
1. Change dependents from 0 to 1

**Expected:**
- ⚠️ MAY OR MAY NOT show preview (depends on whether LIA changes > threshold)
- If corpus change < ₹50,000: NO preview
- If corpus change > ₹50,000: SHOW preview

**Why:** Dependents affect LIA, but offsetting factors may make change negligible.

---

### Test Case 5: Age change within same SWR bracket (45 → 47)
**Setup:**
- Current age: 45 (SWR = 4.0%)
- FIRE age: 55

**Steps:**
1. Change birth year to make age 47 (stays in 45-55 bracket)

**Expected:**
- ⚠️ LIKELY NO preview unless other factors cause corpus change > ₹50K
- SWR stays at 4.0%
- Age change affects LIA slightly

**Why:** No SWR threshold crossed, minimal LIA change.

---

### Test Case 6: Age change crossing SWR threshold (44 → 45)
**Setup:**
- Current age: 44 (SWR = 3.5%)
- FIRE age: 60

**Steps:**
1. Change birth year to make age 45 (SWR now 4.0%)

**Expected:**
- ✅ Impact Preview SHOULD appear
- Preview should show:
  - SWR: 3.5% → 4.0% (+0.5%)
  - Required corpus decreased significantly (25x → 28.6x multiplier changed)
  - Summary: "✅ Higher safe withdrawal rate (+0.5%) means lower corpus requirement"

**Why:** Crossing SWR threshold (44→45) materially changes corpus calculation.

---

### Test Case 7: City change only
**Setup:**
- Any user profile

**Steps:**
1. Change city from "Mumbai" to "Delhi"
2. Make no other changes

**Expected:**
- ❌ NO Impact Preview (city doesn't affect calculations)
- NO placeholder change

**Why:** City is metadata only, not used in FIRE calculations.

---

## Test Cases - FIRE Goal Modal

### Test Case 8: FIRE age 50 → 51 (same SWR bracket)
**Setup:**
- Current FIRE age: 50 (SWR = 4.0%)
- Current age: 35

**Steps:**
1. Change FIRE target age to 51

**Expected:**
- ✅ Impact Preview SHOULD appear (years-to-FIRE changed)
- Preview should show:
  - Years to FIRE: 15 → 16
  - Corpus may change (more time for growth, but also more inflation)
  - Summary: "✅ 1 more year to save and grow your wealth"

**Why:** Even within same SWR bracket, years-to-FIRE always affects projection.

---

### Test Case 9: FIRE age 55 → 56 (crossing SWR threshold)
**Setup:**
- Current FIRE age: 55 (SWR = 4.0%)
- Current age: 35

**Steps:**
1. Change FIRE target age to 56 (SWR = 4.5%)

**Expected:**
- ✅ Impact Preview SHOULD appear
- Preview should show:
  - Years to FIRE: 20 → 21
  - SWR: 4.0% → 4.5% (+0.5%)
  - Required corpus decreased significantly
  - Summary: "✅ Higher safe withdrawal rate (+0.5%) means lower corpus requirement"
  - Summary: "✅ 1 more year to save and grow your wealth"

**Why:** SWR threshold crossed + year change = material impact.

---

### Test Case 10: Lifestyle Standard → Fat
**Setup:**
- Current lifestyle: Standard
- FIRE age: 50

**Steps:**
1. Change lifestyle type to "Fat FIRE"

**Expected:**
- ✅ Impact Preview SHOULD appear
- Preview should show:
  - Required corpus significantly increased
  - Summary: "⚠️ Higher corpus needs ₹X.XX Cr more - requires aggressive savings or longer timeline"

**Why:** Fat FIRE adds +10% to LIA, significantly increasing corpus requirement.

---

### Test Case 11: Lifestyle Lean → Standard (minor change)
**Setup:**
- Current lifestyle: Lean
- FIRE age: 45

**Steps:**
1. Change lifestyle type to "Standard FIRE"

**Expected:**
- ✅ Impact Preview SHOULD appear (if corpus change > ₹50K threshold)
- Preview should show:
  - Required corpus increased moderately
  - LIA changed from -5% to 0%

**Why:** Lifestyle multiplier changed, affecting corpus calculation.

---

## Test Cases - Impact Preview Component

### Test Case 12: Corpus change ₹2,000 (below threshold)
**Scenario:** Make a change that results in ₹2,000 corpus difference

**Expected:**
- Preview appears (because field changed)
- Corpus section: ₹X.XX Cr → ₹X.XX Cr (no change message below)
- Summary section: MAY NOT appear (if <₹100K threshold)

**Why:** ₹2K is below ₹50K detail threshold and ₹100K summary threshold.

---

### Test Case 13: Corpus change ₹75,000 (above detail, below summary)
**Scenario:** Make a change that results in ₹75,000 corpus difference

**Expected:**
- Preview appears
- Corpus section: Shows change message "±₹0.75 L less/more needed"
- Summary section: MAY NOT appear (if <₹100K threshold)

**Why:** Above ₹50K detail threshold, but below ₹100K summary threshold.

---

### Test Case 14: Corpus change ₹5 Lakh (material change)
**Scenario:** Make a change that results in ₹5,00,000 corpus difference

**Expected:**
- Preview appears
- Corpus section: Shows change message "±₹5.00 L less/more needed"
- Summary section: SHOULD appear
- Summary message: Quantified "Required corpus reduced by ₹5.00 L - easier to achieve" OR "Higher corpus needs ₹5.00 L more - requires aggressive savings or longer timeline"

**Why:** Well above both thresholds (₹50K and ₹100K).

---

### Test Case 15: SWR change 0.05% (negligible)
**Scenario:** Age change within bracket causes tiny LIA change

**Expected:**
- Preview may not appear (if corpus change also <₹50K)
- If appears: SWR section shows no change message (< 0.1% threshold)
- Summary: No SWR mention

**Why:** Below 0.1% SWR threshold.

---

### Test Case 16: SWR change 0.5% (material)
**Scenario:** Crossing SWR bracket (e.g., 44→45 or 55→56)

**Expected:**
- Preview appears
- SWR section: Shows change "+0.5% (better - can withdraw more annually)"
- Summary: "✅ Higher safe withdrawal rate (+0.5%) means lower corpus requirement"

**Why:** Above 0.1% SWR threshold, material impact.

---

## Edge Cases

### Edge Case 1: Multiple offsetting changes
**Scenario:**
- Increase dependents (increases LIA)
- Change lifestyle from Standard to Lean (decreases LIA)
- Net LIA change negligible

**Expected:**
- Preview may not appear if net corpus change < ₹50K

**Test:**
1. Go to Personal Info, increase dependents by 1
2. Go to FIRE Goal, change to Lean FIRE
3. Check if preview appears based on final calculations

---

### Edge Case 2: Rapid field changes
**Scenario:** User rapidly changes slider (FIRE age 50 → 51 → 52 → 53)

**Expected:**
- Preview updates smoothly with each change
- No flickering or stale data
- useEffect properly debounced

---

### Edge Case 3: Modal re-open after save
**Scenario:**
1. Make changes, save
2. Re-open modal without page refresh

**Expected:**
- Form resets to new saved values
- No preview appears initially (hasChanges = false)
- Baseline metrics updated to new values

---

## Regression Tests - Ensure Existing Features Still Work

### Regression 1: Spouse income warning (Married → Single with spouse income)
**Expected:** Warning banner still appears when it should

### Regression 2: Validation errors
**Expected:** All validation errors still work (FIRE age > current age, etc.)

### Regression 3: Database updates
**Expected:** All fields save correctly, FIRE metrics recalculated

### Regression 4: Impact Preview animations
**Expected:** Smooth fade in/out with Framer Motion

---

## Testing Methodology

1. **Setup Test User:**
   - Create user with known baseline:
     - Age: 35
     - Marital: Single
     - Dependents: 0
     - Monthly income: ₹100,000
     - Spouse income: ₹0
     - Monthly expenses: ₹50,000
     - FIRE age: 50
     - Lifestyle: Standard

2. **Test Each Case:**
   - Navigate to appropriate modal
   - Make specified change
   - Observe preview behavior
   - Check thresholds
   - Validate messages

3. **Expected Outcomes:**
   - ✅ Test Case 1 (PRIMARY BUG): NO preview for Single→Married with spouse_income=0
   - ✅ All preview appearances based on meaningful thresholds
   - ✅ Quantified summary messages
   - ✅ No false positives

---

## Success Criteria

✅ **All test cases pass:**
- No preview for marital status changes with spouse_income=0
- Preview only appears when calculations meaningfully change
- Thresholds prevent noise (>₹50K corpus, >0.1% SWR)
- Summary messages quantified and gated by ₹100K threshold
- No regression in existing functionality

✅ **User Experience Improved:**
- No misleading "easier to achieve" messages
- Clear, actionable feedback
- Trust in preview system restored

---

## Completed Test Results

Date: _____________
Tester: _____________

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Single→Married (spouse=0) | ☐ Pass ☐ Fail | |
| 2. Married→Single (spouse=0) | ☐ Pass ☐ Fail | |
| 3. Married→Single (spouse>0) | ☐ Pass ☐ Fail | |
| 4. Dependents change | ☐ Pass ☐ Fail | |
| 5. Age change (no SWR cross) | ☐ Pass ☐ Fail | |
| 6. Age change (SWR cross) | ☐ Pass ☐ Fail | |
| 7. City change only | ☐ Pass ☐ Fail | |
| 8. FIRE age (same bracket) | ☐ Pass ☐ Fail | |
| 9. FIRE age (SWR cross) | ☐ Pass ☐ Fail | |
| 10. Lifestyle Standard→Fat | ☐ Pass ☐ Fail | |
| 11. Lifestyle Lean→Standard | ☐ Pass ☐ Fail | |
| 12. Corpus ₹2K | ☐ Pass ☐ Fail | |
| 13. Corpus ₹75K | ☐ Pass ☐ Fail | |
| 14. Corpus ₹5L | ☐ Pass ☐ Fail | |
| 15. SWR 0.05% | ☐ Pass ☐ Fail | |
| 16. SWR 0.5% | ☐ Pass ☐ Fail | |
| Edge Case 1: Offsetting | ☐ Pass ☐ Fail | |
| Edge Case 2: Rapid changes | ☐ Pass ☐ Fail | |
| Edge Case 3: Modal re-open | ☐ Pass ☐ Fail | |
| Regression 1: Warning banner | ☐ Pass ☐ Fail | |
| Regression 2: Validation | ☐ Pass ☐ Fail | |
| Regression 3: Save | ☐ Pass ☐ Fail | |
| Regression 4: Animations | ☐ Pass ☐ Fail | |
