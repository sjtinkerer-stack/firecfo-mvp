// Unified file parser - routes to correct parser based on file type

import { parseCSVFromFile } from './parse-csv';
import { parseExcelFromFile } from './parse-excel';
import { parsePDFFromFile } from './parse-pdf';
import {
  RawAsset,
  AssetParsingError,
  StatementDateConfidence,
  StatementDateSource,
} from './types';
import { parseStatementDateFromFilename } from './statement-date-utils';

export type SupportedFileType = 'pdf' | 'csv' | 'xlsx' | 'xls';

/**
 * Detect file type from file name or MIME type
 */
export function detectFileType(file: File): SupportedFileType | null {
  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();

  // Check by extension first
  if (fileName.endsWith('.pdf')) {
    return 'pdf';
  } else if (fileName.endsWith('.csv')) {
    return 'csv';
  } else if (fileName.endsWith('.xlsx')) {
    return 'xlsx';
  } else if (fileName.endsWith('.xls')) {
    return 'xls';
  }

  // Check by MIME type
  if (mimeType === 'application/pdf') {
    return 'pdf';
  } else if (mimeType === 'text/csv' || mimeType === 'application/csv') {
    return 'csv';
  } else if (
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    return 'xlsx';
  } else if (mimeType === 'application/vnd.ms-excel') {
    return 'xls';
  }

  return null;
}

/**
 * Validate file before parsing
 */
export function validateFile(file: File): {
  isValid: boolean;
  fileType: SupportedFileType | null;
  error?: string;
} {
  // Check file size (max 50MB)
  const maxSizeBytes = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSizeBytes) {
    return {
      isValid: false,
      fileType: null,
      error: `File size exceeds 50MB limit. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`,
    };
  }

  // Check file size (min 50 bytes - allows small CSV files)
  if (file.size < 50) {
    return {
      isValid: false,
      fileType: null,
      error: 'File is too small. It may be empty or corrupted.',
    };
  }

  // Detect file type
  const fileType = detectFileType(file);
  if (!fileType) {
    return {
      isValid: false,
      fileType: null,
      error: `Unsupported file type. Please upload PDF, CSV, or Excel files. (File: ${file.name})`,
    };
  }

  return {
    isValid: true,
    fileType,
  };
}

/**
 * Parse file and extract assets (with statement date extraction)
 * Automatically routes to correct parser based on file type
 */
