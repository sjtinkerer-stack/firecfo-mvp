// Excel file parsing using xlsx library

import * as XLSX from 'xlsx';
import OpenAI from 'openai';
import { RawAsset, AssetParsingError } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Expected column names (same as CSV parser for consistency)
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
function parseNumber(value: any): number | undefined {
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
 * Parse Excel date serial number or string to ISO date format
 */
function parseDate(value: any): string | undefined {
  if (!value) return undefined;

  try {
    // Excel stores dates as serial numbers
    if (typeof value === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const days = value - 2; // Excel bug: treats 1900 as leap year
      const date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
      return date.toISOString().split('T')[0];
    }

    // Try parsing as string
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString().split('T')[0];
  } catch {
    return undefined;
  }
}

/**
 * Find the header row in raw data (handles Excel files with empty rows at top)
 */
function findHeaderRow(rawData: any[][]): number {
  for (let i = 0; i < Math.min(rawData.length, 20); i++) {
    const row = rawData[i];
    if (!row || row.length === 0) continue;

    // Check if this row looks like a header (has text in multiple cells)
    const nonEmptyCells = row.filter((cell) => cell && cell.toString().trim() !== '');
    if (nonEmptyCells.length >= 2) {
      // Check if any cell contains keywords like "name", "value", "amount", etc.
      const rowText = row.join(' ').toLowerCase();
      if (
        rowText.includes('name') ||
        rowText.includes('asset') ||
        rowText.includes('value') ||
        rowText.includes('amount') ||
        rowText.includes('holding') ||
        rowText.includes('security')
      ) {
        return i;
      }
    }
  }
  return 0; // Default to first row
}

/**
 * Parse Excel file and extract assets
 * Supports .xlsx and .xls formats
 */
export async function parseExcel(
  fileBuffer: ArrayBuffer,
  fileName: string
): Promise<RawAsset[]> {
  try {
    // Read workbook
    const workbook = XLSX.read(fileBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new AssetParsingError('Excel file has no sheets', fileName);
    }

    // Use first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new AssetParsingError(`Sheet "${sheetName}" is empty`, fileName);
    }

    // First, convert to raw array to find header row
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) {
      throw new AssetParsingError('Excel sheet has no data', fileName);
    }

    // Find the header row
    const headerRowIndex = findHeaderRow(rawData);
    const headers = rawData[headerRowIndex].map((h: any) => h?.toString().trim() || '');

    // Filter out completely empty headers
    const validHeaders = headers.filter((h: string) => h && !h.startsWith('__EMPTY'));

    if (validHeaders.length === 0) {
      // No valid headers found - log the raw data for debugging
      console.warn('Excel file has no clear headers. First 5 rows:', rawData.slice(0, 5));

      // Try to find ANY row with data (even without proper headers)
      const dataRows = rawData.filter((row) => {
        if (!row || row.length < 2) return false;
        const nonEmpty = row.filter((cell) => cell && cell.toString().trim() !== '');
        return nonEmpty.length >= 2; // At least 2 non-empty cells
      });

      if (dataRows.length > 0) {
        // Try to parse without headers - assume first 2 columns are name and value
        console.log(`Attempting headerless parsing with ${dataRows.length} data rows`);

        const assets: RawAsset[] = [];
        const skippedInHeaderless: number[] = [];

        for (let idx = 0; idx < dataRows.length; idx++) {
          const row = dataRows[idx];
          const name = row[0]?.toString().trim();
          const value = parseNumber(row[1]);

          if (name && value && value > 0) {
            assets.push({
              asset_name: name,
              current_value: value,
              source_file: fileName,
            });
          } else {
            skippedInHeaderless.push(idx + 1);
            console.warn(
              `⚠️  Headerless parsing: Skipped row ${idx + 1}: ${name || '(empty)'} | ${row[1]}`
            );
          }
        }

        if (assets.length > 0) {
          console.log(
            `✅ Successfully parsed ${assets.length} assets without headers (skipped ${skippedInHeaderless.length} rows)`
          );
          return assets;
        }
      }

      // Still couldn't parse with standard methods - try AI fallback
      console.log('⚠️ Standard Excel parsing failed, trying AI fallback...');
      try {
        return await parseExcelWithAI(fileBuffer, fileName, rawData);
      } catch (aiError) {
        console.error('AI fallback also failed:', aiError);
        throw new AssetParsingError(
          'Excel file has no clear structure. Please ensure:\n' +
            '1. File has a header row with columns like "Asset Name" and "Value"\n' +
            '2. Or at least 2 columns with asset names in first column and values in second column\n' +
            `3. Found ${rawData.length} rows but couldn't identify valid data`,
          fileName
        );
      }
    }

    // Now convert to JSON using the detected header row
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      range: headerRowIndex,
      defval: '',
      blankrows: false,
    });

    if (jsonData.length === 0) {
      throw new AssetParsingError('Excel sheet has no data rows after header', fileName);
    }

    // Get headers from parsed data
    const parsedHeaders = Object.keys(jsonData[0]);

    // Check if all headers are empty/invalid (__EMPTY, __EMPTY_1, etc.)
    const hasValidHeaders = parsedHeaders.some(
      (h) => h && !h.startsWith('__EMPTY') && h.trim().length > 0
    );

    if (!hasValidHeaders) {
      // All headers are empty - try AI fallback
      console.log('⚠️ All Excel headers are empty (__EMPTY), trying AI fallback...');
      try {
        return await parseExcelWithAI(fileBuffer, fileName, rawData);
      } catch (aiError) {
        console.error('AI fallback failed:', aiError);
        throw new AssetParsingError(
          `Excel has no valid column headers. Found: ${parsedHeaders.join(', ')}. Please ensure your Excel file has proper column headers.`,
          fileName
        );
      }
    }

    // Map columns to fields (use parsedHeaders which may have cleaned up names)
    const assetNameColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.asset_name);
    const currentValueColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.current_value);
    const quantityColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.quantity);
    const purchasePriceColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.purchase_price);
    const purchaseDateColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.purchase_date);
    // Financial identifiers (NEW)
    const isinColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.isin);
    const tickerColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.ticker_symbol);
    const exchangeColumn = findColumn(parsedHeaders, COLUMN_MAPPINGS.exchange);

    if (!assetNameColumn || !currentValueColumn) {
      // Can't find required columns - try AI fallback as last resort
      console.log('⚠️ Could not find asset name/value columns, trying AI fallback...');
      try {
        return await parseExcelWithAI(fileBuffer, fileName, rawData);
      } catch (aiError) {
        console.error('AI fallback failed:', aiError);
        throw new AssetParsingError(
          `Excel must have columns for asset name and current value. Found columns: ${parsedHeaders.join(', ')}. Please ensure headers are in row ${headerRowIndex + 1}.`,
          fileName
        );
      }
    }

    // Extract assets
    const assets: RawAsset[] = [];
    const skippedRows: { row: number; reason: string; data: string }[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      const assetName = row[assetNameColumn]?.toString().trim();
      const currentValue = parseNumber(row[currentValueColumn]);

      // Skip rows without asset name or value
      if (!assetName || currentValue === undefined || currentValue <= 0) {
        const reason = !assetName
          ? 'missing asset name'
          : currentValue === undefined
          ? 'could not parse value'
          : 'value is zero or negative';
        const rowData = `${assetName || '(empty)'} | Value: ${row[currentValueColumn]}`;

        skippedRows.push({ row: i + headerRowIndex + 2, reason, data: rowData });
        console.warn(`⚠️  Skipping row ${i + headerRowIndex + 2}: ${reason} | ${rowData}`);
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
        const isinValue = row[isinColumn]?.toString().trim();
        if (isinValue && isinValue.length > 0) {
          asset.isin = isinValue;
        }
      }

      if (tickerColumn) {
        const tickerValue = row[tickerColumn]?.toString().trim();
        if (tickerValue && tickerValue.length > 0) {
          asset.ticker_symbol = tickerValue;
        }
      }

      if (exchangeColumn) {
        const exchangeValue = row[exchangeColumn]?.toString().trim().toUpperCase();
        if (exchangeValue && exchangeValue.length > 0) {
          asset.exchange = exchangeValue;
        }
      }

      assets.push(asset);
    }

    // Log summary
    if (skippedRows.length > 0) {
      console.warn(
        `⚠️  Skipped ${skippedRows.length} row(s) in ${fileName}:\n` +
          skippedRows.map((s) => `  Row ${s.row}: ${s.reason} (${s.data})`).join('\n')
      );
    }

    // Log identifier extraction statistics
    const assetsWithIsin = assets.filter((a) => a.isin).length;
    const assetsWithTicker = assets.filter((a) => a.ticker_symbol).length;
    console.log(
      `✅ Extracted ${assets.length} assets from ${fileName} (skipped ${skippedRows.length} rows) | ` +
        `${assetsWithIsin} with ISIN, ${assetsWithTicker} with ticker`
    );

    if (assets.length === 0) {
      throw new AssetParsingError(
        `No valid assets found in Excel file. Skipped ${skippedRows.length} rows. Check that rows have valid asset names and values > 0.`,
        fileName
      );
    }

    return assets;
  } catch (error) {
    if (error instanceof AssetParsingError) {
      throw error;
    }

    throw new AssetParsingError(
      `Failed to parse Excel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileName,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse Excel from File object (for browser uploads)
 */
export async function parseExcelFromFile(file: File): Promise<RawAsset[]> {
  const arrayBuffer = await file.arrayBuffer();
  return parseExcel(arrayBuffer, file.name);
}

/**
 * Validate Excel structure before parsing
 * Returns true if Excel appears to have the required columns
 */
export async function validateExcelStructure(
  fileBuffer: ArrayBuffer,
  fileName: string
): Promise<{
  isValid: boolean;
  hasAssetName: boolean;
  hasValue: boolean;
  detectedColumns: string[];
  sheetNames: string[];
  error?: string;
}> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        isValid: false,
        hasAssetName: false,
        hasValue: false,
        detectedColumns: [],
        sheetNames: [],
        error: 'Excel file has no sheets',
      };
    }

    // Check first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      return {
        isValid: false,
        hasAssetName: false,
        hasValue: false,
        detectedColumns: [],
        sheetNames: workbook.SheetNames,
        error: 'First sheet is empty',
      };
    }

    // Get headers
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      header: 1,
      defval: '',
    });

    if (jsonData.length === 0) {
      return {
        isValid: false,
        hasAssetName: false,
        hasValue: false,
        detectedColumns: [],
        sheetNames: workbook.SheetNames,
        error: 'Sheet has no data',
      };
    }

    const headers = (jsonData[0] as any[]).map((h) => h?.toString() || '');

    const hasAssetName = findColumn(headers, COLUMN_MAPPINGS.asset_name) !== null;
    const hasValue = findColumn(headers, COLUMN_MAPPINGS.current_value) !== null;

    return {
      isValid: hasAssetName && hasValue,
      hasAssetName,
      hasValue,
      detectedColumns: headers,
      sheetNames: workbook.SheetNames,
      error:
        !hasAssetName && !hasValue
          ? 'Excel must have columns for asset name and value'
          : !hasAssetName
          ? 'Excel must have a column for asset name'
          : !hasValue
          ? 'Excel must have a column for current value'
          : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      hasAssetName: false,
      hasValue: false,
      detectedColumns: [],
      sheetNames: [],
      error: error instanceof Error ? error.message : 'Failed to validate Excel',
    };
  }
}

/**
 * Get all sheet names from Excel file
 * Useful for letting user select which sheet to parse
 */
export async function getExcelSheetNames(fileBuffer: ArrayBuffer): Promise<string[]> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    return workbook.SheetNames;
  } catch (error) {
    console.error('Failed to read Excel sheet names:', error);
    return [];
  }
}

/**
 * Parse specific sheet by name
 */
export async function parseExcelSheet(
  fileBuffer: ArrayBuffer,
  fileName: string,
  sheetName: string
): Promise<RawAsset[]> {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });

    if (!workbook.SheetNames.includes(sheetName)) {
      throw new AssetParsingError(`Sheet "${sheetName}" not found`, fileName);
    }

    const worksheet = workbook.Sheets[sheetName];

    if (!worksheet) {
      throw new AssetParsingError(`Sheet "${sheetName}" is empty`, fileName);
    }

    // Rest is same as parseExcel...
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
      defval: '',
      blankrows: false,
    });

    if (jsonData.length === 0) {
      throw new AssetParsingError(`Sheet "${sheetName}" has no data rows`, fileName);
    }

    const headers = Object.keys(jsonData[0]);

    const assetNameColumn = findColumn(headers, COLUMN_MAPPINGS.asset_name);
    const currentValueColumn = findColumn(headers, COLUMN_MAPPINGS.current_value);
    const quantityColumn = findColumn(headers, COLUMN_MAPPINGS.quantity);
    const purchasePriceColumn = findColumn(headers, COLUMN_MAPPINGS.purchase_price);
    const purchaseDateColumn = findColumn(headers, COLUMN_MAPPINGS.purchase_date);

    if (!assetNameColumn || !currentValueColumn) {
      throw new AssetParsingError(
        `Sheet "${sheetName}" must have columns for asset name and current value`,
        fileName
      );
    }

    const assets: RawAsset[] = [];

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];

      const assetName = row[assetNameColumn]?.toString().trim();
      const currentValue = parseNumber(row[currentValueColumn]);

      if (!assetName || currentValue === undefined || currentValue <= 0) {
        continue;
      }

      const asset: RawAsset = {
        asset_name: assetName,
        current_value: currentValue,
        source_file: `${fileName} (${sheetName})`,
      };

      if (quantityColumn) {
        asset.quantity = parseNumber(row[quantityColumn]);
      }

      if (purchasePriceColumn) {
        asset.purchase_price = parseNumber(row[purchasePriceColumn]);
      }

      if (purchaseDateColumn) {
        asset.purchase_date = parseDate(row[purchaseDateColumn]);
      }

      assets.push(asset);
    }

    if (assets.length === 0) {
      throw new AssetParsingError(
        `No valid assets found in sheet "${sheetName}"`,
        fileName
      );
    }

    return assets;
  } catch (error) {
    if (error instanceof AssetParsingError) {
      throw error;
    }

    throw new AssetParsingError(
      `Failed to parse sheet "${sheetName}": ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileName,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * AI-powered Excel parsing fallback
 * Used when standard parsing fails due to unusual file structure
 */
async function parseExcelWithAI(
  fileBuffer: ArrayBuffer,
  fileName: string,
  rawData: any[][]
): Promise<RawAsset[]> {
  try {
    // Convert raw data to text format for AI
    let excelText = '';
    for (let i = 0; i < Math.min(rawData.length, 50); i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;

      const rowText = row
        .map((cell) => (cell !== null && cell !== undefined ? cell.toString() : ''))
        .filter((cell) => cell.trim() !== '')
        .join(' | ');

      if (rowText.trim()) {
        excelText += `Row ${i + 1}: ${rowText}\n`;
      }
    }

    if (!excelText || excelText.trim().length < 20) {
      throw new Error('Excel appears to be empty or unreadable');
    }

    console.log(`📝 Sending ${excelText.length} characters to AI for parsing...`);

    // Use GPT-4o-mini to extract structured data
    const systemPrompt = `You are an expert at extracting asset information from Excel spreadsheets and financial statements.

Extract all assets from the provided Excel data. For each asset, provide:
- asset_name: The full name of the asset/security/instrument
- current_value: The current market value or amount (in rupees, as a number)
- quantity: Number of units/shares if available
- purchase_price: Purchase/cost price if available
- purchase_date: Purchase date if available (YYYY-MM-DD format)
- isin: ISIN code if available (12-character alphanumeric, e.g., INE002A01018)
- ticker_symbol: Stock ticker/scrip code if available (e.g., RELIANCE, INFY)
- exchange: Stock exchange if available (NSE, BSE, NASDAQ, etc.)

Important rules:
1. Extract ONLY assets (stocks, mutual funds, bonds, property, etc.) - NOT transactions, headers, or summaries
2. Current value must be a positive number (convert lakhs/crores to absolute rupees)
   - 1 L = 100,000
   - 1 Cr = 10,000,000
3. Skip headers, totals, and non-asset rows
4. If a single asset appears multiple times, consolidate to one entry with latest value
5. For mutual funds, use the full scheme name as asset_name
6. For stocks, use the company name (remove NSE/BSE prefixes if present)
7. Handle unusual table structures - data may not have clear column headers
8. IMPORTANT: If ISIN, ticker, or exchange codes are present, extract them - they are critical for accurate classification

Return a JSON array of assets:
[
  {
    "asset_name": "Reliance Industries Ltd",
    "current_value": 500000,
    "quantity": 1000,
    "purchase_price": 450000,
    "purchase_date": "2024-01-15",
    "isin": "INE002A01018",
    "ticker_symbol": "RELIANCE",
    "exchange": "NSE"
  },
  ...
]

If no assets found, return an empty array: []`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Extract assets from this Excel data:\n\n${excelText.slice(0, 12000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Handle different response formats
    let assetsArray: any[] = [];
    if (Array.isArray(result)) {
      assetsArray = result;
    } else if (result.assets && Array.isArray(result.assets)) {
      assetsArray = result.assets;
    } else if (result.data && Array.isArray(result.data)) {
      assetsArray = result.data;
    } else {
      throw new Error('AI returned unexpected format. Expected array of assets.');
    }

    if (assetsArray.length === 0) {
      throw new Error('AI could not find any assets in the Excel file');
    }

    // Validate and transform to RawAsset format
    const assets: RawAsset[] = [];

    for (const item of assetsArray) {
      if (!item.asset_name || !item.current_value) {
        console.warn('Skipping invalid asset from AI response:', item);
        continue;
      }

      const currentValue =
        typeof item.current_value === 'number'
          ? item.current_value
          : parseFloat(item.current_value);

      if (isNaN(currentValue) || currentValue <= 0) {
        console.warn('Skipping asset with invalid value:', item);
        continue;
      }

      const asset: RawAsset = {
        asset_name: item.asset_name.trim(),
        current_value: currentValue,
        source_file: fileName,
      };

      // Optional fields
      if (item.quantity) {
        const quantity =
          typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity);
        if (!isNaN(quantity) && quantity > 0) {
          asset.quantity = quantity;
        }
      }

      if (item.purchase_price) {
        const purchasePrice =
          typeof item.purchase_price === 'number'
            ? item.purchase_price
            : parseFloat(item.purchase_price);
        if (!isNaN(purchasePrice) && purchasePrice > 0) {
          asset.purchase_price = purchasePrice;
        }
      }

      if (item.purchase_date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(item.purchase_date)) {
          asset.purchase_date = item.purchase_date;
        }
      }

      // Financial identifiers (NEW)
      if (item.isin && typeof item.isin === 'string') {
        const isinTrimmed = item.isin.trim();
        if (isinTrimmed.length >= 10 && isinTrimmed.length <= 12) {
          asset.isin = isinTrimmed;
        }
      }

      if (item.ticker_symbol && typeof item.ticker_symbol === 'string') {
        const tickerTrimmed = item.ticker_symbol.trim();
        if (tickerTrimmed.length > 0) {
          asset.ticker_symbol = tickerTrimmed;
        }
      }

      if (item.exchange && typeof item.exchange === 'string') {
        const exchangeTrimmed = item.exchange.trim().toUpperCase();
        if (exchangeTrimmed.length > 0) {
          asset.exchange = exchangeTrimmed;
        }
      }

      assets.push(asset);
    }

    if (assets.length === 0) {
      throw new Error('AI extracted assets but none passed validation');
    }

    console.log(`✅ AI successfully parsed ${assets.length} assets from Excel`);
    return assets;
  } catch (error) {
    console.error('AI Excel parsing failed:', error);
    throw new Error(
      `AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
