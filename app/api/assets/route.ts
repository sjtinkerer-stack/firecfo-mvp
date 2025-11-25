// API Route: List assets for user
// GET /api/assets?snapshot_id=xxx (optional filter by snapshot)

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const snapshotId = searchParams.get('snapshot_id');
    const assetClass = searchParams.get('asset_class');
    const limit = parseInt(searchParams.get('limit') || '1000', 10);

    // 3. Build query
    let query = supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_duplicate', false) // Exclude duplicates by default
      .order('current_value', { ascending: false }) // Sort by value (largest first)
      .limit(limit);

    // Filter by snapshot if provided
    if (snapshotId) {
      query = query.eq('snapshot_id', snapshotId);
    }

    // Filter by asset class if provided
    if (assetClass) {
      query = query.eq('asset_class', assetClass);
    }

    // 4. Execute query
    const { data: assets, error } = await query;

    if (error) {
      console.error('Failed to fetch assets:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch assets' },
        { status: 500 }
      );
    }

    // 5. Get associated snapshot if snapshot_id was provided
    let snapshot = null;
    if (snapshotId) {
      const { data: snapshotData, error: snapshotError } = await supabase
        .from('asset_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .eq('user_id', user.id)
        .single();

      if (!snapshotError && snapshotData) {
        snapshot = snapshotData;
      }
    }

    // 6. Calculate summary statistics
    const summary = {
      total_assets: assets?.length || 0,
      total_value: assets?.reduce((sum, a) => sum + (a.current_value || 0), 0) || 0,
      by_class: assets?.reduce(
        (acc, asset) => {
          const assetClass = asset.asset_class as string;
          if (!acc[assetClass]) {
            acc[assetClass] = { count: 0, value: 0 };
          }
          acc[assetClass].count++;
          acc[assetClass].value += asset.current_value || 0;
          return acc;
        },
        {} as Record<string, { count: number; value: number }>
      ) || {},
    };

    // 7. Return assets with summary
    return NextResponse.json({
      success: true,
      assets: assets || [],
      snapshot,
      summary,
    });
  } catch (error) {
    console.error('❌ Assets API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch assets',
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
