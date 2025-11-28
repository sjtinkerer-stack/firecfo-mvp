// API Route: Save reviewed assets to database
// POST /api/assets/save

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  ClassifiedAsset,
  AssetClass,
  StatementDateConfidence,
  StatementDateSource,
  generateSnapshotName,
} from '@/app/lib/assets';

interface SaveAssetsRequest {
  assets: ClassifiedAsset[];
  source_files: string[];
  notes?: string;
  snapshot_date?: string; // Timestamp when saving (defaults to now)
  statement_date?: string; // Date the financial statement represents
  statement_date_confidence?: StatementDateConfidence; // Confidence in statement_date
  statement_date_source?: StatementDateSource; // Where statement_date came from
  snapshot_name?: string; // User-friendly name for snapshot
  merge_with_existing?: boolean; // Whether to merge with existing snapshot (if found)
  target_snapshot_id?: string; // Explicitly specify snapshot to merge into
}

/**
 * Calculate totals by asset class
 */
function calculateClassTotals(assets: ClassifiedAsset[]): {
  equity: number;
  debt: number;
  cash: number;
  real_estate: number;
  other: number;
  total: number;
} {
  return assets.reduce(
    (acc, asset) => {
      const value = asset.current_value;
      switch (asset.asset_class) {
        case 'equity':
          acc.equity += value;
          break;
        case 'debt':
          acc.debt += value;
          break;
        case 'cash':
          acc.cash += value;
          break;
        case 'real_estate':
          acc.real_estate += value;
          break;
        case 'other':
          acc.other += value;
          break;
      }
      acc.total += value;
      return acc;
    },
    { equity: 0, debt: 0, cash: 0, real_estate: 0, other: 0, total: 0 }
  );
}

