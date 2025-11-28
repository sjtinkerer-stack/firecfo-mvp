// API Route: Create temporary upload session for review
// POST /api/assets/review/create

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { generateTempUploadId, generateTempAssetId } from '@/app/lib/assets/temp-storage-types';
import type {  CreateTempUploadRequest,
  CreateTempUploadResponse,
} from '@/app/lib/assets/temp-storage-types';

export async function POST(request: NextRequest) {
  try {
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
    const body: CreateTempUploadRequest = await request.json();

    if (!body.assets || body.assets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets provided' },
        { status: 400 }
      );
    }

    // 4. Generate upload ID
    const uploadId = generateTempUploadId();

    // 5. Calculate totals
    const totalAssets = body.assets.length;
    const totalValue = body.assets.reduce((sum, asset) => sum + asset.current_value, 0);

    // 6. Insert temp_upload record
    const { error: uploadError } = await supabase.from('temp_uploads').insert({
      id: uploadId,
      user_id: user.id,
      file_names: body.file_names,
      total_assets: totalAssets,
      total_value: totalValue,
      statement_date: body.statement_date || null,
      statement_date_confidence: body.statement_date_confidence || null,
      statement_date_source: body.statement_date_source || null,
      suggested_snapshot_name: body.suggested_snapshot_name || null,
      matched_snapshot_id: body.matched_snapshot_id || null,
      merge_decision: body.merge_decision || null,
      processing_time_ms: body.processing_time_ms || null,
      duplicates_found: body.duplicates_found || 0,
      status: 'in_review',
    });

    if (uploadError) {
      console.error('❌ Failed to create temp_upload:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to create upload session' },
        { status: 500 }
      );
    }

    // 7. Insert temp_assets records
    const tempAssets = body.assets.map((asset) => ({
      id: generateTempAssetId(),
      temp_upload_id: uploadId,
      user_id: user.id,
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
      ai_confidence_score: asset.ai_confidence_score || null,
      verified_via: asset.verified_via || null,
      security_type: asset.security_type || null,
      isin: asset.isin || null,
      ticker_symbol: asset.ticker_symbol || null,
      exchange: asset.exchange || null,
      is_duplicate: asset.is_duplicate || false,
      duplicate_matches: asset.duplicate_matches || null,
      is_selected: asset.is_selected !== undefined ? asset.is_selected : true,
      is_edited: false,
      notes: asset.notes || null,
    }));

    const { error: assetsError } = await supabase.from('temp_assets').insert(tempAssets);

    if (assetsError) {
      console.error('❌ Failed to create temp_assets:', assetsError);
      // Rollback: delete temp_upload
      await supabase.from('temp_uploads').delete().eq('id', uploadId);
      return NextResponse.json(
        { success: false, error: 'Failed to save assets for review' },
        { status: 500 }
      );
    }

    console.log(`✅ Created temp upload ${uploadId} with ${totalAssets} assets`);

    // 8. Return success with upload_id
    const response: CreateTempUploadResponse = {
      success: true,
      upload_id: uploadId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Create temp upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create upload session',
      },
      { status: 500 }
    );
  }
}
