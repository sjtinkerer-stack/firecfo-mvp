// Statement Date Extraction and Snapshot Matching Utilities
// Purpose: Parse statement dates from documents and intelligently match snapshots

import { format, parse, differenceInDays, isValid, startOfMonth, endOfMonth } from 'date-fns';
import type {
  StatementDateConfidence,
  StatementDateSource,
  AssetSnapshot,
} from './types';

// Configuration for date matching tolerance
export const SNAPSHOT_MATCHING_CONFIG = {
  EXACT_MATCH_DAYS: 0, // Same date
  CLOSE_MATCH_DAYS: 15, // Within 15 days - show smart prompt
  AUTO_CREATE_THRESHOLD_DAYS: 15, // >15 days - auto-create new snapshot
  MONTH_GROUPING_TOLERANCE_DAYS: 7, // Within 7 days for month-based grouping
} as const;

// Statement date extraction result
export interface StatementDateExtractionResult {
  date: string | null; // ISO format date (YYYY-MM-DD)
  confidence: StatementDateConfidence;
  source: StatementDateSource;
  original_text?: string; // Raw date string found in document
}

// Snapshot match result
export interface SnapshotMatchResult {
  match_type: 'exact' | 'close' | 'none';
  matched_snapshot?: AssetSnapshot;
  days_difference?: number;
  suggested_action: 'merge' | 'prompt' | 'create_new';
}

// Multiple snapshot match result (for multi-file uploads)
export interface MultiSnapshotMatchResult {
  nearby_snapshots: AssetSnapshot[];
  suggested_merge?: AssetSnapshot; // Best match for merging
  days_to_nearest: number;
}

/**
 * Parse statement date from filename
 * Handles patterns like: "HDFC_Nov2024.pdf", "Statement_30-11-2024.pdf"
 */
export function parseStatementDateFromFilename(
  filename: string
): StatementDateExtractionResult {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.(pdf|csv|xlsx)$/i, '');

  // Pattern 1: DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = nameWithoutExt.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    try {
      const date = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
      if (isValid(date)) {
        return {
          date: format(date, 'yyyy-MM-dd'),
          confidence: 'high',
          source: 'filename',
          original_text: ddmmyyyy[0],
        };
      }
    } catch {
      // Fall through to next pattern
    }
  }

  // Pattern 2: YYYY-MM-DD
  const yyyymmdd = nameWithoutExt.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    try {
      const date = parse(`${year}-${month}-${day}`, 'yyyy-MM-dd', new Date());
      if (isValid(date)) {
        return {
          date: format(date, 'yyyy-MM-dd'),
          confidence: 'high',
          source: 'filename',
          original_text: yyyymmdd[0],
        };
      }
    } catch {
      // Fall through to next pattern
    }
  }

  // Pattern 3: Month names (Nov2024, November2024, Nov_2024)
  const monthNamePattern =
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)[_\-\s]*(\d{4})\b/i;
  const monthMatch = nameWithoutExt.match(monthNamePattern);
  if (monthMatch) {
    const [, monthStr, year] = monthMatch;
    try {
      // Parse month name and default to end of month
      const monthIndex = parse(monthStr, 'MMMM', new Date()).getMonth();
      const date = endOfMonth(new Date(parseInt(year), monthIndex));
      if (isValid(date)) {
        return {
          date: format(date, 'yyyy-MM-dd'),
          confidence: 'medium', // Medium because we're assuming end of month
          source: 'filename',
          original_text: monthMatch[0],
        };
      }
    } catch {
      // Fall through
    }
  }

  // Pattern 4: Just year (Q1_2024, 2024_Annual) - default to end of year
  const yearMatch = nameWithoutExt.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    const year = parseInt(yearMatch[1]);
    const date = new Date(year, 11, 31); // Dec 31
    return {
      date: format(date, 'yyyy-MM-dd'),
      confidence: 'low', // Very uncertain - just using year
      source: 'filename',
      original_text: yearMatch[0],
    };
  }

  // No date found in filename
  return {
    date: null,
    confidence: 'low',
    source: 'filename',
  };
}

/**
 * Parse statement date from document text using AI (GPT-4)
 * This should be called from the PDF/CSV parsers
 */
