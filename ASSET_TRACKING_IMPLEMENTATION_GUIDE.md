# Asset Tracking System - Implementation Guide

## 🎯 Current Status

**✅ Phase 1: Foundation (COMPLETED)**
- Database schema with 5 tables
- 26 sub-classes with historical returns
- AI classification engine
- Duplicate detection
- File parsers (CSV, Excel, PDF)

**🚧 Phase 2: API Layer (IN PROGRESS)**

**⏳ Phase 3: Frontend (PENDING)**

**⏳ Phase 4: Integration (PENDING)**

---

## 🛠️ Phase 2: API Routes Implementation

### Directory Structure

```
app/api/assets/
├── upload/
│   └── route.ts              # POST: Upload & parse files
├── parse/
│   └── route.ts              # POST: Parse files, classify, detect duplicates
├── save/
│   └── route.ts              # POST: Save reviewed assets to DB
├── route.ts                  # GET: List assets for user
├── [id]/
│   └── route.ts              # PATCH/DELETE: Update or delete asset
├── snapshots/
│   ├── route.ts              # GET: List snapshots for user
│   └── [id]/
│       └── route.ts          # GET: Get specific snapshot details
├── compare/
│   └── route.ts              # POST: Compare two snapshots
└── subclasses/
    └── route.ts              # GET: Get sub-class options
```

### Implementation Checklist

#### 1. Upload & Parse Route (`/api/assets/upload`)

**Purpose:** Handle file upload, parse, classify, and detect duplicates

**Implementation Steps:**
```typescript
// app/api/assets/upload/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  parseFiles,
  classifyAssetsBatch,
  detectDuplicatesBatch,
  mergeAssetsFromFiles,
} from '@/app/lib/assets';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createClient(/* ... */);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse form data with files
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    // 3. Parse files
    const parseResults = await parseFiles(files, { maxFiles: 10 });

    // 4. Merge assets from all files
    const allRawAssets = mergeAssetsFromFiles(
      parseResults.results
        .filter((r) => r.success)
        .map((r) => ({ assets: r.assets, fileName: r.file.name }))
    );

    // 5. Get sub-class mappings from DB
    const { data: subclassMappings } = await supabase
      .from('asset_subclass_mapping')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    // 6. Classify assets using AI
    const classifiedAssets = await classifyAssetsBatch(
      allRawAssets,
      subclassMappings
    );

    // 7. Get existing assets for duplicate detection
    const { data: existingAssets } = await supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000); // Get recent assets

    // 8. Detect duplicates
    const reviewAssets = detectDuplicatesBatch(
      classifiedAssets,
      existingAssets || []
    );

    // 9. Log upload
    await supabase.from('upload_logs').insert({
      user_id: user.id,
      file_name: files.map((f) => f.name).join(', '),
      file_type: 'multiple',
      status: 'completed',
      assets_extracted: reviewAssets.length,
    });

    // 10. Return results for review
    return NextResponse.json({
      success: true,
      assets: reviewAssets,
      file_summary: {
        total_files: files.length,
        successful: parseResults.successCount,
        failed: parseResults.failureCount,
        total_assets: reviewAssets.length,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
```

**Key Points:**
- Use multipart/form-data for file uploads
- Process files sequentially to avoid API rate limits
- Return reviewAssets (with duplicates flagged) for frontend confirmation
- Don't save to DB yet - let user review first

---

#### 2. Save Assets Route (`/api/assets/save`)

**Purpose:** Save user-reviewed assets to database

