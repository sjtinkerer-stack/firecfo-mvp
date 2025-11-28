// API Route: List snapshots for user
// GET /api/assets/snapshots

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // 1. Create Supabase client with cookies (for authentication)
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
      console.error('❌ Auth error in snapshots API:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('✅ Authenticated user:', user.id);

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sourceType = searchParams.get('source_type'); // 'upload', 'manual', 'system'

    // 3. Build query
    let query = supabase
      .from('asset_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(limit);

    // Filter by source type if provided
    if (sourceType) {
      query = query.eq('source_type', sourceType);
    }

    // 4. Execute query
    const { data: snapshots, error } = await query;

    if (error) {
      console.error('Failed to fetch snapshots:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch snapshots' },
        { status: 500 }
      );
    }

    // 5. Get asset counts for each snapshot (useful for UI)
    const snapshotIds = snapshots?.map((s) => s.id) || [];
    let assetCounts: Record<string, number> = {};

    if (snapshotIds.length > 0) {
      const { data: counts, error: countsError } = await supabase
        .from('assets')
        .select('snapshot_id')
        .in('snapshot_id', snapshotIds)
        .eq('is_duplicate', false);

      if (!countsError && counts) {
        assetCounts = counts.reduce(
          (acc, item) => {
            acc[item.snapshot_id] = (acc[item.snapshot_id] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );
      }
    }

    // 6. Enrich snapshots with asset counts
    const enrichedSnapshots = snapshots?.map((snapshot) => ({
      ...snapshot,
      asset_count: assetCounts[snapshot.id] || 0,
    }));

    // 7. Calculate summary statistics
    const summary = {
      total_snapshots: enrichedSnapshots?.length || 0,
      latest_snapshot: enrichedSnapshots?.[0] || null,
      earliest_snapshot: enrichedSnapshots?.[enrichedSnapshots.length - 1] || null,
      networth_change:
        enrichedSnapshots && enrichedSnapshots.length >= 2
          ? {
              absolute: enrichedSnapshots[0].total_networth - enrichedSnapshots[enrichedSnapshots.length - 1].total_networth,
              percentage:
                ((enrichedSnapshots[0].total_networth - enrichedSnapshots[enrichedSnapshots.length - 1].total_networth) /
                  enrichedSnapshots[enrichedSnapshots.length - 1].total_networth) *
                100,
            }
          : null,
    };

    // 8. Return snapshots with summary
    return NextResponse.json({
      success: true,
      snapshots: enrichedSnapshots || [],
      summary,
    });
  } catch (error) {
    console.error('❌ Snapshots API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch snapshots',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assets/snapshots?id=<snapshot_id>
 * Update snapshot (rename)
 */
export async function PATCH(request: NextRequest) {
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

    // 3. Get snapshot ID from query params
    const searchParams = request.nextUrl.searchParams;
    const snapshotId = searchParams.get('id');

    if (!snapshotId) {
      return NextResponse.json(
        { success: false, error: 'Snapshot ID required' },
        { status: 400 }
      );
    }

    // 4. Parse request body
    const body = await request.json();
    const { snapshot_name, statement_date, notes } = body;

    if (!snapshot_name && !statement_date && !notes) {
      return NextResponse.json(
        { success: false, error: 'At least one field required (snapshot_name, statement_date, or notes)' },
        { status: 400 }
      );
    }

    // 5. Validate snapshot ownership
    const { data: existingSnapshot, error: fetchError } = await supabase
      .from('asset_snapshots')
      .select('id, user_id')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSnapshot) {
      return NextResponse.json(
        { success: false, error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // 6. Update snapshot
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (snapshot_name !== undefined) updateData.snapshot_name = snapshot_name;
    if (statement_date !== undefined) updateData.statement_date = statement_date;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updatedSnapshot, error: updateError } = await supabase
      .from('asset_snapshots')
      .update(updateData)
      .eq('id', snapshotId)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update snapshot:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update snapshot' },
        { status: 500 }
      );
    }

    console.log(`✅ Updated snapshot ${snapshotId}: ${snapshot_name || '(name unchanged)'}`);

    return NextResponse.json({
      success: true,
      snapshot: updatedSnapshot,
      message: 'Snapshot updated successfully',
    });
  } catch (error) {
    console.error('❌ PATCH snapshots API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update snapshot',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/snapshots?id=<snapshot_id>
 * Delete snapshot (cascade deletes all associated assets)
 */
export async function DELETE(request: NextRequest) {
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

    // 3. Get snapshot ID from query params
    const searchParams = request.nextUrl.searchParams;
    const snapshotId = searchParams.get('id');

    if (!snapshotId) {
      return NextResponse.json(
        { success: false, error: 'Snapshot ID required' },
        { status: 400 }
      );
    }

    // 4. Validate snapshot ownership and get asset count
    const { data: existingSnapshot, error: fetchError } = await supabase
      .from('asset_snapshots')
      .select('id, user_id, snapshot_name, total_networth')
      .eq('id', snapshotId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingSnapshot) {
      return NextResponse.json(
        { success: false, error: 'Snapshot not found' },
        { status: 404 }
      );
    }

    // Get asset count before deletion
    const { count: assetCount } = await supabase
      .from('assets')
      .select('id', { count: 'exact', head: true })
      .eq('snapshot_id', snapshotId);

    // 5. Delete snapshot (cascade deletes all associated assets)
    const { error: deleteError } = await supabase
      .from('asset_snapshots')
      .delete()
      .eq('id', snapshotId);

    if (deleteError) {
      console.error('Failed to delete snapshot:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete snapshot' },
        { status: 500 }
      );
    }

    console.log(`✅ Deleted snapshot ${snapshotId} (${assetCount} assets removed)`);

    return NextResponse.json({
      success: true,
      message: `Snapshot deleted successfully (${assetCount} assets removed)`,
      deleted_assets: assetCount || 0,
    });
  } catch (error) {
    console.error('❌ DELETE snapshots API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete snapshot',
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