export async function parseStatementDateFromDocument(
  documentText: string,
  openai: any // OpenAI client
): Promise<StatementDateExtractionResult> {
  try {
    const prompt = `Extract the statement date from this financial document.

Look for phrases like:
- "As of [date]"
- "Statement Date: [date]"
- "Portfolio Valuation Date: [date]"
- "Statement Period: [date] to [date]" (use the end date)
- Dates in headers or footers

Common Indian date formats:
- 30-Nov-2024
- November 30, 2024
- 30/11/2024
- 2024-11-30

Return ONLY a JSON object with this exact format:
{
  "date": "YYYY-MM-DD",
  "confidence": "high" | "medium" | "low",
  "original_text": "the exact date string you found"
}

If no date found, return:
{
  "date": null,
  "confidence": "low",
  "original_text": null
}

Document excerpt (first 2000 characters):
${documentText.slice(0, 2000)}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fast and cheap for date extraction
      messages: [
        {
          role: 'system',
          content:
            'You are an expert at extracting dates from Indian financial statements.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Low temperature for consistency
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Validate the result
    if (result.date) {
      const parsedDate = parse(result.date, 'yyyy-MM-dd', new Date());
      if (isValid(parsedDate)) {
        return {
          date: result.date,
          confidence: (result.confidence || 'medium') as StatementDateConfidence,
          source: 'document_content',
          original_text: result.original_text,
        };
      }
    }

    // AI couldn't extract date
    return {
      date: null,
      confidence: 'low',
      source: 'document_content',
    };
  } catch (error) {
    console.error('Failed to extract statement date from document:', error);
    return {
      date: null,
      confidence: 'low',
      source: 'document_content',
    };
  }
}

/**
 * Combined statement date extraction with fallback logic
 * Priority: Document content → Filename → Upload timestamp
 */
export async function extractStatementDate(
  documentText: string,
  filename: string,
  openai?: any
): Promise<StatementDateExtractionResult> {
  // Try document content first (if OpenAI is available)
  if (openai) {
    const docResult = await parseStatementDateFromDocument(documentText, openai);
    if (docResult.date && docResult.confidence !== 'low') {
      return docResult;
    }
  }

  // Try filename parsing
  const filenameResult = parseStatementDateFromFilename(filename);
  if (filenameResult.date && filenameResult.confidence !== 'low') {
    return filenameResult;
  }

  // Fallback to current date (user will be prompted to confirm)
  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    confidence: 'low',
    source: 'upload_timestamp',
  };
}

/**
 * Find nearby snapshots within tolerance window
 * Used for smart merge prompts
 */
export function findNearbySnapshots(
  userSnapshots: AssetSnapshot[],
  statementDate: string,
  toleranceDays: number = SNAPSHOT_MATCHING_CONFIG.CLOSE_MATCH_DAYS
): MultiSnapshotMatchResult {
  const targetDate = parse(statementDate, 'yyyy-MM-dd', new Date());
  if (!isValid(targetDate)) {
    return {
      nearby_snapshots: [],
      days_to_nearest: Infinity,
    };
  }

  // Filter snapshots with statement_date and calculate distance
  const snapshotsWithDistance = userSnapshots
    .filter((s) => s.statement_date)
    .map((snapshot) => {
      const snapDate = parse(snapshot.statement_date!, 'yyyy-MM-dd', new Date());
      const daysDiff = Math.abs(differenceInDays(targetDate, snapDate));
      return { snapshot, daysDiff };
    })
    .sort((a, b) => a.daysDiff - b.daysDiff); // Sort by closest first

  if (snapshotsWithDistance.length === 0) {
    return {
      nearby_snapshots: [],
      days_to_nearest: Infinity,
    };
  }

  const nearest = snapshotsWithDistance[0];
  const nearbySnapshots = snapshotsWithDistance
    .filter((s) => s.daysDiff <= toleranceDays)
    .map((s) => s.snapshot);

  return {
    nearby_snapshots: nearbySnapshots,
    suggested_merge: nearest.daysDiff <= toleranceDays ? nearest.snapshot : undefined,
    days_to_nearest: nearest.daysDiff,
  };
}

/**
 * Determine snapshot match type and suggested action
 * Returns recommendation for UI
 */
export function matchSnapshot(
  userSnapshots: AssetSnapshot[],
  statementDate: string
): SnapshotMatchResult {
  // Debug: Log snapshots before filtering
  console.log('🔍 matchSnapshot called with:', {
    total_snapshots: userSnapshots.length,
    statement_date_to_match: statementDate,
    snapshots: userSnapshots.map(s => ({
      id: s.id,
      name: s.snapshot_name,
      snapshot_date: s.snapshot_date,
      statement_date: s.statement_date,
      statement_date_type: typeof s.statement_date,
      statement_date_truthy: !!s.statement_date,
    }))
  });

  // Filter out snapshots without statement_date (for backwards compatibility)
  const snapshotsWithDates = userSnapshots.filter((s) => s.statement_date);

  console.log('✅ After filtering:', {
    snapshots_with_dates: snapshotsWithDates.length,
    filtered_out: userSnapshots.length - snapshotsWithDates.length,
  });

  const matchResult = findNearbySnapshots(
    snapshotsWithDates,
    statementDate,
    SNAPSHOT_MATCHING_CONFIG.CLOSE_MATCH_DAYS
  );

  // No nearby snapshots
  if (matchResult.days_to_nearest === Infinity) {
    return {
      match_type: 'none',
      suggested_action: 'create_new',
    };
  }

  // Exact match (same date)
  if (matchResult.days_to_nearest === SNAPSHOT_MATCHING_CONFIG.EXACT_MATCH_DAYS) {
    return {
      match_type: 'exact',
      matched_snapshot: matchResult.suggested_merge,
      days_difference: 0,
      suggested_action: 'merge',
    };
  }

  // Close match (within tolerance)
  if (matchResult.days_to_nearest <= SNAPSHOT_MATCHING_CONFIG.CLOSE_MATCH_DAYS) {
    return {
      match_type: 'close',
      matched_snapshot: matchResult.suggested_merge,
      days_difference: matchResult.days_to_nearest,
      suggested_action: 'prompt', // Show smart prompt to user
    };
  }

  // Far apart - create new snapshot
  return {
    match_type: 'none',
    suggested_action: 'create_new',
  };
}

/**
 * Generate smart snapshot name from statement date
 * Examples: "November 2024", "November 28-30, 2024"
 */
export function generateSnapshotName(
  statementDate: string,
  dateRange?: { start: string; end: string }
): string {
  try {
    const date = parse(statementDate, 'yyyy-MM-dd', new Date());
    if (!isValid(date)) {
      return 'Untitled Snapshot';
    }

    // Single date - use month name
    if (!dateRange) {
      return format(date, 'MMMM yyyy'); // "November 2024"
    }

    // Date range - show range
    const startDate = parse(dateRange.start, 'yyyy-MM-dd', new Date());
    const endDate = parse(dateRange.end, 'yyyy-MM-dd', new Date());

    if (!isValid(startDate) || !isValid(endDate)) {
      return format(date, 'MMMM yyyy');
    }

    const daysDiff = Math.abs(differenceInDays(endDate, startDate));

    // If within same month and close dates, show range
    if (
      startDate.getMonth() === endDate.getMonth() &&
      daysDiff <= SNAPSHOT_MATCHING_CONFIG.MONTH_GROUPING_TOLERANCE_DAYS
    ) {
      return `${format(startDate, 'MMMM dd')}-${format(endDate, 'dd, yyyy')}`; // "November 28-30, 2024"
    }

    // Otherwise just use month
    return format(endDate, 'MMMM yyyy');
  } catch {
    return 'Untitled Snapshot';
  }
}

/**
 * Format date range for display
 * Examples: "Nov 28-30", "Nov 28 - Dec 1"
 */
export function formatDateRange(startDate: string, endDate: string): string {
  try {
    const start = parse(startDate, 'yyyy-MM-dd', new Date());
    const end = parse(endDate, 'yyyy-MM-dd', new Date());

    if (!isValid(start) || !isValid(end)) {
      return '';
    }

    // Same month - show compact range
    if (start.getMonth() === end.getMonth()) {
      return `${format(start, 'MMM dd')}-${format(end, 'dd')}`;
    }

    // Different months
    return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd')}`;
  } catch {
    return '';
  }
}

