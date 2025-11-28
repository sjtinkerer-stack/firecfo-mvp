// API Route: Get temporary upload session and assets
// GET /api/assets/review/[uploadId]
// PATCH /api/assets/review/[uploadId]

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type {
  GetTempUploadResponse,
  UpdateTempAssetsRequest,
  UpdateTempAssetsResponse,
  TempUpload,
  TempAsset,
} from '@/app/lib/assets/temp-storage-types';

// GET: Fetch temp upload session + assets
export async function GET(
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

    // 3. Fetch temp_upload record
    const { data: upload, error: uploadError } = await supabase
      .from('temp_uploads')
      .select('*')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !upload) {
      console.error('❌ Failed to fetch temp_upload:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Upload session not found' },
        { status: 404 }
      );
    }

    // 4. Check if expired
    const expiresAt = new Date(upload.expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Upload session has expired' },
        { status: 410 }
      );
    }

    // 5. Fetch associated temp_assets
    const { data: assets, error: assetsError } = await supabase
      .from('temp_assets')
      .select('*')
      .eq('temp_upload_id', uploadId)
      .eq('user_id', user.id);

    if (assetsError) {
      console.error('❌ Failed to fetch temp_assets:', assetsError);
      return NextResponse.json(
        { success: false, error: 'Failed to load assets' },
        { status: 500 }
      );
    }

    console.log(`✅ Fetched temp upload ${uploadId} with ${assets?.length || 0} assets`);

    // 6. Return success with upload + assets
    const response: GetTempUploadResponse = {
      success: true,
      upload: upload as TempUpload,
      assets: (assets || []) as TempAsset[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Get temp upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch upload session',
      },
      { status: 500 }
    );
  }
}

// PATCH: Update temp assets (for auto-save during editing)
export async function PATCH(
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
    const body: UpdateTempAssetsRequest = await request.json();

    if (!body.assets || body.assets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No assets to update' },
        { status: 400 }
      );
    }

    // 4. Verify upload exists and belongs to user
    const { data: upload, error: uploadError } = await supabase
      .from('temp_uploads')
      .select('id, status')
      .eq('id', uploadId)
      .eq('user_id', user.id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json(
        { success: false, error: 'Upload session not found' },
        { status: 404 }
      );
    }

    if (upload.status === 'completed' || upload.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit completed or cancelled upload' },
        { status: 400 }
      );
    }

    // 5. Update each asset
    let updatedCount = 0;
    for (const assetUpdate of body.assets) {
      if (!assetUpdate.id) {
        console.warn('⚠️ Skipping asset update without id:', assetUpdate);
        continue;
      }

      // Prepare update data (exclude id, created_at, temp_upload_id, user_id)
      const { id, ...rest } = assetUpdate;
      const { created_at, temp_upload_id, user_id, ...updateData } = rest as any;

      // Mark as edited if any substantive field changed
      const isEdited =
        updateData.asset_name !== undefined ||
        updateData.current_value !== undefined ||
        updateData.asset_class !== undefined ||
        updateData.asset_subclass !== undefined;

      const { error: updateError } = await supabase
        .from('temp_assets')
        .update({
          ...updateData,
          is_edited: isEdited ? true : updateData.is_edited,
        })
        .eq('id', assetUpdate.id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error(`❌ Failed to update asset ${assetUpdate.id}:`, updateError);
        continue;
      }

      updatedCount++;
    }

    // 6. Update temp_upload status to in_review
    await supabase
      .from('temp_uploads')
      .update({ status: 'in_review' })
      .eq('id', uploadId)
      .eq('user_id', user.id);

    console.log(`✅ Updated ${updatedCount} assets in temp upload ${uploadId}`);

    // 7. Return success
    const response: UpdateTempAssetsResponse = {
      success: true,
      updated_count: updatedCount,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Update temp assets error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update assets',
      },
      { status: 500 }
    );
  }
}
