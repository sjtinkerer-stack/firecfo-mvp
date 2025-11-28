// Types for cross-upload conflict resolution workflow

import type { TempAsset } from '@/app/lib/assets/temp-storage-types';

/**
 * A conflict between a new asset and an existing saved asset
 */
export interface AssetConflict {
  id: string; // Unique identifier for this conflict
  newAsset: TempAsset; // Asset from current upload
  existingAsset: ExistingAssetSummary; // Asset from previous snapshot
  recommendation: ConflictRecommendation;
}

/**
 * Summary of existing saved asset (from snapshot)
 * Not full asset data - just enough for conflict resolution
 */
export interface ExistingAssetSummary {
  id: string;
  asset_name: string;
  current_value: number;
  asset_class: string;
  asset_subclass?: string;
  source_snapshot_name: string;
  source_file?: string;
  last_updated?: string;
}

/**
 * System recommendation for how to handle a conflict
 */
export type ConflictRecommendation =
  | 'replace_old' // New asset is clearly better/newer
  | 'merge_values' // Same asset, different values → sum
  | 'keep_both' // Likely different assets despite similarity
  | 'skip_new'; // Existing asset is sufficient

/**
 * User's decision for a conflict
 */
export type ConflictResolutionAction =
  | 'replace_old' // Update existing asset with new data
  | 'merge_values' // Sum values, keep best attributes
  | 'keep_both' // Mark as distinct, save both
  | 'skip_new'; // Discard new asset, keep existing unchanged

/**
 * Decision record for a specific conflict
 */
export interface ConflictDecision {
  conflictId: string;
  action: ConflictResolutionAction;
  newAssetId: string; // ID of new asset in temp storage
  existingAssetId: string; // ID of existing asset in snapshot
  mergedAttributes?: Partial<TempAsset>; // For merge action
}

/**
 * Helper to determine recommendation based on conflict characteristics
 */
export function getConflictRecommendation(
  newAsset: TempAsset,
  existingAsset: ExistingAssetSummary
): ConflictRecommendation {
  const valueDiff = Math.abs(newAsset.current_value - existingAsset.current_value);
  const avgValue = (newAsset.current_value + existingAsset.current_value) / 2;
  const valueDiffPercentage = (valueDiff / avgValue) * 100;

  // If names are very different, might be false positive → keep both
  const nameSimilarity = calculateNameSimilarity(newAsset.asset_name, existingAsset.asset_name);
  if (nameSimilarity < 70) {
    return 'keep_both';
  }

  // If values are within 10%, likely same asset → merge
  if (valueDiffPercentage <= 10) {
    return 'merge_values';
  }

  // If values differ by 20-50%, likely different time periods → replace
  if (valueDiffPercentage > 20 && valueDiffPercentage <= 50) {
    return 'replace_old';
  }

  // If values differ significantly (>50%), likely different assets → keep both
  if (valueDiffPercentage > 50) {
    return 'keep_both';
  }

  // Default: merge
  return 'merge_values';
}

/**
 * Simple name similarity calculation (placeholder)
 * Returns 0-100 score
 */
function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const norm2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

  if (norm1 === norm2) return 100;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 80;

  // Simple token overlap
  const tokens1 = new Set(norm1.split(/\s+/));
  const tokens2 = new Set(norm2.split(/\s+/));
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);

  return (intersection.size / union.size) * 100;
}

/**
 * Group conflicts by similarity
 * Currently just returns individual conflicts, but could group related conflicts
 */
export function groupConflicts(
  newAssets: TempAsset[],
  existingAssets: ExistingAssetSummary[]
): AssetConflict[] {
  const conflicts: AssetConflict[] = [];

  newAssets.forEach((newAsset) => {
    // Check if this asset has cross-upload duplicate matches
    if (!newAsset.is_duplicate || !newAsset.duplicate_matches) return;

    newAsset.duplicate_matches.forEach((match) => {
      // Try to find the existing asset in our summary list
      const existingAsset = existingAssets.find(
        (e) =>
          e.asset_name === match.existing_asset_name &&
          Math.abs(e.current_value - match.existing_value) < 1
      );

      if (existingAsset) {
        conflicts.push({
          id: `conflict-${newAsset.id}-${existingAsset.id}`,
          newAsset,
          existingAsset,
          recommendation: getConflictRecommendation(newAsset, existingAsset),
        });
      }
    });
  });

  return conflicts;
}