**Implementation Steps:**
```typescript
// app/api/assets/save/route.ts

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const user = await authenticateUser();

    // 2. Parse request body
    const { assets, source_files, notes } = await request.json();

    // 3. Start transaction (create snapshot first)
    const supabase = createClient();

    // Calculate totals by class
    const totals = calculateClassTotals(assets);

    // 4. Create snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from('asset_snapshots')
      .insert({
        user_id: user.id,
        snapshot_date: new Date().toISOString(),
        total_networth: totals.total,
        equity_total: totals.equity,
        debt_total: totals.debt,
        cash_total: totals.cash,
        real_estate_total: totals.real_estate,
        other_assets_total: totals.other,
        source_type: 'upload',
        source_files,
        notes,
      })
      .select()
      .single();

    if (snapshotError) throw snapshotError;

    // 5. Insert assets
    const assetsToInsert = assets.map((asset) => ({
      user_id: user.id,
      snapshot_id: snapshot.id,
      asset_name: asset.asset_name,
      asset_class: asset.asset_class,
      asset_subclass: asset.asset_subclass,
      current_value: asset.current_value,
      quantity: asset.quantity,
      purchase_price: asset.purchase_price,
      purchase_date: asset.purchase_date,
      risk_level: asset.risk_level,
      expected_return_percentage: asset.expected_return_percentage,
      source_file: asset.source_file,
      ai_confidence_score: asset.ai_confidence_score,
      is_manually_verified: true, // User reviewed it
      notes: asset.notes,
    }));

    const { error: assetsError } = await supabase
      .from('assets')
      .insert(assetsToInsert);

    if (assetsError) throw assetsError;

    // 6. Update user_profiles with new totals (for backward compatibility)
    await supabase
      .from('user_profiles')
      .update({
        equity: totals.equity,
        debt: totals.debt,
        cash: totals.cash,
        real_estate: totals.real_estate,
        other_assets: totals.other,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    // 7. Recalculate FIRE metrics (call existing utility)
    // TODO: Update FIRE calculations to use weighted returns

    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      assets_saved: assets.length,
      snapshot,
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json(
      { error: 'Failed to save assets' },
      { status: 500 }
    );
  }
}

function calculateClassTotals(assets) {
  return assets.reduce(
    (acc, asset) => {
      acc[asset.asset_class] = (acc[asset.asset_class] || 0) + asset.current_value;
      acc.total += asset.current_value;
      return acc;
    },
    { equity: 0, debt: 0, cash: 0, real_estate: 0, other: 0, total: 0 }
  );
}
```

---

#### 3. List Assets Route (`/api/assets`)

**Purpose:** Get all assets for user (optionally filtered by snapshot)

```typescript
// app/api/assets/route.ts

export async function GET(request: NextRequest) {
  const user = await authenticateUser();
  const searchParams = request.nextUrl.searchParams;
  const snapshotId = searchParams.get('snapshot_id');

  const supabase = createClient();
  let query = supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (snapshotId) {
    query = query.eq('snapshot_id', snapshotId);
  }

  const { data: assets, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }

  return NextResponse.json({ success: true, assets });
}
```

---

#### 4. Get Snapshots Route (`/api/assets/snapshots`)

**Purpose:** Get all snapshots for user

```typescript
// app/api/assets/snapshots/route.ts

export async function GET(request: NextRequest) {
  const user = await authenticateUser();

  const supabase = createClient();
  const { data: snapshots, error } = await supabase
    .from('asset_snapshots')
    .select('*')
    .eq('user_id', user.id)
    .order('snapshot_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 });
  }

  return NextResponse.json({ success: true, snapshots });
}
```

---

#### 5. Get Sub-Classes Route (`/api/assets/subclasses`)

**Purpose:** Get all active sub-class mappings for dropdown selectors

```typescript
// app/api/assets/subclasses/route.ts

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: subclasses, error } = await supabase
    .from('asset_subclass_mapping')
    .select('*')
    .eq('is_active', true)
    .order('asset_class', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch sub-classes' }, { status: 500 });
  }

  // Group by asset class
  const grouped = subclasses.reduce((acc, sc) => {
    if (!acc[sc.asset_class]) {
      acc[sc.asset_class] = [];
    }
    acc[sc.asset_class].push(sc);
    return acc;
  }, {});

  return NextResponse.json({ success: true, subclasses, grouped });
}
```

---

