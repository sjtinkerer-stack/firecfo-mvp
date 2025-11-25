// CSV file parsing using papaparse

import Papa from 'papaparse';
import { RawAsset, AssetParsingError } from './types';

/**
 * Expected CSV column names (case-insensitive matching)
 */
const COLUMN_MAPPINGS = {
  asset_name: ['asset', 'name', 'asset name', 'security', 'instrument', 'holding', 'description'],
  current_value: ['value', 'current value', 'market value', 'amount', 'total', 'current amount'],
  quantity: ['quantity', 'qty', 'units', 'shares', 'holdings'],
  purchase_price: ['purchase price', 'cost', 'buy price', 'average price', 'avg price'],
  purchase_date: ['purchase date', 'buy date', 'date', 'acquisition date'],
  // Financial identifiers (NEW)
  isin: ['isin', 'isin code', 'isin no', 'isin number', 'security code', 'security id'],
  ticker_symbol: ['ticker', 'symbol', 'stock code', 'scrip code', 'nse code', 'bse code', 'scrip', 'nse', 'bse'],
  exchange: ['exchange', 'market', 'stock exchange', 'exch'],
};

/**
 * Normalize column name for matching
 */
function normalizeColumnName(columnName: string): string {
  return columnName.toLowerCase().trim();
}

/**
 * Find the best matching column for a given field
 */
function findColumn(
  headers: string[],
  possibleNames: string[]
): string | null {
  const normalizedHeaders = headers.map(normalizeColumnName);

  for (const possibleName of possibleNames) {
    const index = normalizedHeaders.findIndex((h) =>
      h.includes(possibleName) || possibleName.includes(h)
    );
    if (index !== -1) {
      return headers[index];
    }
  }

  return null;
}

/**
 * Parse a value to number, handling Indian number formatting
 */
function parseNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  // Remove currency symbols, commas, and spaces
  const cleaned = value
    .toString()
    .replace(/[₹$,\s]/g, '')
    .trim();

  if (cleaned === '') {
    return undefined;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse a date string to ISO date format
 */
function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;

  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD
  } catch {
    return undefined;
  }
}

/**
 * Parse CSV file and extract assets
 */
export async function parseCSV(
  fileContent: string,
  fileName: string
): Promise<RawAsset[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          if (results.errors.length > 0) {
            console.warn('CSV parsing warnings:', results.errors);
          }

          if (!results.data || results.data.length === 0) {
            throw new AssetParsingError('CSV file is empty or has no data rows', fileName);
          }

          const headers = Object.keys(results.data[0]);

          // Map columns to fields
          const assetNameColumn = findColumn(headers, COLUMN_MAPPINGS.asset_name);
          const currentValueColumn = findColumn(headers, COLUMN_MAPPINGS.current_value);
          const quantityColumn = findColumn(headers, COLUMN_MAPPINGS.quantity);
          const purchasePriceColumn = findColumn(headers, COLUMN_MAPPINGS.purchase_price);
          const purchaseDateColumn = findColumn(headers, COLUMN_MAPPINGS.purchase_date);
          // Financial identifiers (NEW)
          const isinColumn = findColumn(headers, COLUMN_MAPPINGS.isin);
          const tickerColumn = findColumn(headers, COLUMN_MAPPINGS.ticker_symbol);
          const exchangeColumn = findColumn(headers, COLUMN_MAPPINGS.exchange);

          if (!assetNameColumn || !currentValueColumn) {
            throw new AssetParsingError(
              `CSV must have columns for asset name and current value. Found columns: ${headers.join(', ')}`,
              fileName
            );
          }

          // Extract assets
          const assets: RawAsset[] = [];

          for (let i = 0; i < results.data.length; i++) {
            const row = results.data[i];

            const assetName = row[assetNameColumn]?.trim();
            const currentValue = parseNumber(row[currentValueColumn]);

            // Skip rows without asset name or value
            if (!assetName || currentValue === undefined || currentValue <= 0) {
              console.warn(`Skipping row ${i + 1}: missing asset name or invalid value`);
              continue;
            }

            const asset: RawAsset = {
              asset_name: assetName,
              current_value: currentValue,
              source_file: fileName,
            };

            // Optional fields
            if (quantityColumn) {
              asset.quantity = parseNumber(row[quantityColumn]);
            }

            if (purchasePriceColumn) {
              asset.purchase_price = parseNumber(row[purchasePriceColumn]);
            }

            if (purchaseDateColumn) {
              asset.purchase_date = parseDate(row[purchaseDateColumn]);
            }

            // Financial identifiers (NEW)
            if (isinColumn) {
              const isinValue = row[isinColumn]?.trim();
              if (isinValue && isinValue.length > 0) {
                asset.isin = isinValue;
              }
            }

            if (tickerColumn) {
              const tickerValue = row[tickerColumn]?.trim();
              if (tickerValue && tickerValue.length > 0) {
                asset.ticker_symbol = tickerValue;
              }
            }

            if (exchangeColumn) {
              const exchangeValue = row[exchangeColumn]?.trim().toUpperCase();
              if (exchangeValue && exchangeValue.length > 0) {
                asset.exchange = exchangeValue;
              }
            }

            assets.push(asset);
          }

          if (assets.length === 0) {
            throw new AssetParsingError(
              'No valid assets found in CSV file. Check that rows have valid asset names and values.',
              fileName
            );
          }

          // Log identifier extraction statistics
          const assetsWithIsin = assets.filter((a) => a.isin).length;
          const assetsWithTicker = assets.filter((a) => a.ticker_symbol).length;
          console.log(
            `✅ Extracted ${assets.length} assets from ${fileName} | ` +
              `${assetsWithIsin} with ISIN, ${assetsWithTicker} with ticker`
          );

          resolve(assets);
        } catch (error) {
          reject(error);
        }
      },
      error: (error: any) => {
        reject(
          new AssetParsingError(
            `Failed to parse CSV: ${error.message}`,
            fileName,
            error
          )
        );
      },
    });
  });
}

/**
 * Parse CSV from File object (for browser uploads)
 */
export async function parseCSVFromFile(file: File): Promise<RawAsset[]> {
  const fileContent = await file.text();
  return parseCSV(fileContent, file.name);
}

/**
 * Validate CSV structure before parsing
 * Returns true if CSV appears to have the required columns
 */
export function validateCSVStructure(fileContent: string): {
  isValid: boolean;
  hasAssetName: boolean;
  hasValue: boolean;
  detectedColumns: string[];
  error?: string;
} {
  try {
    const firstLine = fileContent.split('\n')[0];
    if (!firstLine) {
      return {
        isValid: false,
        hasAssetName: false,
        hasValue: false,
        detectedColumns: [],
        error: 'CSV file is empty',
      };
    }

    // Parse just the header row
    const headers = firstLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    const hasAssetName = findColumn(headers, COLUMN_MAPPINGS.asset_name) !== null;
    const hasValue = findColumn(headers, COLUMN_MAPPINGS.current_value) !== null;

    return {
      isValid: hasAssetName && hasValue,
      hasAssetName,
      hasValue,
      detectedColumns: headers,
      error:
        !hasAssetName && !hasValue
          ? 'CSV must have columns for asset name and value'
          : !hasAssetName
          ? 'CSV must have a column for asset name'
          : !hasValue
          ? 'CSV must have a column for current value'
          : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      hasAssetName: false,
      hasValue: false,
      detectedColumns: [],
      error: error instanceof Error ? error.message : 'Failed to validate CSV',
    };
  }
}
