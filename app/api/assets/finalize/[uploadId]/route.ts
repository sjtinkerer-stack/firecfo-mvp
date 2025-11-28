// API Route: Finalize temporary upload and save to permanent snapshot
// POST /api/assets/finalize/[uploadId]

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import type {
  FinalizeTempUploadRequest,
  FinalizeTempUploadResponse,
  TempAsset,
} from '@/app/lib/assets/temp-storage-types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await params;

    // 1. Create Supabase client
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

    // 3. Parse request body
    const body: FinalizeTempUploadRequest = await request.json();

    if (!body.selected_asset_ids || body.selected_asset_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets selected' },
        { status: 400 }
      );
    }

    // 4. Fetch temp_upload record
    const { data: tempUpload, error: uploadError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !tempUpload) {
      console.error('❌ Failed to fetch temp_upload:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Upload session not found' },
        { status: 404 }
      );
    }

    if (tempUpload.status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Upload already finalized' },
        { status: 400 }
      );
    }

    // 5. Fetch selected temp_assets
    const { data: tempAssets, error: assetsError } = await supabase
      .from('temp_assets')
      .select('*')
      .in('id', body.selected_asset_ids)
      .eq('user_id', user.id);

    if (assetsError || !tempAssets || tempAssets.length === 0) {
      console.error('❌ Failed to fetch temp_assets:', assetsError);
      return NextResponse.json(
        { success: false, error: 'No valid assets found' },
        { status: 404 }
      );
    }

    // 6. Handle snapshot creation or merge
    let snapshotId: string;
    let isNewSnapshot = false;

    if (body.merge_mode && body.merge_with_snapshot_id) {
      // MERGE MODE: Add to existing snapshot
      snapshotId = body.merge_with_snapshot_id;

      // Verify snapshot exists and belongs to user
      const { data: existingSnapshot, error: snapshotError } = await supabase
        .from('asset_snapshots')
        .select('id, total_networth')
        .eq('id', snapshotId)
        .eq('user_id', user.id)
        .single();

      if (snapshotError || !existingSnapshot) {
        console.error('❌ Snapshot not found for merge:', snapshotError);
        return NextResponse.json(
          {
            success: false,
            error: 'Target snapshot not found',
            details: snapshotError?.message,
            code: snapshotError?.code,
          },
          { status: 404 }
        );
      }

      console.log(`📊 Merging ${tempAssets.length} assets into snapshot ${snapshotId}`);
    } else {
      // CREATE MODE: New snapshot
      snapshotId = uuidv4();
      isNewSnapshot = true;

      // Use statement_date if available, otherwise use current date
      const snapshotDate = tempUpload.statement_date
        ? new Date(tempUpload.statement_date).toISOString()
        : new Date().toISOString();

      // Calculate total networth
      const totalNetworth = tempAssets.reduce((sum, asset) => sum + Number(asset.current_value), 0);

      // Calculate category totals
      const categoryTotals = {
        equity_total: 0,
        debt_total: 0,
        cash_total: 0,
        real_estate_total: 0,
        other_assets_total: 0,
      };

      tempAssets.forEach((asset: TempAsset) => {
        const value = Number(asset.current_value);
        switch (asset.asset_class) {
          case 'equity':
            categoryTotals.equity_total += value;
            break;
          case 'debt':
            categoryTotals.debt_total += value;
            break;
          case 'cash':
            categoryTotals.cash_total += value;
            break;
          case 'real_estate':
            categoryTotals.real_estate_total += value;
            break;
          case 'other':
            categoryTotals.other_assets_total += value;
            break;
        }
      });

      // Create new snapshot
      const { error: createSnapshotError } = await supabase.from('asset_snapshots').insert({
        id: snapshotId,
        user_id: user.id,
        snapshot_name: body.snapshot_name || tempUpload.suggested_snapshot_name,
        snapshot_date: snapshotDate,
        statement_date: tempUpload.statement_date || null,
        total_networth: totalNetworth,
        equity_total: categoryTotals.equity_total,
        debt_total: categoryTotals.debt_total,
        cash_total: categoryTotals.cash_total,
        real_estate_total: categoryTotals.real_estate_total,
        other_assets_total: categoryTotals.other_assets_total,
        source_type: 'upload',
        source_files: tempUpload.file_names,
        notes: `Uploaded via review workflow. Original upload ID: ${uploadId}`,
      });

      if (createSnapshotError) {
        console.error('❌ Failed to create snapshot:', createSnapshotError);
        console.error('Snapshot data:', {
          id: snapshotId,
          user_id: user.id,
          snapshot_name: body.snapshot_name || tempUpload.suggested_snapshot_name,
          snapshot_date: snapshotDate,
          statement_date: tempUpload.statement_date,
          total_networth: totalNetworth,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to create snapshot',
            details: createSnapshotError.message,
            code: createSnapshotError.code,
          },
          { status: 500 }
        );
      }

      console.log(`📊 Created new snapshot ${snapshotId} with ${tempAssets.length} assets`, {
        snapshot_name: body.snapshot_name || tempUpload.suggested_snapshot_name,
        statement_date: tempUpload.statement_date,
        total_networth: totalNetworth,
      });
    }

    // 7. Convert temp_assets to permanent assets
    const permanentAssets = tempAssets.map((tempAsset: TempAsset) => ({
      id: uuidv4(),
      snapshot_id: snapshotId,
      user_id: user.id,
      asset_name: tempAsset.asset_name,
      asset_class: tempAsset.asset_class,
      asset_subclass: tempAsset.asset_subclass,
      current_value: tempAsset.current_value,
      quantity: tempAsset.quantity,
      purchase_price: tempAsset.purchase_price,
      purchase_date: tempAsset.purchase_date,
      risk_level: tempAsset.risk_level,
      expected_return_percentage: tempAsset.expected_return_percentage,
      source_file: tempAsset.source_file,
      ai_confidence_score: tempAsset.ai_confidence_score,
      is_manually_verified: tempAsset.is_edited || false, // Mark as verified if user edited
      is_duplicate: tempAsset.is_duplicate || false,
      notes: tempAsset.notes,
    }));

    // 8. Insert permanent assets
    const { error: insertAssetsError } = await supabase.from('assets').insert(permanentAssets);

    if (insertAssetsError) {
      console.error('❌ Failed to insert permanent assets:', insertAssetsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to save assets',
          details: insertAssetsError.message,
          code: insertAssetsError.code,
        },
        { status: 500 }
      );
    }

    // 9. If merge mode, update snapshot totals
    if (body.merge_mode && body.merge_with_snapshot_id) {
      const { data: allAssets, error: allAssetsError } = await supabase
        .from('assets')
        .select('current_value, asset_class')
        .eq('snapshot_id', snapshotId);

      if (!allAssetsError && allAssets) {
        const newTotal = allAssets.reduce((sum, asset) => sum + Number(asset.current_value), 0);

        // Recalculate category totals
        const categoryTotals = {
          equity_total: 0,
          debt_total: 0,
          cash_total: 0,
          real_estate_total: 0,
          other_assets_total: 0,
        };

        allAssets.forEach((asset: any) => {
          const value = Number(asset.current_value);
          switch (asset.asset_class) {
            case 'equity':
              categoryTotals.equity_total += value;
              break;
            case 'debt':
              categoryTotals.debt_total += value;
              break;
            case 'cash':
              categoryTotals.cash_total += value;
              break;
            case 'real_estate':
              categoryTotals.real_estate_total += value;
              break;
            case 'other':
              categoryTotals.other_assets_total += value;
              break;
          }
        });

        await supabase
          .from('asset_snapshots')
          .update({
            total_networth: newTotal,
            equity_total: categoryTotals.equity_total,
            debt_total: categoryTotals.debt_total,
            cash_total: categoryTotals.cash_total,
            real_estate_total: categoryTotals.real_estate_total,
            other_assets_total: categoryTotals.other_assets_total,
          })
          .eq('id', snapshotId);

        console.log(`📊 Updated snapshot ${snapshotId} totals after merge`);
      }
    }

    // 10. Mark temp_upload as completed
    await supabase
      .from('temp_uploads')
      .update({ status: 'completed' })
      .eq('id', uploadId)
      .eq('user_id', user.id);

    console.log(`✅ Finalized temp upload ${uploadId}: ${permanentAssets.length} assets saved`);

    // 11. Return success
    const response: FinalizeTempUploadResponse = {
      success: true,
      snapshot_id: snapshotId,
      assets_saved: permanentAssets.length,
      message: isNewSnapshot
        ? `Created new snapshot with ${permanentAssets.length} assets`
        : `Added ${permanentAssets.length} assets to existing snapshot`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Finalize temp upload error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to finalize upload',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