## 🎨 Phase 3: Frontend Components

### Directory Structure

```
app/dashboard/assets/
├── page.tsx                              # Asset Hub main page
├── components/
│   ├── asset-hub-overview.tsx            # Top stats + quick actions
│   ├── asset-breakdown-section.tsx       # Expandable class/subclass tree
│   ├── asset-item-card.tsx               # Individual asset display
│   ├── upload-modal.tsx                  # File upload UI
│   ├── processing-screen.tsx             # AI processing feedback
│   ├── review-assets-modal.tsx           # Review & confirm extracted assets
│   ├── edit-mapping-dialog.tsx           # Edit asset class/subclass
│   ├── duplicate-resolver.tsx            # Resolve duplicate assets
│   ├── add-asset-manual-modal.tsx        # Manual entry form
│   ├── snapshot-history.tsx              # Timeline of snapshots
│   ├── snapshot-comparison.tsx           # Compare 2 snapshots
│   └── asset-breakdown-chart.tsx         # Enhanced pie/bar charts
└── hooks/
    ├── use-asset-upload.ts               # Handle file upload + AI processing
    ├── use-asset-snapshots.ts            # Fetch snapshot history
    └── use-asset-management.ts           # CRUD operations for assets
```

### Key Component Patterns

#### Upload Modal (Drag & Drop)

```typescript
// app/dashboard/assets/components/upload-modal.tsx

'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Loader2 } from 'lucide-react';

export function UploadModal({ isOpen, onClose, onSuccess }) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles(droppedFiles);
  };

  const handleUpload = async () => {
    setUploading(true);
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    try {
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.assets); // Pass to review modal
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Asset Statements</DialogTitle>
        </DialogHeader>

        <div
          className="border-2 border-dashed rounded-lg p-8 text-center"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {uploading ? (
            <div className="space-y-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
              <p>Processing {progress.current} of {progress.total} files...</p>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium">Drag & drop files here</p>
              <p className="text-sm text-gray-500">or click to browse</p>
              <input
                type="file"
                multiple
                accept=".pdf,.csv,.xlsx,.xls"
                onChange={(e) => setFiles(Array.from(e.target.files || []))}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="inline-block mt-4 px-4 py-2 bg-emerald-500 text-white rounded cursor-pointer"
              >
                Select Files
              </label>
            </>
          )}
        </div>

        {files.length > 0 && !uploading && (
          <div className="space-y-2">
            <p className="font-medium">{files.length} files selected:</p>
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4" />
                <span>{file.name}</span>
                <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
              </div>
            ))}
            <button
              onClick={handleUpload}
              className="w-full mt-4 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
            >
              Upload & Process
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

---

#### Review Assets Modal

```typescript
// app/dashboard/assets/components/review-assets-modal.tsx

'use client';

import { useState } from 'react';
import { ReviewAsset } from '@/app/lib/assets';