export async function POST(request: NextRequest) {
  try {
    // 1. Create Supabase client with cookies
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // 2. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: SaveAssetsRequest = await request.json();
    const {
      assets,
      source_files,
      notes,
      snapshot_date,
      statement_date,
      statement_date_confidence,
      statement_date_source,
      snapshot_name,
      merge_with_existing,
      target_snapshot_id,
    } = body;

    if (!assets || assets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets provided' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving ${assets.length} assets for user ${user.id}`);

    // 3. Calculate totals by asset class
    const totals = calculateClassTotals(assets);

    console.log(
      `  Totals: Equity=₹${totals.equity.toLocaleString('en-IN')}, Debt=₹${totals.debt.toLocaleString('en-IN')}, Cash=₹${totals.cash.toLocaleString('en-IN')}`
    );

    // 4. Determine if we should merge with existing snapshot or create new
    let snapshot: any;
    let isNewSnapshot = true;

    if (target_snapshot_id) {
      // Explicitly merge into specified snapshot
      console.log(`🔄 Merging into existing snapshot: ${target_snapshot_id}`);

      const { data: existingSnapshot, error: fetchError } = await supabase
        .from('asset_snapshots')
        .select('*')
        .eq('id', target_snapshot_id)
        .eq('user_id', user.id) // Security: ensure user owns this snapshot
        .single();

      if (fetchError || !existingSnapshot) {
        return NextResponse.json(
          { success: false, error: 'Target snapshot not found' },
          { status: 404 }
        );
      }

      // Update totals (add new assets to existing totals)
      const { data: updatedSnapshot, error: updateError } = await supabase
        .from('asset_snapshots')
        .update({
          total_networth: existingSnapshot.total_networth + totals.total,
          equity_total: existingSnapshot.equity_total + totals.equity,
          debt_total: existingSnapshot.debt_total + totals.debt,
          cash_total: existingSnapshot.cash_total + totals.cash,
          real_estate_total: existingSnapshot.real_estate_total + totals.real_estate,
          other_assets_total: existingSnapshot.other_assets_total + totals.other,
          source_files: [
            ...(existingSnapshot.source_files || []),
            ...source_files,
          ], // Append new files
          updated_at: new Date().toISOString(),
        })
        .eq('id', target_snapshot_id)
        .select()
        .single();

      if (updateError) {
        console.error('Failed to update snapshot:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to merge with existing snapshot' },
          { status: 500 }
        );
      }

      snapshot = updatedSnapshot;
      isNewSnapshot = false;
      console.log(`✅ Updated snapshot: ${snapshot.id}`);
    } else if (merge_with_existing && statement_date) {
      // Auto-merge: find snapshot with same statement_date
      console.log(`🔍 Searching for existing snapshot with statement_date: ${statement_date}`);

      const { data: existingSnapshot } = await supabase
        .from('asset_snapshots')
        .select('*')
        .eq('user_id', user.id)
        .eq('statement_date', statement_date)
        .single();

      if (existingSnapshot) {
        console.log(`🔄 Found matching snapshot, merging: ${existingSnapshot.id}`);

        // Update totals
        const { data: updatedSnapshot, error: updateError } = await supabase
          .from('asset_snapshots')
          .update({
            total_networth: existingSnapshot.total_networth + totals.total,
            equity_total: existingSnapshot.equity_total + totals.equity,
            debt_total: existingSnapshot.debt_total + totals.debt,
            cash_total: existingSnapshot.cash_total + totals.cash,
            real_estate_total: existingSnapshot.real_estate_total + totals.real_estate,
            other_assets_total: existingSnapshot.other_assets_total + totals.other,
            source_files: [
              ...(existingSnapshot.source_files || []),
              ...source_files,
            ],
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSnapshot.id)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update snapshot:', updateError);
          return NextResponse.json(
            { success: false, error: 'Failed to merge with existing snapshot' },
            { status: 500 }
          );
        }

        snapshot = updatedSnapshot;
        isNewSnapshot = false;
        console.log(`✅ Updated snapshot: ${snapshot.id}`);
      } else {
        // No matching snapshot found, create new
        console.log(`📝 No matching snapshot found, creating new snapshot`);
        isNewSnapshot = true;
      }
    }

    // 5. Create new snapshot if not merging
    if (isNewSnapshot) {
      // Generate snapshot name from statement_date if not provided
      const finalSnapshotName =
        snapshot_name ||
        (statement_date ? generateSnapshotName(statement_date) : undefined);

      const { data: newSnapshot, error: snapshotError } = await supabase
        .from('asset_snapshots')
        .insert({
          user_id: user.id,
          snapshot_date: snapshot_date || new Date().toISOString(),
          statement_date: statement_date || null,
          snapshot_name: finalSnapshotName || null,
          statement_date_confidence: statement_date_confidence || null,
          statement_date_source: statement_date_source || null,
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

      if (snapshotError) {
        console.error('Failed to create snapshot:', snapshotError);
        return NextResponse.json(
          { success: false, error: 'Failed to create snapshot' },
          { status: 500 }
        );
      }

      snapshot = newSnapshot;
      console.log(`✅ Created snapshot: ${snapshot.id}`);
    }

    // 6. Prepare assets for insertion
    const assetsToInsert = assets.map((asset) => ({
      user_id: user.id,
      snapshot_id: snapshot.id,
      asset_name: asset.asset_name,
      asset_class: asset.asset_class,
      asset_subclass: asset.asset_subclass,
      current_value: asset.current_value,
      quantity: asset.quantity || null,
      purchase_price: asset.purchase_price || null,
      purchase_date: asset.purchase_date || null,
      risk_level: asset.risk_level,
      expected_return_percentage: asset.expected_return_percentage,
      source_file: asset.source_file || null,
      ai_confidence_score: asset.ai_confidence_score,
      is_manually_verified: true, // User reviewed these in the UI
      is_duplicate: false, // User confirmed these are not duplicates
      notes: asset.notes || null,
    }));

    // 7. Insert assets in batches (Supabase has a limit on batch inserts)
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < assetsToInsert.length; i += BATCH_SIZE) {
      const batch = assetsToInsert.slice(i, i + BATCH_SIZE);
      const { error: assetsError } = await supabase.from('assets').insert(batch);

      if (assetsError) {
        console.error(`Failed to insert assets batch ${i / BATCH_SIZE + 1}:`, assetsError);
        // Rollback: delete the snapshot
        await supabase.from('asset_snapshots').delete().eq('id', snapshot.id);
        return NextResponse.json(
          { success: false, error: 'Failed to save assets' },
          { status: 500 }
        );
      }

      insertedCount += batch.length;
      console.log(`  Inserted ${insertedCount}/${assetsToInsert.length} assets`);
    }

    console.log(`✅ Saved ${insertedCount} assets`);

    // 8. Update user_profiles with latest totals (for backward compatibility with existing dashboard)
    // Use the snapshot's totals (which include merged assets if applicable)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        equity: snapshot.equity_total,
        debt: snapshot.debt_total,
        cash: snapshot.cash_total,
        real_estate: snapshot.real_estate_total,
        other_assets: snapshot.other_assets_total,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (profileError) {
      console.error('Failed to update user profile:', profileError);
      // Don't fail the request, just log the error
    } else {
      console.log(`✅ Updated user_profiles with latest totals`);
    }

    // 9. TODO: Recalculate FIRE metrics with weighted returns
    // This will be implemented in Phase 4

    // 10. Return success with snapshot details
    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      assets_saved: insertedCount,
      is_merged: !isNewSnapshot, // NEW: indicate if this was a merge operation
      snapshot: {
        id: snapshot.id,
        snapshot_date: snapshot.snapshot_date,
        statement_date: snapshot.statement_date, // NEW
        snapshot_name: snapshot.snapshot_name, // NEW
        total_networth: snapshot.total_networth,
        equity_total: snapshot.equity_total,
        debt_total: snapshot.debt_total,
        cash_total: snapshot.cash_total,
        real_estate_total: snapshot.real_estate_total,
        other_assets_total: snapshot.other_assets_total,
      },
      message: isNewSnapshot
        ? `Successfully created snapshot with ${insertedCount} assets. Net worth: ₹${snapshot.total_networth.toLocaleString('en-IN')}`
        : `Successfully merged ${insertedCount} assets into existing snapshot. Updated net worth: ₹${snapshot.total_networth.toLocaleString('en-IN')}`,
    });
  } catch (error) {
    console.error('❌ Save API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save assets',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
