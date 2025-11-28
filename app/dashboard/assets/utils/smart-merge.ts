// Smart merge utility for combining duplicate/conflict assets
// Uses field-by-field rules to preserve best data from all sources

import type { TempAsset } from '@/app/lib/assets/temp-storage-types';

/**
 * Smart merge strategy: Combines multiple assets using intelligent field-by-field rules
 *
 * Rules:
 * - Financial values: SUM
 * - Text fields: Prefer longest/most complete
 * - Classifications: From highest confidence asset
 * - Identifiers: Prefer populated
 * - Historical data: Keep earliest
 * - Source files: Combine (comma-separated)
 */
export function smartMergeAssets(assets: TempAsset[]): Partial<TempAsset> {
  if (assets.length === 0) {
    throw new Error('Cannot merge empty asset list');
  }

  if (assets.length === 1) {
    return { ...assets[0] };
  }

  // Find asset with highest AI confidence to use as base
  const baseAsset = getHighestConfidenceAsset(assets);

  // Sum all financial values
  const totalValue = assets.reduce((sum, asset) => sum + asset.current_value, 0);
  const totalQuantity = assets.reduce((sum, asset) => sum + (asset.quantity || 0), 0);

  // Get longest asset name (more complete is better)
  const longestName = assets.reduce((longest, asset) =>
    asset.asset_name.length > longest.asset_name.length ? asset : longest
  ).asset_name;

  // Combine source files (track all origins)
  const uniqueSourceFiles = new Set(
    assets
      .map(a => a.source_file)
      .filter((s): s is string => s !== undefined && s !== null && s !== '')
  );
  const combinedSource = Array.from(uniqueSourceFiles).join(', ');

  // Combine notes (preserve all context)
  const uniqueNotes = assets
    .map(a => a.notes)
    .filter((n): n is string => n !== undefined && n !== null && n.trim() !== '');
  const combinedNotes = uniqueNotes.length > 0 ? uniqueNotes.join(' | ') : undefined;

  // Get earliest purchase date (historical data)
  const earliestPurchaseDate = assets
    .map(a => a.purchase_date)
    .filter((d): d is string => d !== undefined && d !== null)
    .sort()[0]; // ISO dates sort correctly

  // Get first populated identifier fields
  const isin = assets.find(a => a.isin)?.isin;
  const tickerSymbol = assets.find(a => a.ticker_symbol)?.ticker_symbol;
  const exchange = assets.find(a => a.exchange)?.exchange;

  // Use max confidence score (merging multiple extractions increases confidence)
  const maxConfidence = Math.max(...assets.map(a => a.ai_confidence_score || 0));

  return {
    // Summed values
    current_value: totalValue,
    quantity: totalQuantity > 0 ? totalQuantity : undefined,

    // Best text representation
    asset_name: longestName,

    // Classifications from highest confidence asset
    asset_class: baseAsset.asset_class,
    asset_subclass: baseAsset.asset_subclass,
    risk_level: baseAsset.risk_level,
    expected_return_percentage: baseAsset.expected_return_percentage,
    security_type: baseAsset.security_type,
    verified_via: baseAsset.verified_via,

    // Updated confidence
    ai_confidence_score: maxConfidence,

    // Identifiers (prefer populated)
    isin,
    ticker_symbol: tickerSymbol,
    exchange,

    // Historical data (preserve earliest)
    purchase_date: earliestPurchaseDate,
    purchase_price: assets.find(a => a.purchase_price)?.purchase_price,

    // Combined metadata
    source_file: combinedSource,
    notes: combinedNotes,

    // Clear duplicate flags
    is_duplicate: false,
    duplicate_matches: [],
    is_selected: true,
  };
}

/**
 * Find the asset with the highest AI confidence score
 * This asset's classifications are considered most accurate
 */
function getHighestConfidenceAsset(assets: TempAsset[]): TempAsset {
  return assets.reduce((best, current) => {
    const bestScore = best.ai_confidence_score || 0;
    const currentScore = current.ai_confidence_score || 0;
    return currentScore > bestScore ? current : best;
  });
}

/**
 * Merge a new asset with an existing saved asset (cross-upload conflict)
 * Returns merged attributes optimized for updating existing asset
 */
export function mergeWithExistingAsset(
  existing: TempAsset,
  newAsset: TempAsset
): Partial<TempAsset> {
  // Use same smart merge logic
  const merged = smartMergeAssets([existing, newAsset]);

  // For cross-upload conflicts, we want to track that this was updated
  return {
    ...merged,
    notes: merged.notes
      ? `${merged.notes} | Updated from ${newAsset.source_file}`
      : `Updated from ${newAsset.source_file}`,
  };
}
