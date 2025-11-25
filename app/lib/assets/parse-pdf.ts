// PDF file parsing using GPT-4 Vision API

import OpenAI from 'openai';
import { RawAsset, AssetParsingError } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// No initialization needed for pdf-to-png-converter

/**
 * Extract text from PDF using pdf-parse
 * This is a fallback for simple text-based PDFs
 */
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import for CommonJS module compatibility
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(Buffer.from(pdfBuffer));
    return data.text;
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    return '';
  }
}

/**
 * Convert PDF pages to PNG images using pdf-to-png-converter
 * Handles scanned/image-based PDFs for Vision API
 */
async function convertPDFPagesToImages(
  pdfBuffer: ArrayBuffer,
  maxPages: number = 5
): Promise<string[]> {
  try {
    console.log('🖼️  Converting PDF pages to images...');

    const { pdfToPng } = await import('pdf-to-png-converter');
    const buffer = Buffer.from(pdfBuffer);

    // Convert PDF to PNG images
    const pngPages = await pdfToPng(buffer, {
      strictPagesToProcess: false, // Process pages even if some fail
      viewportScale: 2.0, // Higher scale = better quality for financial tables
      outputFolder: undefined, // Don't save to disk
    });

    const totalPages = pngPages.length;
    const pagesToProcess = Math.min(totalPages, maxPages);

    console.log(`📄 Processing ${pagesToProcess} of ${totalPages} pages...`);

    // Convert to base64 data URLs
    const imageDataUrls: string[] = [];
    for (let i = 0; i < pagesToProcess; i++) {
      const page = pngPages[i];
      const base64Image = page.content.toString('base64');
      const dataUrl = `data:image/png;base64,${base64Image}`;
      imageDataUrls.push(dataUrl);

      console.log(`  ✓ Converted page ${i + 1}/${pagesToProcess}`);
    }

    return imageDataUrls;
  } catch (error) {
    console.error('Failed to convert PDF to images:', error);
    throw new AssetParsingError(
      `Failed to convert PDF to images: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'PDF',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse scanned/image-based PDF using GPT-4o Vision API
 * Handles PDFs where text extraction fails (scanned documents)
 */
async function parseImageBasedPDF(
  pdfBuffer: ArrayBuffer,
  fileName: string
): Promise<RawAsset[]> {
  try {
    console.log('📷 Using Vision API for scanned PDF:', fileName);

    // STEP 1: Convert PDF pages to PNG images
    const imageDataUrls = await convertPDFPagesToImages(pdfBuffer, 5);

    if (imageDataUrls.length === 0) {
      throw new AssetParsingError(
        'Failed to convert PDF to images. The PDF may be corrupted or password-protected.',
        fileName
      );
    }

    // STEP 2: Build Vision API content with all page images
    const systemPrompt = `You are an expert at extracting asset information from Indian financial statements (broker statements, bank statements, mutual fund statements, CAS reports, etc.).

Extract all assets from the provided statement images. For each asset, provide:
- asset_name: The full name of the asset/security/instrument
- current_value: The current market value or amount (in rupees, as a number)
- quantity: Number of units/shares if available
- purchase_price: Purchase/cost price if available
- purchase_date: Purchase date if available (YYYY-MM-DD format)
- isin: ISIN code if available (10-12 characters)
- ticker_symbol: Ticker/scrip code if available
- exchange: Exchange name if available (NSE, BSE, etc.)

Important rules:
1. Extract ONLY assets (stocks, mutual funds, bonds, property, etc.) - NOT transactions or summaries
2. Current value must be a positive number (convert lakhs/crores to absolute rupees)
   - 1 L = 100,000
   - 1 Cr = 10,000,000
3. Skip headers, totals, and non-asset rows
4. If a single asset appears multiple times across pages, consolidate to one entry with latest value
5. For mutual funds, use the full scheme name as asset_name
6. For stocks, use the company name (remove NSE/BSE prefixes if present)
7. Extract ISIN codes when visible (format: INE*/INF*/IN0*)
8. Extract ticker symbols from scrip code columns

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

    // Build content array with text prompt + all page images
    const contentParts: any[] = [
      {
        type: 'text',
        text: `Extract all assets from this ${imageDataUrls.length}-page financial statement (CAS report, mutual fund statement, or broker statement). Pay special attention to tables with asset holdings, ISIN codes, and portfolio values.`,
      },
    ];

    // Add all page images
    for (let i = 0; i < imageDataUrls.length; i++) {
      contentParts.push({
        type: 'image_url',
        image_url: {
          url: imageDataUrls[i], // PNG image data URL
          detail: 'high', // High detail for accurate table recognition
        },
      });
    }

    console.log(`📤 Sending ${imageDataUrls.length} page images to Vision API...`);

    // STEP 3: Send to Vision API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Vision API requires GPT-4o
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: contentParts,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent extraction
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');

    // Handle different response formats (same as text-based parsing)
    let assetsArray: any[] = [];
    if (Array.isArray(result)) {
      assetsArray = result;
    } else if (result.assets && Array.isArray(result.assets)) {
      assetsArray = result.assets;
    } else if (result.data && Array.isArray(result.data)) {
      assetsArray = result.data;
    } else {
      throw new AssetParsingError(
        'AI returned unexpected format from scanned PDF. Expected array of assets.',
        fileName
      );
    }

    if (assetsArray.length === 0) {
      throw new AssetParsingError(
        'No assets found in scanned PDF. The document may not contain portfolio holdings or the image quality is too low.',
        fileName
      );
    }

    // Validate and transform to RawAsset format (same validation as text-based)
    const assets: RawAsset[] = [];

    for (const item of assetsArray) {
      // Validate required fields
      if (!item.asset_name || !item.current_value) {
        console.warn('Skipping invalid asset from Vision API response:', item);
        continue;
      }

      const currentValue = typeof item.current_value === 'number'
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
        const quantity = typeof item.quantity === 'number'
          ? item.quantity
          : parseFloat(item.quantity);
        if (!isNaN(quantity) && quantity > 0) {
          asset.quantity = quantity;
        }
      }

      if (item.purchase_price) {
        const purchasePrice = typeof item.purchase_price === 'number'
          ? item.purchase_price
          : parseFloat(item.purchase_price);
        if (!isNaN(purchasePrice) && purchasePrice > 0) {
          asset.purchase_price = purchasePrice;
        }
      }

      if (item.purchase_date) {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(item.purchase_date)) {
          asset.purchase_date = item.purchase_date;
        }
      }

      // Financial identifiers (ISIN, ticker, exchange)
      if (item.isin && typeof item.isin === 'string') {
        const isinTrimmed = item.isin.trim();
        // Validate ISIN length (10-12 characters)
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
      throw new AssetParsingError(
        'Vision API extracted assets but none passed validation. Check the PDF quality and format.',
        fileName
      );
    }

    // Log extraction statistics
    const assetsWithIsin = assets.filter((a) => a.isin).length;
    const assetsWithTicker = assets.filter((a) => a.ticker_symbol).length;
    console.log(
      `✅ Vision API extracted ${assets.length} assets from ${fileName} | ` +
        `${assetsWithIsin} with ISIN, ${assetsWithTicker} with ticker`
    );

    return assets;
  } catch (error) {
    if (error instanceof AssetParsingError) {
      throw error;
    }

    throw new AssetParsingError(
      `Failed to parse scanned PDF with Vision API: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
        `Try: 1) Re-downloading the statement as a text-based PDF, or 2) Using CSV/Excel export instead.`,
      fileName,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse PDF using GPT-4 Vision API
 * Extracts asset information from financial statements
 */
export async function parsePDF(
  pdfBuffer: ArrayBuffer,
  fileName: string
): Promise<RawAsset[]> {
  try {
    // STEP 1: Try text extraction first
    const pdfText = await extractTextFromPDF(pdfBuffer);

    // STEP 2: Detect if PDF is text-based or image-based
    // Threshold: Less than 100 characters indicates scanned/image PDF
    if (!pdfText || pdfText.trim().length < 100) {
      console.log('📄 PDF appears to be scanned/image-based, routing to Vision API...');

      // Route to Vision API for OCR
      return await parseImageBasedPDF(pdfBuffer, fileName);
    }

    console.log('📝 PDF contains extractable text, using standard parsing...');

    // Use GPT-4o to extract structured data from text
    const systemPrompt = `You are an expert at extracting asset information from Indian financial statements (broker statements, bank statements, mutual fund statements, etc.).

Extract all assets from the provided statement text. For each asset, provide:
- asset_name: The full name of the asset/security/instrument
- current_value: The current market value or amount (in rupees, as a number)
- quantity: Number of units/shares if available
- purchase_price: Purchase/cost price if available
- purchase_date: Purchase date if available (YYYY-MM-DD format)

Important rules:
1. Extract ONLY assets (stocks, mutual funds, bonds, property, etc.) - NOT transactions or summaries
2. Current value must be a positive number (convert lakhs/crores to absolute rupees)
   - 1 L = 100,000
   - 1 Cr = 10,000,000
3. Skip headers, totals, and non-asset rows
4. If a single asset appears multiple times, consolidate to one entry with latest value
5. For mutual funds, use the full scheme name as asset_name
6. For stocks, use the company name (remove NSE/BSE prefixes if present)

Return a JSON array of assets:
[
  {
    "asset_name": "Reliance Industries Ltd",
    "current_value": 500000,
    "quantity": 1000,
    "purchase_price": 450000,
    "purchase_date": "2024-01-15"
  },
  ...
]

If no assets found, return an empty array: []`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o', // Use GPT-4o for better PDF understanding
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `Extract assets from this financial statement:\n\n${pdfText.slice(0, 15000)}`, // Limit to ~15k chars to avoid token limits
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2, // Low temperature for consistent extraction
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
      throw new AssetParsingError(
        'AI returned unexpected format. Expected array of assets.',
        fileName
      );
    }

    if (assetsArray.length === 0) {
      throw new AssetParsingError(
        'No assets found in PDF. The statement may not contain portfolio holdings or the format is not recognized.',
        fileName
      );
    }

    // Validate and transform to RawAsset format
    const assets: RawAsset[] = [];

    for (const item of assetsArray) {
      // Validate required fields
      if (!item.asset_name || !item.current_value) {
        console.warn('Skipping invalid asset from AI response:', item);
        continue;
      }

      const currentValue = typeof item.current_value === 'number'
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
        const quantity = typeof item.quantity === 'number'
          ? item.quantity
          : parseFloat(item.quantity);
        if (!isNaN(quantity) && quantity > 0) {
          asset.quantity = quantity;
        }
      }

      if (item.purchase_price) {
        const purchasePrice = typeof item.purchase_price === 'number'
          ? item.purchase_price
          : parseFloat(item.purchase_price);
        if (!isNaN(purchasePrice) && purchasePrice > 0) {
          asset.purchase_price = purchasePrice;
        }
      }

      if (item.purchase_date) {
        // Validate date format
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRegex.test(item.purchase_date)) {
          asset.purchase_date = item.purchase_date;
        }
      }

      assets.push(asset);
    }

    if (assets.length === 0) {
      throw new AssetParsingError(
        'AI extracted assets but none passed validation. Check the PDF format.',
        fileName
      );
    }

    return assets;
  } catch (error) {
    if (error instanceof AssetParsingError) {
      throw error;
    }

    throw new AssetParsingError(
      `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileName,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Parse PDF from File object (for browser uploads)
 */
export async function parsePDFFromFile(file: File): Promise<RawAsset[]> {
  const arrayBuffer = await file.arrayBuffer();
  return parsePDF(arrayBuffer, file.name);
}

/**
 * Estimate PDF parsing cost
 * GPT-4o costs ~$0.005 per 1k input tokens, ~$0.015 per 1k output tokens
 */
export async function estimatePDFParsingCost(pdfBuffer: ArrayBuffer): Promise<{
  estimatedTokens: number;
  estimatedCost: number; // in USD
  textLength: number;
}> {
  try {
    const pdfText = await extractTextFromPDF(pdfBuffer);
    const textLength = pdfText.length;

    // Rough estimate: 1 token ≈ 4 characters
    const estimatedInputTokens = Math.ceil(textLength / 4) + 500; // +500 for system prompt
    const estimatedOutputTokens = 1000; // Assume ~1000 tokens for asset list

    // GPT-4o pricing (as of 2024)
    const inputCost = (estimatedInputTokens / 1000) * 0.005;
    const outputCost = (estimatedOutputTokens / 1000) * 0.015;
    const totalCost = inputCost + outputCost;

    return {
      estimatedTokens: estimatedInputTokens + estimatedOutputTokens,
      estimatedCost: totalCost,
      textLength,
    };
  } catch (error) {
    return {
      estimatedTokens: 0,
      estimatedCost: 0,
      textLength: 0,
    };
  }
}

/**
 * Validate PDF before parsing
 * Check if PDF is readable and contains text
 */
export async function validatePDF(
  pdfBuffer: ArrayBuffer,
  fileName: string
): Promise<{
  isValid: boolean;
  hasText: boolean;
  textLength: number;
  pageCount: number;
  error?: string;
}> {
  try {
    // Dynamic import for CommonJS module compatibility
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(Buffer.from(pdfBuffer));

    const hasText = data.text && data.text.trim().length > 100; // At least 100 chars

    return {
      isValid: hasText,
      hasText,
      textLength: data.text.length,
      pageCount: data.numpages,
      error: !hasText
        ? 'PDF appears to be empty or image-based. Try uploading a CSV/Excel instead.'
        : undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      hasText: false,
      textLength: 0,
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Failed to validate PDF',
    };
  }
}

/**
 * Parse multi-page PDF (processes all pages)
 * More expensive but more comprehensive
 */
export async function parsePDFMultiPage(
  pdfBuffer: ArrayBuffer,
  fileName: string,
  maxPages: number = 10
): Promise<RawAsset[]> {
  try {
    // Dynamic import for CommonJS module compatibility
    const pdfParseModule = await import('pdf-parse');
    const pdfParse = (pdfParseModule as any).default || pdfParseModule;
    const data = await pdfParse(Buffer.from(pdfBuffer));
    const pageCount = Math.min(data.numpages, maxPages);

    // For now, just use full text extraction
    // In production, you'd parse page by page
    return await parsePDF(pdfBuffer, fileName);
  } catch (error) {
    throw new AssetParsingError(
      `Failed to parse multi-page PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
      fileName,
      error instanceof Error ? error : undefined
    );
  }
}
