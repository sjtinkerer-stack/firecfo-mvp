// API Route: Save reviewed assets to database
// POST /api/assets/save

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ClassifiedAsset, AssetClass } from '@/app/lib/assets';

interface SaveAssetsRequest {
  assets: ClassifiedAsset[];
  source_files: string[];
  notes?: string;
  snapshot_date?: string;
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
    const { assets, source_files, notes, snapshot_date } = body;

    if (!assets || assets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets provided' },
        { status: 400 }
      );
    }

    console.log(`💾 Saving ${assets.length} assets for user ${user.id}`);

    // 3. Calculate totals by asset class
    const totals = calculateClassTotals(assets);

    console.log(`  Totals: Equity=₹${totals.equity.toLocaleString('en-IN')}, Debt=₹${totals.debt.toLocaleString('en-IN')}, Cash=₹${totals.cash.toLocaleString('en-IN')}`);

    // 4. Create snapshot record
    const { data: snapshot, error: snapshotError } = await supabase
      .from('asset_snapshots')
      .insert({
        user_id: user.id,
        snapshot_date: snapshot_date || new Date().toISOString(),
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

    console.log(`✅ Created snapshot: ${snapshot.id}`);

    // 5. Prepare assets for insertion
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

    // 6. Insert assets in batches (Supabase has a limit on batch inserts)
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

    // 7. Update user_profiles with new totals (for backward compatibility with existing dashboard)
    const { error: profileError } = await supabase
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

    if (profileError) {
      console.error('Failed to update user profile:', profileError);
      // Don't fail the request, just log the error
    } else {
      console.log(`✅ Updated user_profiles with new totals`);
    }

    // 8. TODO: Recalculate FIRE metrics with weighted returns
    // This will be implemented in Phase 4

    // 9. Return success with snapshot details
    return NextResponse.json({
      success: true,
      snapshot_id: snapshot.id,
      assets_saved: insertedCount,
      snapshot: {
        id: snapshot.id,
        snapshot_date: snapshot.snapshot_date,
        total_networth: snapshot.total_networth,
        equity_total: snapshot.equity_total,
        debt_total: snapshot.debt_total,
        cash_total: snapshot.cash_total,
        real_estate_total: snapshot.real_estate_total,
        other_assets_total: snapshot.other_assets_total,
      },
      message: `Successfully saved ${insertedCount} assets. Net worth: ₹${totals.total.toLocaleString('en-IN')}`,
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
