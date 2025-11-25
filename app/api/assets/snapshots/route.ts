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

// OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