export async function parseFile(file: File): Promise<{
  assets: RawAsset[];
  fileType: SupportedFileType;
  fileName: string;
  fileSize: number;
  parsed_statement_date: string | null;
  statement_date_confidence: StatementDateConfidence;
  statement_date_source: StatementDateSource;
}> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid || !validation.fileType) {
    throw new AssetParsingError(
      validation.error || 'Invalid file',
      file.name
    );
  }

  const fileType = validation.fileType;

  try {
    let assets: RawAsset[];
    let parsed_statement_date: string | null = null;
    let statement_date_confidence: StatementDateConfidence = 'low';
    let statement_date_source: StatementDateSource = 'filename';

    // Route to appropriate parser
    switch (fileType) {
      case 'csv':
        assets = await parseCSVFromFile(file);
        // CSV parser doesn't extract statement dates yet, use filename fallback
        const csvDateResult = parseStatementDateFromFilename(file.name);
        parsed_statement_date = csvDateResult.date;
        statement_date_confidence = csvDateResult.confidence;
        statement_date_source = csvDateResult.source;
        break;

      case 'xlsx':
      case 'xls': {
        // Excel parser returns ParserResult with statement date
        const excelResult = await parseExcelFromFile(file);
        assets = excelResult.assets;
        parsed_statement_date = excelResult.parsed_statement_date;
        statement_date_confidence = excelResult.statement_date_confidence;
        statement_date_source = excelResult.statement_date_source;
        break;
      }

      case 'pdf': {
        // PDF parser returns ParserResult with statement date
        const pdfResult = await parsePDFFromFile(file);
        assets = pdfResult.assets;
        parsed_statement_date = pdfResult.parsed_statement_date;
        statement_date_confidence = pdfResult.statement_date_confidence;
        statement_date_source = pdfResult.statement_date_source;
        break;
      }

      default:
        throw new AssetParsingError(`Unsupported file type: ${fileType}`, file.name);
    }

    return {
      assets,
      fileType,
      fileName: file.name,
      fileSize: file.size,
      parsed_statement_date,
      statement_date_confidence,
      statement_date_source,
    };
  } catch (error) {
    if (error instanceof AssetParsingError) {
      throw error;
    }

    throw new AssetParsingError(
      `Failed to parse ${fileType.toUpperCase()} file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      file.name,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse multiple files in batch (with statement date extraction)
 */
export async function parseFiles(
  files: File[],
  options: {
    maxFiles?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<{
  results: {
    file: File;
    assets: RawAsset[];
    fileType: SupportedFileType;
    success: boolean;
    error?: string;
    parsed_statement_date?: string | null;
    statement_date_confidence?: StatementDateConfidence;
    statement_date_source?: StatementDateSource;
  }[];
  totalAssets: number;
  successCount: number;
  failureCount: number;
}> {
  const { maxFiles = 10, onProgress } = options;

  if (files.length > maxFiles) {
    throw new Error(`Too many files. Maximum ${maxFiles} files allowed per upload.`);
  }

  const results: {
    file: File;
    assets: RawAsset[];
    fileType: SupportedFileType;
    success: boolean;
    error?: string;
    parsed_statement_date?: string | null;
    statement_date_confidence?: StatementDateConfidence;
    statement_date_source?: StatementDateSource;
  }[] = [];

  let totalAssets = 0;
  let successCount = 0;
  let failureCount = 0;

  // Process files sequentially to avoid overwhelming API rate limits
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      const result = await parseFile(file);
      results.push({
        file,
        assets: result.assets,
        fileType: result.fileType,
        success: true,
        parsed_statement_date: result.parsed_statement_date,
        statement_date_confidence: result.statement_date_confidence,
        statement_date_source: result.statement_date_source,
      });
      totalAssets += result.assets.length;
      successCount++;
    } catch (error) {
      results.push({
        file,
        assets: [],
        fileType: detectFileType(file) || 'pdf',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      failureCount++;
    }

    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return {
    results,
    totalAssets,
    successCount,
    failureCount,
  };
}

/**
 * Merge assets from multiple files
 * Combines assets and marks source file
 */
export function mergeAssetsFromFiles(
  fileResults: {
    assets: RawAsset[];
    fileName: string;
  }[]
): RawAsset[] {
  const allAssets: RawAsset[] = [];

  for (const result of fileResults) {
    for (const asset of result.assets) {
      allAssets.push({
        ...asset,
        source_file: result.fileName,
      });
    }
  }

  return allAssets;
}

/**
 * Get file parsing summary
 */
export function getFileParsingSummary(
  results: {
    file: File;
    assets: RawAsset[];
    success: boolean;
    error?: string;
  }[]
): {
  totalFiles: number;
  successfulFiles: number;
  failedFiles: number;
  totalAssets: number;
  fileDetails: {
    fileName: string;
    fileSize: string;
    assetsFound: number;
    status: 'success' | 'failed';
    error?: string;
  }[];
} {
  return {
    totalFiles: results.length,
    successfulFiles: results.filter((r) => r.success).length,
    failedFiles: results.filter((r) => !r.success).length,
    totalAssets: results.reduce((sum, r) => sum + r.assets.length, 0),
    fileDetails: results.map((r) => ({
      fileName: r.file.name,
      fileSize: `${(r.file.size / 1024).toFixed(1)} KB`,
      assetsFound: r.assets.length,
      status: r.success ? 'success' : 'failed',
      error: r.error,
    })),
  };
}
