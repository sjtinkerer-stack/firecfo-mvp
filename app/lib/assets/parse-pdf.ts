// PDF file parsing using GPT-4 Vision API

import OpenAI from 'openai';
import { RawAsset, AssetParsingError } from './types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Extract text from PDF using pdf-parse
 * This is a fallback for simple text-based PDFs
 */
async function extractTextFromPDF(pdfBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import for CommonJS module compatibility
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(Buffer.from(pdfBuffer));
    return data.text;
  } catch (error) {
    console.error('Failed to extract text from PDF:', error);
    return '';
  }
}

/**
 * Convert PDF buffer to base64 image (first page only for now)
 * In production, you'd use a library like pdf-to-png or pdf.js
 * For now, we'll use text extraction + AI
 */
async function convertPDFToImage(pdfBuffer: ArrayBuffer): Promise<string | null> {
  // TODO: Implement PDF to image conversion
  // For MVP, we'll use text extraction only
  // In production, use libraries like:
  // - pdf-to-png
  // - pdf.js
  // - canvas
  return null;
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
    // Extract text from PDF
    const pdfText = await extractTextFromPDF(pdfBuffer);

    if (!pdfText || pdfText.trim().length === 0) {
      throw new AssetParsingError('PDF appears to be empty or image-based', fileName);
    }

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
    const pdfParse = (await import('pdf-parse')).default;
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
    const pdfParse = (await import('pdf-parse')).default;
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
