// API Route: Parse uploaded files and extract assets
// POST /api/assets/parse

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  parseFiles,
  mergeAssetsFromFiles,
  classifyAssetsBatch,
  detectDuplicatesBatch,
  getFileParsingSummary,
  groupFilesByStatementDate,
  type AssetSnapshot,
} from '@/app/lib/assets';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    // 2. Parse form data with files
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files uploaded' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 files allowed per upload' },
        { status: 400 }
      );
    }

    // 3. Parse files and extract raw assets
    console.log(`📁 Parsing ${files.length} files for user ${user.id}`);
    const parseResults = await parseFiles(files, {
      maxFiles: 10,
      onProgress: (current, total) => {
        console.log(`  Progress: ${current}/${total} files parsed`);
      },
    });

    if (parseResults.successCount === 0) {
      const errorDetails = parseResults.results.map((r) => ({
        file: r.file.name,
        error: r.error,
      }));

      console.error('❌ All files failed to parse:', errorDetails);

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse any files. Please check file formats and try again.',
          details: errorDetails,
        },
        { status: 400 }
      );
    }

    console.log(`✅ Parsed ${parseResults.successCount} files, found ${parseResults.totalAssets} raw assets`);

    // 4. Merge assets from all successfully parsed files
    const allRawAssets = mergeAssetsFromFiles(
      parseResults.results
        .filter((r) => r.success)
        .map((r) => ({
          assets: r.assets,
          fileName: r.file.name,
        }))
    );

    if (allRawAssets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No assets found in uploaded files',
        },
        { status: 400 }
      );
    }

    // 5. Get sub-class mappings from database
    let { data: subclassMappings, error: mappingsError } = await supabase
      .from('asset_subclass_mapping')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    // If no active mappings found, try without is_active filter (for backwards compatibility)
    if (!subclassMappings || subclassMappings.length === 0) {
      console.warn('⚠️ No active sub-class mappings found, trying without is_active filter...');
      const fallbackResult = await supabase
        .from('asset_subclass_mapping')
        .select('*')
        .order('sort_order');

      subclassMappings = fallbackResult.data;
      mappingsError = fallbackResult.error;
    }

    if (mappingsError || !subclassMappings || subclassMappings.length === 0) {
      console.error('❌ Failed to fetch sub-class mappings:', mappingsError);
      console.error('   This usually means the asset_subclass_mapping table is empty.');
      console.error('   Please run the add-asset-tracking-system.sql migration to seed the data.');
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to load asset classification data. Please ensure the database is properly seeded.',
        },
        { status: 500 }
      );
    }

    console.log(`✅ Loaded ${subclassMappings.length} asset sub-class mappings`);

    // 6. Classify assets using AI (with progress logging)
    console.log(`🤖 Classifying ${allRawAssets.length} assets with AI...`);
    const classifiedAssets = await classifyAssetsBatch(
      allRawAssets,
      subclassMappings,
      {
        maxConcurrent: 5, // Process 5 at a time to avoid rate limits
        onProgress: (completed, total) => {
          console.log(`  Classified: ${completed}/${total} assets`);
        },
      }
    );

    if (classifiedAssets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to classify any assets. Please try again.',
        },
        { status: 500 }
      );
    }

    console.log(`✅ Classified ${classifiedAssets.length} assets`);

    // 7. Get user's existing assets for duplicate detection
    const { data: existingAssets, error: assetsError } = await supabase
      .from('assets')
      .select('id, asset_name, current_value, source_file, snapshot_id')
      .eq('user_id', user.id)
      .eq('is_duplicate', false) // Only check against non-duplicate assets
      .order('created_at', { ascending: false })
      .limit(1000); // Get recent assets only

    if (assetsError) {
      console.error('Failed to fetch existing assets:', assetsError);
      // Don't fail the request, just skip duplicate detection
    }

    // 8. Detect duplicates (uses DEFAULT_CONFIG with nameWeight: 0.9, valueWeight: 0.1)
    console.log(`🔍 Checking for duplicates against ${existingAssets?.length || 0} existing assets...`);
    const reviewAssets = detectDuplicatesBatch(
      classifiedAssets,
      existingAssets || []
      // Using DEFAULT_CONFIG: 85% threshold, nameWeight: 0.9, valueWeight: 0.1
    );

    const duplicateCount = reviewAssets.filter((a) => a.is_duplicate).length;
    console.log(`⚠️  Found ${duplicateCount} potential duplicates`);

    // 9. Fetch user's existing snapshots for statement date matching
    const { data: userSnapshots, error: snapshotsError} = await supabase
      .from('asset_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false }) // Use snapshot_date instead of statement_date for compatibility
      .limit(50); // Get recent snapshots only

    if (snapshotsError) {
      console.error('Failed to fetch user snapshots:', snapshotsError);
      // Don't fail the request, just skip snapshot matching
    }

    // 10. Group files by statement date and match against existing snapshots
    let fileGroups: any[] = [];
    let filesWithDates: any[] = [];
    try {
      filesWithDates = parseResults.results
        .filter((r) => r.success && r.parsed_statement_date)
        .map((r) => ({
          filename: r.file.name,
          parsed_date: {
            date: r.parsed_statement_date!,
            confidence: r.statement_date_confidence!,
            source: r.statement_date_source!,
          },
        }));

      fileGroups = groupFilesByStatementDate(
        filesWithDates,
        (userSnapshots as AssetSnapshot[]) || []
      );
    } catch (groupError) {
      console.error('Failed to group files by statement date:', groupError);
      // Continue without file grouping - will create new snapshot
      fileGroups = [];
    }

    console.log(`📊 Grouped ${filesWithDates.length} files into ${fileGroups.length} statement period(s)`);

    // 11. Log upload to database for monitoring
    const processingTime = Date.now() - startTime;
    const fileNames = files.map((f) => f.name).join(', ');
    const fileSizes = files.reduce((sum, f) => sum + f.size, 0);

    await supabase.from('upload_logs').insert({
      user_id: user.id,
      file_name: fileNames,
      file_type: files.length > 1 ? 'multiple' : parseResults.results[0]?.fileType || 'unknown',
      file_size_bytes: fileSizes,
      status: 'completed',
      assets_parsed: reviewAssets.length,
      duplicates_found: duplicateCount,
      completed_at: new Date().toISOString(),
    });

    // 12. Return results for user review (with snapshot matching info)
    const summary = getFileParsingSummary(parseResults.results);

    return NextResponse.json({
      success: true,
      assets: reviewAssets,
      summary: {
        total_files: summary.totalFiles,
        successful_files: summary.successfulFiles,
        failed_files: summary.failedFiles,
        total_assets: reviewAssets.length,
        duplicates_found: duplicateCount,
        processing_time_ms: processingTime,
        file_details: summary.fileDetails,
      },
      // NEW: Statement date matching information
      statement_date_groups: fileGroups.map((group: any) => ({
        statement_date: group.statement_date,
        suggested_snapshot_name: group.suggested_snapshot_name,
        files: group.files.map((f: any) => f.filename),
        match_type: group.match_result.match_type,
        matched_snapshot: group.match_result.matched_snapshot
          ? {
              id: group.match_result.matched_snapshot.id,
              snapshot_name: group.match_result.matched_snapshot.snapshot_name,
              statement_date: group.match_result.matched_snapshot.statement_date,
              total_networth: group.match_result.matched_snapshot.total_networth,
            }
          : null,
        days_difference: group.match_result.days_difference,
        suggested_action: group.match_result.suggested_action,
      })),
    });
  } catch (error) {
    console.error('❌ Parse API error:', error);

    // Log failure
    try {
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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from('upload_logs').insert({
          user_id: user.id,
          file_name: 'Parse failed',
          file_type: 'unknown',
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse files',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS (if needed)
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