export function ReviewAssetsModal({ assets, onSave, onCancel }) {
  const [selectedAssets, setSelectedAssets] = useState(assets);
  const [editingAsset, setEditingAsset] = useState<ReviewAsset | null>(null);

  const duplicateCount = assets.filter((a) => a.is_duplicate).length;

  const handleSave = async () => {
    const assetsToSave = selectedAssets.filter((a) => a.is_selected && !a.is_duplicate);

    const response = await fetch('/api/assets/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assets: assetsToSave,
        source_files: [...new Set(assets.map((a) => a.source_file))],
        notes: 'Uploaded via Asset Hub',
      }),
    });

    const data = await response.json();

    if (data.success) {
      onSave(data.snapshot);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Extracted Assets ({assets.length} found)</DialogTitle>
        </DialogHeader>

        {duplicateCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
            <p className="text-amber-800">
              ⚠️ {duplicateCount} potential duplicates detected. Review before saving.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {selectedAssets.map((asset) => (
            <div
              key={asset.id}
              className={`border rounded p-4 ${
                asset.is_duplicate ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  checked={asset.is_selected}
                  onChange={(e) => {
                    setSelectedAssets((prev) =>
                      prev.map((a) =>
                        a.id === asset.id ? { ...a, is_selected: e.target.checked } : a
                      )
                    );
                  }}
                  className="mt-1"
                />

                <div className="flex-1">
                  <h4 className="font-medium">{asset.asset_name}</h4>
                  <p className="text-sm text-gray-600">₹{asset.current_value.toLocaleString('en-IN')}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                      {asset.asset_class} → {asset.asset_subclass}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      Confidence: {(asset.ai_confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>

                  {asset.is_duplicate && asset.duplicate_matches && (
                    <div className="mt-3 p-2 bg-white rounded border border-amber-200">
                      <p className="text-sm font-medium text-amber-800">Similar assets found:</p>
                      {asset.duplicate_matches.map((match, i) => (
                        <p key={i} className="text-xs text-amber-700 mt-1">
                          • {match.existing_asset_name} (₹{match.existing_value.toLocaleString('en-IN')})
                          - {(match.similarity_score * 100).toFixed(0)}% match
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setEditingAsset(asset)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Edit Mapping
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
          >
            Save {selectedAssets.filter((a) => a.is_selected && !a.is_duplicate).length} Assets
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔗 Phase 4: Integration with FIRE Calculations

### Weighted Portfolio Return Calculation

**Update:** `app/onboarding/utils/fire-calculations.ts`

```typescript
// Add new function to calculate weighted portfolio return

export async function calculatePortfolioReturn(userId: string): Promise<number> {
  const supabase = createClient();

  // Get latest snapshot
  const { data: snapshot } = await supabase
    .from('asset_snapshots')
    .select('id, total_networth')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false })
    .limit(1)
    .single();

  if (!snapshot || snapshot.total_networth === 0) {
    return 12.0; // Default fallback
  }

  // Get assets for that snapshot
  const { data: assets } = await supabase
    .from('assets')
    .select('current_value, asset_subclass, expected_return_percentage')
    .eq('snapshot_id', snapshot.id)
    .eq('is_duplicate', false);

  if (!assets || assets.length === 0) {
    return 12.0; // Default fallback
  }

  // Calculate weighted return
  let weightedReturn = 0;
  for (const asset of assets) {
    const allocation = asset.current_value / snapshot.total_networth;
    const returnContribution = allocation * asset.expected_return_percentage;
    weightedReturn += returnContribution;
  }

  // Round to 1 decimal place
  return Math.round(weightedReturn * 10) / 10;
}
```

**Update FIRE calculations to use this:**

```typescript
export async function calculateFireMetrics(profileData, userId) {
  // ... existing code ...

  // Replace hardcoded 12% with weighted return
  const portfolioReturn = await calculatePortfolioReturn(userId);
  const preRetirementReturns = portfolioReturn / 100; // Convert to decimal

  // Use in corpus projection
  const projectedCorpusAtFire = calculateFutureValue(
    currentNetworth,
    monthlySavings,
    preRetirementReturns,
    yearsToFire
  );

  // ... rest of calculation ...
}
```

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] CSV parser handles Indian number formatting (₹1,00,000)
- [ ] Excel parser handles date serial numbers correctly
- [ ] PDF parser extracts assets from text-based PDFs
- [ ] AI classification correctly maps common asset names
- [ ] Duplicate detection catches exact matches and fuzzy matches
- [ ] Weighted return calculation is mathematically correct

### Integration Tests

- [ ] Upload flow: file → parse → classify → review → save
- [ ] Duplicate detection works across multiple uploads
- [ ] Snapshot creation updates user_profiles totals
- [ ] FIRE calculations use weighted returns instead of 12%
- [ ] Asset Hub displays correct allocation breakdown
- [ ] Edit asset mapping updates AI confidence to 1.0 (manually verified)

### End-to-End Tests

- [ ] User uploads Zerodha statement PDF → sees extracted stocks
- [ ] User uploads Groww portfolio CSV → sees MF holdings
- [ ] User reviews assets, edits 1 mapping, saves all
- [ ] Dashboard shows updated net worth
- [ ] FIRE timeline reflects new weighted return (e.g., 13.2% instead of 12%)
- [ ] User creates second snapshot, compares with first
- [ ] User manually adds gold asset, sees it in "Other" category

---

## 🚀 Deployment Steps

1. **Run database migration:**
   ```bash
   psql -d your_database < add-asset-tracking-system.sql
   ```

2. **Verify seed data:**
   ```sql
   SELECT count(*) FROM asset_subclass_mapping; -- Should be 26
   SELECT count(*) FROM asset_subclass_returns; -- Should be ~300 (10 years × ~30 sub-classes)
   ```

3. **Set environment variables:**
   ```bash
   OPENAI_API_KEY=sk-... # Required for AI parsing & classification
   ```

4. **Install dependencies:**
   ```bash
   npm install papaparse xlsx fuzzball pdf-parse
   npm install --save-dev @types/papaparse @types/pdf-parse
   ```

5. **Deploy API routes** (implement routes as per Phase 2)

6. **Deploy frontend components** (implement as per Phase 3)

7. **Update FIRE calculations** (integrate weighted returns as per Phase 4)

8. **Test with real data:**
   - Upload a real broker statement
   - Verify assets are correctly classified
   - Check that FIRE calculations use new weighted return

---

## 💡 Design Decisions & Rationale

### Why Instrument-Based Taxonomy (Not Risk-Based)?

**Chosen:** Direct Stocks, Index Funds, Equity MFs, etc.
**Rejected:** High-Risk Equity, Medium-Risk Equity, etc.

**Reason:**
- Instrument type is objective (ICICI Nifty 50 is clearly an "Index Fund")
- Risk level is subjective and changes with market conditions
- Easier for AI to classify based on keywords
- Users understand "Index Funds" better than "Medium-Risk Equity"
- Risk level is a property of the sub-class, not the sub-class itself

### Why Snapshot-Based (Not Live Updates)?

**Chosen:** Create snapshot on each upload
**Rejected:** Always show latest values, maintain edit history

**Reason:**
- Clear historical tracking ("Your net worth on Jan 1 was X")
- Easier duplicate detection (compare against specific snapshot)
- No complex state management for "current" vs "historical" data
- User has full control over when snapshots are created
- Aligns with user goal: "Track net worth over time"

### Why AI Classification (Not Just Rule-Based)?

**Chosen:** GPT-4o-mini for classification + rule-based fallback
**Rejected:** Only keyword matching

**Reason:**
- Handles edge cases ("HDFC Nifty Next 50 Index Fund" → correctly identified as Index Fund, not "other")
- Learns from user edits over time (future enhancement)
- Better accuracy for ambiguous assets ("Balanced Advantage Fund" → Arbitrage/Hybrid, not Equity)
- Rule-based fallback ensures speed and cost-efficiency for common cases

### Why 85% Similarity Threshold for Duplicates?

**Chosen:** 85% fuzzy match threshold
**Rejected:** 90% (too strict) or 75% (too lenient)

**Reason:**
- 85% catches "Reliance Industries" vs "Reliance Ind Ltd" (typos, abbreviations)
- Doesn't flag "Reliance" vs "Tata" (clearly different companies)
- Weighted scoring (70% name + 30% value) ensures value similarity also matters
- User can override false positives in review UI

---

## 📊 Success Metrics

After implementation, measure:

1. **Adoption Rate:** % of users who upload at least 1 statement
2. **Upload Success Rate:** % of uploads that successfully extract assets
3. **AI Classification Accuracy:** % of assets NOT manually edited
4. **Duplicate Detection Accuracy:** % of flagged duplicates confirmed by user
5. **Time Saved:** Avg time to complete asset entry (before: ~15 min manual, after: ~3 min upload)
6. **FIRE Calculation Accuracy:** Difference between 12% blanket vs weighted return

**Target Metrics (Month 1):**
- 30% of users upload statements
- 85% upload success rate
- 75% AI classification accuracy
- 80% duplicate detection accuracy
- 80% time saved
- ±2% difference in FIRE calculations (weighted return between 10-14%)

---

## 🐛 Known Limitations & Future Enhancements

### Current Limitations

1. **PDF Parsing:** Only text-based PDFs supported (not image-based scanned documents)
   - **Workaround:** Users can upload CSV exports from brokers

2. **Single Sheet Excel:** Only parses first sheet
   - **Enhancement:** Add sheet selector in upload UI

3. **No Real-Time Sync:** Users must manually upload statements
   - **Enhancement:** Connect to broker APIs (Zerodha Kite, Groww, etc.)

4. **No Gains Tracking:** Can't track capital gains or investment returns yet
   - **Enhancement:** Add "cost basis" and "returns" columns

5. **No Tax Optimization:** Doesn't suggest tax-efficient withdrawal strategies
   - **Enhancement:** Add tax calculator for LTCG/STCG

### Future Enhancements (Phase 5+)

- [ ] Auto-sync with broker APIs (Zerodha, Groww, Upstox)
- [ ] Image-based PDF parsing (OCR with Tesseract + GPT-4 Vision)
- [ ] Multi-sheet Excel support with sheet selector
- [ ] Asset performance tracking (cost basis → current value → % gain)
- [ ] Tax optimization calculator (LTCG, STCG, tax harvesting)
- [ ] Rebalancing recommendations ("Move ₹2L from Direct Stocks to Index Funds")
- [ ] Goal-based asset allocation ("House down payment in 2 years → move to liquid funds")
- [ ] Asset alerts ("Stock dropped 15%, review allocation")
- [ ] Mobile app for on-the-go uploads

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue:** "CSV upload fails with 'No assets found'"
- **Cause:** CSV doesn't have columns named "asset" or "value"
- **Fix:** Rename columns or use column mapping UI (future enhancement)

**Issue:** "PDF parsing very slow (30+ seconds)"
- **Cause:** Large PDF with many pages (GPT-4o token limits)
- **Fix:** Split PDF into smaller files or use CSV export

**Issue:** "Duplicate detection not catching obvious duplicates"
- **Cause:** Asset names too different ("Reliance" vs "RIL")
- **Fix:** Lower similarity threshold to 80% or manually merge

**Issue:** "AI classification is wrong"
- **Cause:** Ambiguous asset name or missing keywords
- **Fix:** User edits mapping in review UI → system learns over time (future)

---

## 🎉 Next Steps

You've completed the **foundation layer**! 🚀

**Immediate next actions:**
1. Implement API routes (Phase 2) - Start with `/api/assets/upload`
2. Build upload modal (Phase 3) - Test file upload → parse → classify
3. Build review UI (Phase 3) - Test duplicate detection and manual edits
4. Integrate with FIRE calculations (Phase 4) - Verify weighted return works

**Want me to continue implementation?**
Ask me to:
- "Implement the upload API route"
- "Build the upload modal component"
- "Create the review assets UI"
- Or continue with any specific piece!

---

## 📚 Additional Resources

- **Sub-Class Taxonomy:** See `asset_subclass_mapping` table seed data in migration file
- **Historical Returns:** See `asset_subclass_returns` table seed data (2015-2024)
- **Type Definitions:** `app/lib/assets/types.ts` - Comprehensive TypeScript types
- **AI Classification:** `app/lib/assets/classify-asset.ts` - GPT-4o-mini integration
- **Duplicate Detection:** `app/lib/assets/detect-duplicates.ts` - Fuzzy matching algorithm
- **File Parsers:** `app/lib/assets/parse-*.ts` - CSV, Excel, PDF parsing logic

**Questions?** Ask me anything about the implementation! 🤖
