// AI-powered asset classification using OpenAI GPT-4o-mini
// With API-based lookup for ISIN/ticker codes

import OpenAI from 'openai';
import {
  AssetClassificationError,
  ClassificationResult,
  RawAsset,
  ClassifiedAsset,
  SubClassMapping,
} from './types';
import { lookupSecurity } from './lookup-security';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Classify a single asset using hybrid approach:
 * 1. Try API lookup if ISIN/ticker exists (90-95% accuracy)
 * 2. Fall back to AI classification if no identifier or API fails (60-70% accuracy)
 */
export async function classifyAsset(
  asset: RawAsset,
  subclassMappings: SubClassMapping[]
): Promise<ClassifiedAsset> {
  try {
    // STEP 1: Try API lookup if financial identifiers exist
    if (asset.isin || asset.ticker_symbol) {
      try {
        const lookupResult = await lookupSecurity(asset.isin, asset.ticker_symbol, asset.exchange);

        if (lookupResult.found) {
          console.log(
            `✓ API verified: ${asset.asset_name} → ${lookupResult.asset_subclass} (${(lookupResult.confidence * 100).toFixed(0)}% confidence)`
          );

          // Find the matching mapping to get risk/return details
          const mapping = subclassMappings.find(
            (m) =>
              m.asset_class === lookupResult.asset_class &&
              m.subclass_code === lookupResult.asset_subclass
          );

          if (mapping) {
            return {
              ...asset,
              asset_class: lookupResult.asset_class,
              asset_subclass: lookupResult.asset_subclass,
              risk_level: mapping.risk_level,
              expected_return_percentage: mapping.expected_return_midpoint,
              ai_confidence_score: lookupResult.confidence,
              security_type: lookupResult.security_type,
              verified_via: 'api_lookup',
            };
          }
        }
      } catch (apiError) {
        console.warn(`API lookup failed for ${asset.asset_name}, falling back to AI:`, apiError);
      }
    }

    // STEP 2: Fall back to AI classification
    // Build the sub-class options for the AI
    const subclassOptions = subclassMappings
      .map((m) => ({
        class: m.asset_class,
        subclass: m.subclass_code,
        display_name: m.subclass_display_name,
        keywords: m.keyword_patterns,
        risk: m.risk_level,
        return: m.expected_return_midpoint,
      }));

    // Build context with financial identifiers if available
    const identifierContext = [];
    if (asset.isin) {
      identifierContext.push(`ISIN: ${asset.isin}`);
      // ISIN prefix hints
      if (asset.isin.startsWith('INE')) {
        identifierContext.push('(INE prefix indicates equity security)');
      } else if (asset.isin.startsWith('INF')) {
        identifierContext.push('(INF prefix indicates mutual fund)');
      } else if (asset.isin.startsWith('IN0') || asset.isin.startsWith('IN9')) {
        identifierContext.push('(IN0/IN9 prefix indicates government/corporate bond)');
      }
    }
    if (asset.ticker_symbol) {
      identifierContext.push(`Ticker: ${asset.ticker_symbol}`);
    }
    if (asset.exchange) {
      identifierContext.push(`Exchange: ${asset.exchange}`);
    }

    const systemPrompt = `You are an expert at classifying Indian financial assets.

Given an asset name ${identifierContext.length > 0 ? 'and financial identifiers' : ''}, classify it into the correct asset_class and asset_subclass based on these options:

${JSON.stringify(subclassOptions, null, 2)}

Rules:
1. Match the asset name to the most appropriate subclass based on keywords
2. If the asset name contains multiple matching keywords, choose the most specific subclass
3. Asset class should be one of: equity, debt, cash, real_estate, other
4. Provide a confidence score between 0 and 1 (1 = very confident, 0.5 = uncertain)
5. If confidence is below 0.7, set it to the actual confidence but flag it for manual review
${identifierContext.length > 0 ? '6. Use the provided ISIN/ticker to improve classification accuracy - ISIN prefixes are strong indicators of asset type' : ''}

Return JSON in this exact format:
{
  "asset_class": "equity",
  "asset_subclass": "direct_stocks",
  "confidence": 0.95,
  "reasoning": "Asset name contains 'Ltd' which indicates a company stock"
}`;

    const userPrompt = identifierContext.length > 0
      ? `Classify this asset:\nName: "${asset.asset_name}"\n${identifierContext.join('\n')}`
      : `Classify this asset: "${asset.asset_name}"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Low temperature for consistent classifications
    });

    const result = JSON.parse(
      response.choices[0].message.content || '{}'
    ) as ClassificationResult;

    // Validate the result
    if (!result.asset_class || !result.asset_subclass || result.confidence === undefined) {
      throw new AssetClassificationError(
        'AI returned incomplete classification',
        asset.asset_name
      );
    }

    // Find the matching sub-class mapping to get risk level and expected return
    const mapping = subclassMappings.find(
      (m) =>
        m.asset_class === result.asset_class &&
        m.subclass_code === result.asset_subclass
    );

    if (!mapping) {
      throw new AssetClassificationError(
        `Invalid subclass returned by AI: ${result.asset_subclass}`,
        asset.asset_name
      );
    }

    // Build the classified asset
    const classifiedAsset: ClassifiedAsset = {
      ...asset,
      asset_class: result.asset_class,
      asset_subclass: result.asset_subclass,
      risk_level: mapping.risk_level,
      expected_return_percentage: mapping.expected_return_midpoint,
      ai_confidence_score: result.confidence,
      verified_via: 'ai_classification',
    };

    return classifiedAsset;
  } catch (error) {
    console.error('Error classifying asset:', error);
    throw new AssetClassificationError(
      error instanceof Error ? error.message : 'Unknown error during classification',
      asset.asset_name,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Classify multiple assets in batch
 * Uses concurrent requests with rate limiting
 */
export async function classifyAssetsBatch(
  assets: RawAsset[],
  subclassMappings: SubClassMapping[],
  options: {
    maxConcurrent?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<ClassifiedAsset[]> {
  const { maxConcurrent = 5, onProgress } = options;

  const classifiedAssets: ClassifiedAsset[] = [];
  const errors: { asset: RawAsset; error: Error }[] = [];

  // Process in batches
  for (let i = 0; i < assets.length; i += maxConcurrent) {
    const batch = assets.slice(i, i + maxConcurrent);

    const results = await Promise.allSettled(
      batch.map((asset) => classifyAsset(asset, subclassMappings))
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        classifiedAssets.push(result.value);
      } else {
        errors.push({
          asset: batch[index],
          error: result.reason,
        });
      }
    });

    if (onProgress) {
      onProgress(classifiedAssets.length, assets.length);
    }
  }

  // Log errors but don't fail the entire batch
  if (errors.length > 0) {
    console.warn(
      `Failed to classify ${errors.length} assets:`,
      errors.map((e) => e.asset.asset_name)
    );
  }

  return classifiedAssets;
}

/**
 * Rule-based classification fallback (when AI fails or for speed)
 * Uses keyword matching from sub-class mappings
 */
export function classifyAssetRuleBased(
  asset: RawAsset,
  subclassMappings: SubClassMapping[]
): ClassifiedAsset {
  const assetNameLower = asset.asset_name.toLowerCase();

  // Find best match based on keyword patterns
  let bestMatch: SubClassMapping | null = null;
  let maxMatchCount = 0;

  for (const mapping of subclassMappings) {
    const matchCount = mapping.keyword_patterns.filter((keyword) =>
      assetNameLower.includes(keyword.toLowerCase())
    ).length;

    if (matchCount > maxMatchCount) {
      maxMatchCount = matchCount;
      bestMatch = mapping;
    }
  }

  // If no match found, default to "other_assets" sub-class
  if (!bestMatch) {
    const otherMapping = subclassMappings.find(
      (m) => m.subclass_code === 'other_assets'
    );
    if (!otherMapping) {
      throw new AssetClassificationError(
        'Could not find default "other_assets" subclass',
        asset.asset_name
      );
    }
    bestMatch = otherMapping;
    maxMatchCount = 0;
  }

  // Calculate confidence based on match count
  const confidence = maxMatchCount > 0 ? Math.min(0.6 + maxMatchCount * 0.1, 0.95) : 0.3;

  return {
    ...asset,
    asset_class: bestMatch.asset_class,
    asset_subclass: bestMatch.subclass_code,
    risk_level: bestMatch.risk_level,
    expected_return_percentage: bestMatch.expected_return_midpoint,
    ai_confidence_score: confidence,
  };
}

/**
 * Hybrid classification: Try rule-based first, use AI for low confidence matches
 */
export async function classifyAssetHybrid(
  asset: RawAsset,
  subclassMappings: SubClassMapping[],
  confidenceThreshold: number = 0.7
): Promise<ClassifiedAsset> {
  // Try rule-based first (fast and free)
  const ruleBasedResult = classifyAssetRuleBased(asset, subclassMappings);

  // If confidence is high enough, use rule-based result
  if (ruleBasedResult.ai_confidence_score >= confidenceThreshold) {
    return ruleBasedResult;
  }

  // Otherwise, use AI for better accuracy
  try {
    return await classifyAsset(asset, subclassMappings);
  } catch (error) {
    console.warn('AI classification failed, falling back to rule-based:', error);
    return ruleBasedResult;
  }
}