/**
 * Group files by statement date for multi-file uploads
 * Returns groups of files that should be merged into same snapshot
 */
export interface FileGroup {
  statement_date: string;
  files: Array<{
    filename: string;
    parsed_date: StatementDateExtractionResult;
  }>;
  suggested_snapshot_name: string;
  match_result: SnapshotMatchResult;
}

export function groupFilesByStatementDate(
  files: Array<{
    filename: string;
    parsed_date: StatementDateExtractionResult;
  }>,
  userSnapshots: AssetSnapshot[]
): FileGroup[] {
  if (files.length === 0) return [];

  // Group files by date (within tolerance)
  const groups: Map<string, FileGroup> = new Map();

  for (const file of files) {
    if (!file.parsed_date.date) continue;

    const fileDate = parse(file.parsed_date.date, 'yyyy-MM-dd', new Date());
    if (!isValid(fileDate)) continue;

    // Find if this file belongs to an existing group (within 7 days)
    let addedToGroup = false;
    for (const [groupDate, group] of groups.entries()) {
      const groupParsedDate = parse(groupDate, 'yyyy-MM-dd', new Date());
      const daysDiff = Math.abs(differenceInDays(fileDate, groupParsedDate));

      if (daysDiff <= SNAPSHOT_MATCHING_CONFIG.MONTH_GROUPING_TOLERANCE_DAYS) {
        group.files.push(file);
        addedToGroup = true;
        break;
      }
    }

    // Create new group if not added
    if (!addedToGroup) {
      const matchResult = matchSnapshot(userSnapshots, file.parsed_date.date);
      groups.set(file.parsed_date.date, {
        statement_date: file.parsed_date.date,
        files: [file],
        suggested_snapshot_name: generateSnapshotName(file.parsed_date.date),
        match_result: matchResult,
      });
    }
  }

  // Convert to array and update names for date ranges
  const groupsArray = Array.from(groups.values());

  // Update snapshot names for groups with date ranges
  for (const group of groupsArray) {
    if (group.files.length > 1) {
      const dates = group.files
        .map((f) => f.parsed_date.date)
        .filter((d): d is string => d !== null)
        .map((d) => parse(d, 'yyyy-MM-dd', new Date()))
        .filter(isValid)
        .sort((a, b) => a.getTime() - b.getTime());

      if (dates.length >= 2) {
        const startDate = format(dates[0], 'yyyy-MM-dd');
        const endDate = format(dates[dates.length - 1], 'yyyy-MM-dd');
        group.suggested_snapshot_name = generateSnapshotName(endDate, {
          start: startDate,
          end: endDate,
        });
      }
    }
  }

  return groupsArray;
}
