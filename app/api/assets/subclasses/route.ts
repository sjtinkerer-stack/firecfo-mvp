// API Route: Get asset sub-class mappings
// GET /api/assets/subclasses

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // No authentication required - sub-classes are public data
    // But we still need a proper client for database access
    const cookieStore = await cookies();
    const client = createServerClient(
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const assetClass = searchParams.get('asset_class'); // Filter by specific asset class

    // Build query
    let query = client
      .from('asset_subclass_mapping')
      .select('*')
      .eq('is_active', true)
      .order('asset_class', { ascending: true })
      .order('sort_order', { ascending: true });

    // Filter by asset class if provided
    if (assetClass) {
      query = query.eq('asset_class', assetClass);
    }

    // Execute query
    const { data: subclasses, error } = await query;

    if (error) {
      console.error('Failed to fetch sub-classes:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sub-classes' },
        { status: 500 }
      );
    }

    // Group sub-classes by asset class for easier UI rendering
    type SubclassArray = NonNullable<typeof subclasses>;
    const grouped = (subclasses || []).reduce(
      (acc, subclass) => {
        const assetClass = subclass.asset_class as string;
        if (!acc[assetClass]) {
          acc[assetClass] = [];
        }
        acc[assetClass].push(subclass);
        return acc;
      },
      {} as Record<string, SubclassArray>
    );

    // Calculate summary statistics
    const summary = {
      total_subclasses: subclasses?.length || 0,
      by_class: (Object.entries(grouped) as [string, SubclassArray][]).map(([assetClass, items]) => ({
        asset_class: assetClass,
        count: items.length,
      })),
    };

    // Return sub-classes with grouping
    return NextResponse.json({
      success: true,
      subclasses: subclasses || [],
      grouped,
      summary,
    });
  } catch (error) {
    console.error('❌ Sub-classes API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch sub-classes',
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
